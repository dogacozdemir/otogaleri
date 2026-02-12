import { dbPool } from "../config/database";
import { getOrFetchRate } from "./fxCacheService";
import { SupportedCurrency } from "./currencyService";
import { MoneyService } from "./moneyService";
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";
import { StorageService } from "./storage/storageService";

export interface Vehicle {
  id: number;
  tenant_id: number;
  vehicle_number: number | null;
  branch_id: number | null;
  maker: string | null;
  model: string | null;
  production_year: number | null;
  arrival_date: string | null;
  purchase_amount: number | null;
  purchase_currency: string;
  purchase_fx_rate_to_base: number;
  purchase_date: string | null;
  sale_price: number | null;
  sale_currency: string;
  status: string;
  stock_status: string;
  location: string | null;
  engine_no: string | null;
  target_profit: number | null;
  features: any;
  is_sold: boolean;
  created_at: string;
  branch_name?: string;
  total_costs?: number;
  cost_count?: number;
  primary_image_url?: string | null;
  installment?: any;
}

export interface VehicleListParams {
  page: number;
  limit: number;
  offset: number;
  search?: string;
  is_sold?: string;
  status?: string;
  stock_status?: string;
  branch_id?: string;
}

export interface PaginatedVehicleResponse {
  vehicles: Vehicle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateVehicleParams {
  vehicle_number?: number | null;
  branch_id?: number | null;
  maker?: string | null;
  model?: string | null;
  production_year?: number | null;
  arrival_date?: string | null;
  purchase_amount?: number | null;
  purchase_currency?: string;
  purchase_date?: string | null;
  sale_price?: number | null;
  sale_currency?: string;
  status?: string;
  stock_status?: string;
  location?: string | null;
  engine_no?: string | null;
  target_profit?: number | null;
  features?: any;
}

export interface UpdateVehicleParams extends Partial<CreateVehicleParams> {
  id: number;
}

export interface VehicleDetail extends Vehicle {
  costs: any[];
  sales: any | null;
  installment: any | null;
}

/**
 * VehicleService - Handles all vehicle business logic
 * All methods require tenantId for multi-tenancy safety
 */
export class VehicleService {
  /**
   * Get tenant's base currency
   */
  private static async getBaseCurrency(tenantQuery: TenantAwareQuery): Promise<string> {
    // Note: tenants table is not tenant-aware, so we use executeRaw with requiredTenantId=false
    const tenantId = tenantQuery.getTenantId();
    const [tenantRows] = await tenantQuery.executeRaw(
      "SELECT default_currency FROM tenants WHERE id = ?",
      [tenantId],
      false // tenants table is not tenant-aware
    );
    return (tenantRows as any[])[0]?.default_currency || "TRY";
  }

