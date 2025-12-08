import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

export async function listVehicles(req: AuthRequest, res: Response) {
  const { page = 1, limit = 50, search, is_sold, status, stock_status, branch_id } = req.query;
  
  // Validate pagination parameters (should be validated by middleware, but double-check here)
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT 
      v.*, 
      b.name as branch_name,
      COALESCE(cost_summary.total_costs, 0) as total_costs,
      COALESCE(cost_summary.cost_count, 0) as cost_count,
      primary_img.image_filename as primary_image_filename,
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
        vi.image_filename,
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
  const params: any[] = [req.tenantId, req.tenantId, req.tenantId];

  if (is_sold === "true") {
    query += " AND v.is_sold = TRUE";
  } else if (is_sold === "false") {
    query += " AND v.is_sold = FALSE";
  }

  if (status) {
    query += " AND v.status = ?";
    params.push(status);
  }

  if (stock_status) {
    query += " AND v.stock_status = ?";
    params.push(stock_status);
  }

  if (branch_id) {
    query += " AND v.branch_id = ?";
    params.push(branch_id);
  }

  if (search) {
    query += " AND (v.maker LIKE ? OR v.model LIKE ? OR v.chassis_no LIKE ? OR v.plate_number LIKE ?)";
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
  params.push(limitNum, offset);

  try {
    const [rows] = await dbPool.query(query, params);
    const vehiclesArray = rows as any[];
    
    // Installment bilgilerini formatla ve payment'ları batch olarak getir
    const installmentSaleIds = vehiclesArray
      .filter(v => v.installment_sale_id)
      .map(v => v.installment_sale_id);
    
    let paymentsMap: Record<number, any[]> = {};
    if (installmentSaleIds.length > 0) {
      const [paymentRows] = await dbPool.query(
        `SELECT * FROM vehicle_installment_payments
         WHERE installment_sale_id IN (${installmentSaleIds.map(() => '?').join(',')})
         ORDER BY installment_sale_id, payment_date ASC, installment_number ASC`,
        installmentSaleIds
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
    
    // Araçları formatla
    const formattedVehicles = vehiclesArray.map(vehicle => {
      const formatted: any = {
        ...vehicle,
        primary_image_url: vehicle.primary_image_filename 
          ? `/uploads/vehicles/${vehicle.primary_image_filename}` 
          : null,
      };
      
      // Installment bilgilerini ekle
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
      
      // Installment ile ilgili geçici alanları temizle
      delete formatted.primary_image_filename;
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
    });
    
    const [countRows] = await dbPool.query(
      "SELECT COUNT(*) as total FROM vehicles WHERE tenant_id = ?",
      [req.tenantId]
    );
    const total = (countRows as any[])[0]?.total || 0;

    res.json({
      vehicles: formattedVehicles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("[vehicle] List error", err);
    res.status(500).json({ error: "Failed to list vehicles" });
  }
}

export async function createVehicle(req: AuthRequest, res: Response) {
  const {
    vehicle_number,
    branch_id,
    maker,
    model,
    production_year,
    arrival_date,
    purchase_amount,
    purchase_currency,
    purchase_date,
    sale_price,
    sale_currency,
    status,
    stock_status,
    location,
    target_profit,
    features,
  } = req.body;

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Validate branch_id belongs to same tenant
    if (branch_id) {
      const [branchRows] = await conn.query(
        "SELECT id FROM branches WHERE id = ? AND tenant_id = ?",
        [branch_id, req.tenantId]
      );
      const branchArray = branchRows as any[];
      if (branchArray.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: "Branch not found or does not belong to your tenant" });
      }
    }

    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    let purchaseFxRate = 1;
    if (purchase_amount && purchase_currency && purchase_date && purchase_currency !== baseCurrency) {
      purchaseFxRate = await getOrFetchRate(
        purchase_currency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        purchase_date
      );
    }

    // Determine vehicle_number: use provided value or find next available number
    let finalVehicleNumber: number | null = null;
    
    if (vehicle_number !== undefined && vehicle_number !== null && vehicle_number !== "") {
      // User provided a vehicle number, check if it's available
      const providedNumber = Number(vehicle_number);
      const [existingVehicle] = await conn.query(
        "SELECT id FROM vehicles WHERE tenant_id = ? AND vehicle_number = ?",
        [req.tenantId, providedNumber]
      );
      const existingVehicleArray = existingVehicle as any[];
      if (existingVehicleArray.length > 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: `Araç no ${providedNumber} zaten kullanılıyor.` });
      }
      finalVehicleNumber = providedNumber;
    } else {
      // Auto-assign: find first available number starting from 1
      const [usedNumbers] = await conn.query(
        "SELECT vehicle_number FROM vehicles WHERE tenant_id = ? AND vehicle_number IS NOT NULL ORDER BY vehicle_number",
        [req.tenantId]
      );
      const usedNumbersArray = usedNumbers as any[];
      const usedSet = new Set(usedNumbersArray.map((v: any) => v.vehicle_number));
      
      // Find first available number starting from 1
      let nextNumber = 1;
      while (usedSet.has(nextNumber)) {
        nextNumber++;
      }
      finalVehicleNumber = nextNumber;
    }

    const [result] = await conn.query(
      `INSERT INTO vehicles (
        tenant_id, vehicle_number, branch_id, maker, model, production_year, arrival_date,
        purchase_amount, purchase_currency, purchase_fx_rate_to_base, purchase_date,
        sale_price, sale_currency,
        status, stock_status, location, target_profit, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        finalVehicleNumber,
        branch_id ?? null,
        (maker && maker.trim() !== '') ? maker : null,
        (model && model.trim() !== '') ? model : null,
        production_year ?? null,
        arrival_date ?? null,
        purchase_amount ?? null,
        purchase_currency || baseCurrency,
        purchaseFxRate,
        purchase_date ?? null,
        sale_price ?? null,
        sale_currency || baseCurrency,
        status || "used",
        stock_status || "in_stock",
        (location && location.trim() !== '') ? location : null,
        target_profit ?? null,
        features ? JSON.stringify(features) : null,
      ]
    );

    await conn.commit();
    conn.release();

    const vehicleId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    const vehicle = (rows as any[])[0];
    res.status(201).json(vehicle);
  } catch (err: any) {
    await conn.rollback();
    conn.release();
    console.error("[vehicle] Create error", err);
    
    // Check for duplicate vehicle_number error (409 Conflict)
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: "Bu araç no zaten kullanılıyor." });
    }
    
    // Check for foreign key constraint errors
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      return res.status(400).json({ error: "Invalid foreign key reference. Resource does not belong to your tenant." });
    }
    
    res.status(500).json({ error: "Failed to create vehicle" });
  }
}

export async function getVehicleById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT v.*, b.name as branch_name,
        COALESCE(
          (SELECT CONCAT('/uploads/vehicles/', image_filename) 
           FROM vehicle_images 
           WHERE vehicle_id = v.id AND is_primary = TRUE AND tenant_id = v.tenant_id 
           LIMIT 1),
          (SELECT CONCAT('/uploads/vehicles/', image_filename) 
           FROM vehicle_images 
           WHERE vehicle_id = v.id AND tenant_id = v.tenant_id 
           ORDER BY display_order ASC, created_at ASC
           LIMIT 1)
        ) as primary_image_url
       FROM vehicles v 
       LEFT JOIN branches b ON v.branch_id = b.id 
       WHERE v.id = ? AND v.tenant_id = ?`,
      [id, req.tenantId]
    );

    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicle = rowsArray[0] as any;
    const [costs] = await dbPool.query(
      "SELECT * FROM vehicle_costs WHERE vehicle_id = ? ORDER BY cost_date DESC",
      [id]
    );
    const [sales] = await dbPool.query("SELECT * FROM vehicle_sales WHERE vehicle_id = ?", [id]);
    const salesArray = sales as any[];

    // Taksit bilgilerini getir
    let installmentInfo = null;
    if (salesArray.length > 0) {
      const [installmentRows] = await dbPool.query(
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
        [id, req.tenantId]
      );
      const installmentRowsArray = installmentRows as any[];
      if (installmentRowsArray.length > 0) {
        const installmentSale = installmentRowsArray[0];
        const [paymentRows] = await dbPool.query(
          `SELECT * FROM vehicle_installment_payments
           WHERE installment_sale_id = ?
           ORDER BY payment_date ASC, installment_number ASC`,
          [installmentSale.id]
        );
        installmentInfo = {
          ...installmentSale,
          payments: paymentRows,
        };
      }
    }

    res.json({
      ...vehicle,
      costs,
      sales: salesArray.length > 0 ? salesArray[0] : null,
      installment: installmentInfo,
    });
  } catch (err) {
    console.error("[vehicle] Get error", err);
    res.status(500).json({ error: "Failed to get vehicle" });
  }
}

export async function updateVehicle(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  try {
    // If vehicle_number is being updated, check for uniqueness
    if (updates.vehicle_number !== undefined && updates.vehicle_number !== null && updates.vehicle_number !== "") {
      const newVehicleNumber = Number(updates.vehicle_number);
      const [existingVehicle] = await dbPool.query(
        "SELECT id FROM vehicles WHERE tenant_id = ? AND vehicle_number = ? AND id != ?",
        [req.tenantId, newVehicleNumber, id]
      );
      const existingVehicleArray = existingVehicle as any[];
      if (existingVehicleArray.length > 0) {
        return res.status(400).json({ error: `Araç no ${newVehicleNumber} zaten kullanılıyor.` });
      }
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    Object.keys(updates).forEach((key) => {
      if (key !== "id" && key !== "tenant_id") {
        updateFields.push(`${key} = ?`);
        // Convert vehicle_number to number if it's a string
        if (key === "vehicle_number" && updates[key] !== null && updates[key] !== "") {
          params.push(Number(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id, req.tenantId);
    await dbPool.query(`UPDATE vehicles SET ${updateFields.join(", ")} WHERE id = ? AND tenant_id = ?`, params);

    const [rows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json(rowsArray[0]);
  } catch (err: any) {
    console.error("[vehicle] Update error", err);
    
    // Check for duplicate vehicle_number error
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(400).json({ error: "Bu araç no zaten kullanılıyor." });
    }
    
    res.status(500).json({ error: "Failed to update vehicle" });
  }
}

export async function getNextVehicleNumber(req: AuthRequest, res: Response) {
  try {
    // Find first available number starting from 1
    const [usedNumbers] = await dbPool.query(
      "SELECT vehicle_number FROM vehicles WHERE tenant_id = ? AND vehicle_number IS NOT NULL ORDER BY vehicle_number",
      [req.tenantId]
    );
    const usedNumbersArray = usedNumbers as any[];
    const usedSet = new Set(usedNumbersArray.map((v: any) => v.vehicle_number));
    
    // Find first available number starting from 1
    let nextNumber = 1;
    while (usedSet.has(nextNumber)) {
      nextNumber++;
    }
    
    res.json({ next_vehicle_number: nextNumber });
  } catch (err) {
    console.error("[vehicle] Get next number error", err);
    res.status(500).json({ error: "Failed to get next vehicle number" });
  }
}

export async function deleteVehicle(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query("DELETE FROM vehicles WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    res.json({ message: "Vehicle deleted" });
  } catch (err) {
    console.error("[vehicle] Delete error", err);
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
}