  /**
   * Get list of vehicles with pagination and filters
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async listVehicles(
    tenantQuery: TenantAwareQuery,
    params: VehicleListParams
  ): Promise<PaginatedVehicleResponse> {
    let query = `
      SELECT 
        v.*, 
        b.name as branch_name,
        COALESCE(cost_summary.total_costs, 0) as total_costs,
        COALESCE(cost_summary.cost_count, 0) as cost_count,
        primary_img.image_path as primary_image_path,
        vis_latest.id as installment_sale_id,
        vis_latest.total_amount as installment_total_amount,
        vis_latest.down_payment as installment_down_payment,
        vis_latest.installment_count as installment_installment_count,
        vis_latest.installment_amount as installment_installment_amount,
        vis_latest.currency as installment_currency,
        vis_latest.status as installment_status,
        vis_latest.fx_rate_to_base as installment_fx_rate_to_base,
        vis_latest.sale_date as installment_sale_date,
        COALESCE(vis_latest.total_paid, 0) as installment_total_paid,
        COALESCE(vis_latest.remaining_balance, 0) as installment_remaining_balance
      FROM vehicles v
      LEFT JOIN branches b ON v.branch_id = b.id
      LEFT JOIN (
        SELECT 
          vehicle_id,
          SUM(amount * fx_rate_to_base) as total_costs,
          COUNT(*) as cost_count
        FROM vehicle_costs
        GROUP BY vehicle_id
      ) cost_summary ON cost_summary.vehicle_id = v.id
      LEFT JOIN (
        SELECT 
          vi.vehicle_id,
          vi.image_path,
          ROW_NUMBER() OVER (
            PARTITION BY vi.vehicle_id 
            ORDER BY vi.is_primary DESC, vi.display_order ASC, vi.created_at ASC
          ) as rn
        FROM vehicle_images vi
        WHERE vi.tenant_id = ?
      ) primary_img ON primary_img.vehicle_id = v.id AND primary_img.rn = 1
      LEFT JOIN (
        SELECT 
          vis.id,
          vis.vehicle_id,
          vis.total_amount,
          vis.down_payment,
          vis.installment_count,
          vis.installment_amount,
          vis.currency,
          vis.status,
          vis.fx_rate_to_base,
          vis.sale_date,
          COALESCE(SUM(vip.amount * vip.fx_rate_to_base), 0) as total_paid,
          (vis.total_amount * vis.fx_rate_to_base) - COALESCE(SUM(vip.amount * vip.fx_rate_to_base), 0) as remaining_balance,
          ROW_NUMBER() OVER (
            PARTITION BY vis.vehicle_id 
            ORDER BY vis.created_at DESC
          ) as rn
        FROM vehicle_installment_sales vis
        LEFT JOIN vehicle_installment_payments vip ON vis.id = vip.installment_sale_id
        WHERE vis.tenant_id = ?
        GROUP BY vis.id, vis.vehicle_id, vis.total_amount, vis.down_payment, vis.installment_count, 
                 vis.installment_amount, vis.currency, vis.status, vis.fx_rate_to_base, vis.sale_date, vis.created_at
      ) vis_latest ON vis_latest.vehicle_id = v.id AND vis_latest.rn = 1
      WHERE v.tenant_id = ?
    `;
    // Add tenant_id parameters for subqueries and main query (3 total: 2 subqueries + 1 main WHERE)
    const tenantId = tenantQuery.getTenantId();
    const queryParams: any[] = [tenantId, tenantId, tenantId];

    // Apply filters
    if (params.is_sold === "true") {
      query += " AND v.is_sold = TRUE";
    } else if (params.is_sold === "false") {
      query += " AND v.is_sold = FALSE";
    }

    if (params.status) {
      query += " AND v.status = ?";
      queryParams.push(params.status);
    }

    if (params.stock_status) {
      query += " AND v.stock_status = ?";
      queryParams.push(params.stock_status);
    }

    if (params.branch_id) {
      query += " AND v.branch_id = ?";
      queryParams.push(params.branch_id);
    }

    if (params.search) {
      query += " AND (v.maker LIKE ? OR v.model LIKE ? OR v.chassis_no LIKE ? OR v.plate_number LIKE ? OR v.engine_no LIKE ?)";
      const searchParam = `%${params.search}%`;
      queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    query += " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
    queryParams.push(params.limit, params.offset);

    // Use tenantQuery.query() - it will enforce tenant_id automatically via strict mode
    const [rows] = await tenantQuery.query(query, queryParams);
    const vehiclesArray = rows as any[];

    // Get installment payments in batch
    const installmentSaleIds = vehiclesArray
      .filter(v => v.installment_sale_id)
      .map(v => v.installment_sale_id);

    let paymentsMap: Record<number, any[]> = {};
    if (installmentSaleIds.length > 0) {
      const [paymentRows] = await tenantQuery.query(
        `SELECT * FROM vehicle_installment_payments
         WHERE installment_sale_id IN (${installmentSaleIds.map(() => '?').join(',')}) AND tenant_id = ?
         ORDER BY installment_sale_id, payment_date ASC, installment_number ASC`,
        [...installmentSaleIds, tenantId]
      );
      const paymentsArray = paymentRows as any[];
      paymentsMap = paymentsArray.reduce((acc, payment) => {
        if (!acc[payment.installment_sale_id]) {
          acc[payment.installment_sale_id] = [];
        }
        acc[payment.installment_sale_id].push(payment);
        return acc;
      }, {} as Record<number, any[]>);
    }

    // Format vehicles and generate signed URLs for images
    // Performance: Using Promise.all for parallel signed URL generation
    // This ensures all URLs are generated concurrently, not sequentially
    // For 100 vehicles, this reduces latency from ~100s (sequential) to ~1s (parallel)
    const formattedVehicles = await Promise.all(
      vehiclesArray.map(async (vehicle) => {
        let primaryImageUrl: string | null = null;
        if (vehicle.primary_image_path) {
          try {
            // Normalize key (remove /uploads/ prefix if exists)
            const key = vehicle.primary_image_path.replace(/^\/uploads\//, '');
            // Vehicle images are public, use CDN URL if configured (parallelized via Promise.all above)
            primaryImageUrl = await StorageService.getUrl(key, true);
          } catch (urlError) {
            console.error(`[VehicleService] Failed to generate URL for ${vehicle.primary_image_path}:`, urlError);
            primaryImageUrl = null;
          }
        }

        const formatted: any = {
          ...vehicle,
          primary_image_url: primaryImageUrl,
        };

      // Add installment info
      if (vehicle.installment_sale_id) {
        formatted.installment = {
          id: vehicle.installment_sale_id,
          total_amount: Number(vehicle.installment_total_amount || 0),
          down_payment: Number(vehicle.installment_down_payment || 0),
          installment_count: Number(vehicle.installment_installment_count || 0),
          installment_amount: Number(vehicle.installment_installment_amount || 0),
          currency: vehicle.installment_currency,
          status: vehicle.installment_status,
          total_paid: Number(vehicle.installment_total_paid || 0),
          remaining_balance: Number(vehicle.installment_remaining_balance || 0),
          payments: paymentsMap[vehicle.installment_sale_id] || [],
        };
      }

      // Clean up temporary fields
      delete formatted.primary_image_path;
      delete formatted.installment_total_amount;
      delete formatted.installment_down_payment;
      delete formatted.installment_installment_count;
      delete formatted.installment_installment_amount;
      delete formatted.installment_currency;
      delete formatted.installment_status;
      delete formatted.installment_fx_rate_to_base;
      delete formatted.installment_sale_date;
      delete formatted.installment_total_paid;
      delete formatted.installment_remaining_balance;

        return formatted;
      })
    );

    // Get total count
    const [countRows] = await tenantQuery.query(
      "SELECT COUNT(*) as total FROM vehicles WHERE tenant_id = ?",
      [tenantId]
    );
    const total = (countRows as any[])[0]?.total || 0;

    return {
      vehicles: formattedVehicles,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  /**
   * Get next available vehicle number for a tenant
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async getNextVehicleNumber(tenantQuery: TenantAwareQuery): Promise<number> {
    const [usedNumbers] = await tenantQuery.query(
      "SELECT vehicle_number FROM vehicles WHERE tenant_id = ? AND vehicle_number IS NOT NULL ORDER BY vehicle_number",
      [tenantQuery.getTenantId()]
    );
    const usedNumbersArray = usedNumbers as any[];
    const usedSet = new Set(usedNumbersArray.map((v: any) => v.vehicle_number));

    // Find first available number starting from 1
    let nextNumber = 1;
    while (usedSet.has(nextNumber)) {
      nextNumber++;
    }

    return nextNumber;
  }

  /**
   * Validate and get final vehicle number (either provided or auto-assigned)
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async validateVehicleNumber(
    tenantQuery: TenantAwareQuery,
    providedNumber: number | null | undefined,
    excludeId?: number
  ): Promise<number> {
    if (providedNumber !== undefined && providedNumber !== null) {
      const num = Number(providedNumber);
      const [existingVehicle] = await tenantQuery.query(
        excludeId
          ? "SELECT id FROM vehicles WHERE tenant_id = ? AND vehicle_number = ? AND id != ?"
          : "SELECT id FROM vehicles WHERE tenant_id = ? AND vehicle_number = ?",
        excludeId ? [tenantQuery.getTenantId(), num, excludeId] : [tenantQuery.getTenantId(), num]
      );
      const existingVehicleArray = existingVehicle as any[];
      if (existingVehicleArray.length > 0) {
        throw new Error(`Araç no ${num} zaten kullanılıyor.`);
      }
      return num;
    } else {
      return await this.getNextVehicleNumber(tenantQuery);
    }
  }

  /**
   * Create a new vehicle
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async createVehicle(
    tenantQuery: TenantAwareQuery,
    params: CreateVehicleParams
  ): Promise<Vehicle> {
    return await tenantQuery.transaction(async (query) => {
      // Validate branch_id belongs to same tenant
      if (params.branch_id) {
        const branch = await query.selectOne('branches', { id: params.branch_id });
        if (!branch) {
          throw new Error("Branch not found or does not belong to your tenant");
        }
      }

      const baseCurrency = await this.getBaseCurrency(tenantQuery);

      // Calculate purchase FX rate if needed
      let purchaseFxRate = 1;
      if (params.purchase_amount && params.purchase_currency && params.purchase_date && params.purchase_currency !== baseCurrency) {
        purchaseFxRate = await getOrFetchRate(
          tenantQuery,
          params.purchase_currency as SupportedCurrency,
          baseCurrency as SupportedCurrency,
          params.purchase_date
        );
      }

      // Get or validate vehicle number
      const finalVehicleNumber = await this.validateVehicleNumber(query, params.vehicle_number);

      // Insert vehicle using TenantAwareQuery.insert()
      const vehicleId = await query.insert('vehicles', {
        vehicle_number: finalVehicleNumber,
        branch_id: params.branch_id ?? null,
        maker: (params.maker && params.maker.trim() !== '') ? params.maker : null,
        model: (params.model && params.model.trim() !== '') ? params.model : null,
        production_year: params.production_year ?? null,
        arrival_date: params.arrival_date ?? null,
        purchase_amount: params.purchase_amount ?? null,
        purchase_currency: params.purchase_currency || baseCurrency,
        purchase_fx_rate_to_base: purchaseFxRate,
        purchase_date: params.purchase_date ?? null,
        sale_price: params.sale_price ?? null,
        sale_currency: params.sale_currency || baseCurrency,
        status: params.status || "used",
        stock_status: params.stock_status || "in_stock",
        location: (params.location && params.location.trim() !== '') ? params.location : null,
        engine_no: (params.engine_no && params.engine_no.trim() !== '') ? params.engine_no : null,
        target_profit: params.target_profit ?? null,
        features: params.features ? JSON.stringify(params.features) : null,
      });

      const [rows] = await query.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [vehicleId, query.getTenantId()]);
      return (rows as any[])[0];
    }).catch((err: any) => {
      // Re-throw validation errors
      if (err.message && err.message.includes("Araç no")) {
        throw err;
      }
      
      // Check for duplicate vehicle_number error
      if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
        throw new Error("Bu araç no zaten kullanılıyor.");
      }
      
      // Check for foreign key constraint errors
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
        throw new Error("Invalid foreign key reference. Resource does not belong to your tenant.");
      }
      
      throw new Error("Failed to create vehicle");
    });
  }

  /**
   * Get vehicle by ID with full details
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async getVehicleById(tenantQuery: TenantAwareQuery, vehicleId: number): Promise<VehicleDetail> {
    const [rows] = await tenantQuery.query(
      `SELECT v.*, b.name as branch_name,
        COALESCE(
          (SELECT image_path 
           FROM vehicle_images 
           WHERE vehicle_id = v.id AND is_primary = TRUE AND tenant_id = v.tenant_id 
           LIMIT 1),
          (SELECT image_path 
           FROM vehicle_images 
           WHERE vehicle_id = v.id AND tenant_id = v.tenant_id 
           ORDER BY display_order ASC, created_at ASC
           LIMIT 1)
        ) as primary_image_path
       FROM vehicles v 
       LEFT JOIN branches b ON v.branch_id = b.id 
       WHERE v.id = ? AND v.tenant_id = ?`,
      [vehicleId, tenantQuery.getTenantId()]
    );

    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      throw new Error("Vehicle not found");
    }

    const vehicle = rowsArray[0] as any;
    
    // Generate URL for primary image (CDN if configured, since vehicle images are public)
    let primaryImageUrl: string | null = null;
    if (vehicle.primary_image_path) {
      try {
        // Normalize key (remove /uploads/ prefix if exists)
        const key = vehicle.primary_image_path.replace(/^\/uploads\//, '');
        // Vehicle images are public, use CDN URL if configured
        primaryImageUrl = await StorageService.getUrl(key, true);
      } catch (urlError) {
        console.error(`[VehicleService] Failed to generate URL for ${vehicle.primary_image_path}:`, urlError);
        primaryImageUrl = null;
      }
    }
    
    // Add primary_image_url to vehicle object
    vehicle.primary_image_url = primaryImageUrl;
    const [costs] = await tenantQuery.query(
      "SELECT * FROM vehicle_costs WHERE vehicle_id = ? AND tenant_id = ? ORDER BY cost_date DESC",
      [vehicleId, tenantQuery.getTenantId()]
    );
    const [sales] = await tenantQuery.query("SELECT * FROM vehicle_sales WHERE vehicle_id = ? AND tenant_id = ?", [vehicleId, tenantQuery.getTenantId()]);
    const salesArray = sales as any[];

    // Get installment info
    let installmentInfo = null;
    if (salesArray.length > 0) {
      const [installmentRows] = await tenantQuery.query(
        `SELECT vis.*, 
          (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
           FROM vehicle_installment_payments
           WHERE installment_sale_id = vis.id) as total_paid,
          (vis.total_amount * vis.fx_rate_to_base) - 
          (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
           FROM vehicle_installment_payments
           WHERE installment_sale_id = vis.id) as remaining_balance
         FROM vehicle_installment_sales vis
         WHERE vis.vehicle_id = ? AND vis.tenant_id = ?
         ORDER BY vis.created_at DESC
         LIMIT 1`,
        [vehicleId, tenantQuery.getTenantId()]
      );
      const installmentRowsArray = installmentRows as any[];
      if (installmentRowsArray.length > 0) {
        const installmentSale = installmentRowsArray[0];
        const [paymentRows] = await tenantQuery.query(
          `SELECT * FROM vehicle_installment_payments
           WHERE installment_sale_id = ? AND tenant_id = ?
           ORDER BY payment_date ASC, installment_number ASC`,
          [installmentSale.id, tenantQuery.getTenantId()]
        );
        installmentInfo = {
          ...installmentSale,
          payments: paymentRows,
        };
      }
    }

    return {
      ...vehicle,
      costs,
      sales: salesArray.length > 0 ? salesArray[0] : null,
      installment: installmentInfo,
    };
  }

  /**
   * Update an existing vehicle
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async updateVehicle(
    tenantQuery: TenantAwareQuery,
    params: UpdateVehicleParams
  ): Promise<Vehicle> {
    // Validate vehicle_number if being updated
    if (params.vehicle_number !== undefined && params.vehicle_number !== null) {
      await this.validateVehicleNumber(tenantQuery, params.vehicle_number, params.id);
    }

    // Build update data object
    const updateData: Record<string, any> = {};
    Object.keys(params).forEach((key) => {
      if (key !== "id" && key !== "tenant_id") {
        updateData[key] = (params as any)[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update");
    }

    const affectedRows = await tenantQuery.update('vehicles', updateData, { id: params.id });
    if (affectedRows === 0) {
      throw new Error("Vehicle not found");
    }

    const [rows] = await tenantQuery.query(
      "SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?",
      [params.id, tenantQuery.getTenantId()]
    );
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      throw new Error("Vehicle not found");
    }

    return rowsArray[0];
  }

  /**
   * Delete a vehicle
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async deleteVehicle(tenantQuery: TenantAwareQuery, vehicleId: number): Promise<void> {
    const affectedRows = await tenantQuery.delete('vehicles', { id: vehicleId });
    if (affectedRows === 0) {
      throw new Error("Vehicle not found");
    }
  }
}


