import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import "../middleware/tenantQuery"; // Import for type augmentation
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";
import { StorageService } from "../services/storage/storageService";

export async function listCustomers(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { search, sort_by = "name", sort_order = "asc", page = "1", limit = "50" } = req.query;

  try {
    const offset = (Number(page) - 1) * Number(limit);
    const filters: string[] = ["c.tenant_id = ?"];
    const params: any[] = [tenantQuery.getTenantId()];

    if (search) {
      filters.push("(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    // Müşteri listesi ve toplam harcama, satış sayısı (customer_name ve customer_phone ile eşleştirme)
    const [rows] = await tenantQuery.query(
      `SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.notes,
        c.total_spent_base,
        c.created_at,
        COALESCE(COUNT(DISTINCT vs.id), 0) as sale_count,
        MAX(vs.sale_date) as last_sale_date,
        MIN(vs.sale_date) as first_sale_date,
        GROUP_CONCAT(DISTINCT CONCAT(COALESCE(v.maker, ''), ' ', COALESCE(v.model, ''), ' ', COALESCE(v.production_year, '')) SEPARATOR ', ') as vehicles_purchased
      FROM customers c
      LEFT JOIN vehicle_sales vs ON vs.tenant_id = ? AND (vs.customer_name = c.name OR (vs.customer_phone IS NOT NULL AND vs.customer_phone = c.phone))
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      ${whereClause}
      GROUP BY c.id
      ORDER BY ${sort_by === "name" ? "c.name" : sort_by === "total_spent" ? "c.total_spent_base" : sort_by === "sale_count" ? "sale_count" : sort_by === "last_sale" ? "last_sale_date" : "c.name"} ${sort_order === "asc" ? "ASC" : "DESC"}
      LIMIT ? OFFSET ?`,
      [tenantQuery.getTenantId(), ...params, Number(limit), offset]
    );

    // Toplam sayı
    const [countRows] = await tenantQuery.query(
      `SELECT COUNT(DISTINCT c.id) as total FROM customers c ${whereClause}`,
      params
    );
    const total = (countRows as any[])[0]?.total || 0;

    res.json({
      customers: rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[customer] List error", err);
    throw err; // Let error handler middleware handle it
  }
}

export async function getCustomerById(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { id } = req.params;

  try {
    const [customerRows] = await tenantQuery.query(
      "SELECT * FROM customers WHERE id = ? AND tenant_id = ?",
      [id, tenantQuery.getTenantId()]
    );
    const customerRowsArray = customerRows as any[];
    if (customerRowsArray.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerRowsArray[0];

    // Müşterinin satışlarını getir (customer_name ve customer_phone ile eşleştirme)
    const [sales] = await tenantQuery.query(
      `SELECT 
        vs.*,
        v.maker,
        v.model,
        v.production_year as year,
        v.chassis_no,
        primary_img.image_filename as primary_image_filename,
        b.name as branch_name,
        s.name as staff_name
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN branches b ON vs.branch_id = b.id
      LEFT JOIN staff s ON vs.staff_id = s.id
      LEFT JOIN (
        SELECT 
          vi.vehicle_id,
          vi.image_path,
          vi.image_filename,
          ROW_NUMBER() OVER (
            PARTITION BY vi.vehicle_id 
            ORDER BY vi.is_primary DESC, vi.display_order ASC, vi.created_at ASC
          ) as rn
        FROM vehicle_images vi
        WHERE vi.tenant_id = ?
      ) primary_img ON primary_img.vehicle_id = v.id AND primary_img.rn = 1
      WHERE vs.tenant_id = ? AND (vs.customer_name = ? OR (vs.customer_phone IS NOT NULL AND vs.customer_phone = ?))
      ORDER BY vs.sale_date DESC`,
      [tenantQuery.getTenantId(), tenantQuery.getTenantId(), customer.name, customer.phone]
    );

    const salesArray = sales as any[];
    
    // Tüm vehicle_id'leri topla ve batch olarak installment bilgilerini getir
    const vehicleIds = salesArray
      .filter(sale => sale.vehicle_id)
      .map(sale => sale.vehicle_id);
    
    let installmentsMap: Record<number, any> = {};
    let paymentsMap: Record<number, any[]> = {};
    
    if (vehicleIds.length > 0) {
      // Installment bilgilerini batch olarak getir (her vehicle için en son installment)
      const [installmentRows] = await tenantQuery.query(
        `SELECT 
          vis_latest.*,
          COALESCE(payment_summary.total_paid, 0) as total_paid,
          (vis_latest.total_amount * vis_latest.fx_rate_to_base) - COALESCE(payment_summary.total_paid, 0) as remaining_balance
        FROM (
          SELECT 
            vis.*,
            ROW_NUMBER() OVER (
              PARTITION BY vis.vehicle_id 
              ORDER BY vis.created_at DESC
            ) as rn
          FROM vehicle_installment_sales vis
          WHERE vis.vehicle_id IN (${vehicleIds.map(() => '?').join(',')}) AND vis.tenant_id = ?
        ) vis_latest
        LEFT JOIN (
          SELECT 
            installment_sale_id,
            SUM(amount * fx_rate_to_base) as total_paid
          FROM vehicle_installment_payments
          GROUP BY installment_sale_id
        ) payment_summary ON payment_summary.installment_sale_id = vis_latest.id
        WHERE vis_latest.rn = 1`,
        [...vehicleIds, tenantQuery.getTenantId()]
      );
      
      const installmentsArray = installmentRows as any[];
      const installmentSaleIds = installmentsArray.map(inst => inst.id);
      
      // Payment'ları batch olarak getir
      if (installmentSaleIds.length > 0) {
        const [paymentRows] = await tenantQuery.query(
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
      
      // Installment'ları vehicle_id'ye göre map'le
      installmentsMap = installmentsArray.reduce((acc, inst) => {
        if (!acc[inst.vehicle_id]) {
          acc[inst.vehicle_id] = inst;
        }
        return acc;
      }, {} as Record<number, any>);
    }
    
    // Satışlara installment bilgilerini ve resim URL'lerini ekle (StorageService/CDN üzerinden)
    const formattedSales = await Promise.all(
      salesArray.map(async (sale) => {
        let primary_image_url: string | null = null;
        if (sale.primary_image_path) {
          try {
            const key = sale.primary_image_path.replace(/^\/uploads\//, "");
            primary_image_url = await StorageService.getUrl(key, true);
          } catch (urlError) {
            console.error("[customerController] Failed to get image URL:", urlError);
            primary_image_url = null;
          }
        }
        const formatted: any = {
          ...sale,
          primary_image_url,
        };
        delete formatted.primary_image_path;
      
      if (sale.vehicle_id && installmentsMap[sale.vehicle_id]) {
        const installment = installmentsMap[sale.vehicle_id];
        formatted.installment = {
          ...installment,
          payments: paymentsMap[installment.id] || [],
        };
        formatted.installment_sale_id = installment.id;
        formatted.installment_remaining_balance = Number(installment.remaining_balance || 0);
      }
      
        return formatted;
      })
    );

    // Müşterinin gelir kayıtlarını getir
    const [income] = await tenantQuery.query(
      `SELECT * FROM income 
      WHERE customer_id = ? AND tenant_id = ?
      ORDER BY income_date DESC`,
      [id, tenantQuery.getTenantId()]
    );

    // İstatistikler
    const totalSales = formattedSales.length;
    const totalSpent = formattedSales.reduce((sum, s) => sum + (Number(s.sale_amount) * Number(s.sale_fx_rate_to_base) || 0), 0);
    const lastSaleDate = formattedSales.length > 0 ? formattedSales[0].sale_date : null;
    const firstSaleDate = formattedSales.length > 0 ? formattedSales[formattedSales.length - 1].sale_date : null;

    res.json({
      customer: {
        ...customer,
        total_spent_base: Number(customer.total_spent_base) || totalSpent,
        sale_count: totalSales,
        last_sale_date: lastSaleDate,
        first_sale_date: firstSaleDate,
      },
      sales: formattedSales,
      income: income,
    });
  } catch (err) {
    console.error("[customer] Get error", err);
    throw err; // Let error handler middleware handle it
  }
}

export async function createCustomer(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { name, phone, email, address, notes } = req.body;

  try {
    const [result] = await tenantQuery.query(
      "INSERT INTO customers (tenant_id, name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [tenantQuery.getTenantId(), name, phone || null, email || null, address || null, notes || null]
    );

    const customerId = (result as any).insertId;
    const [rows] = await tenantQuery.query("SELECT * FROM customers WHERE id = ? AND tenant_id = ?", [customerId, tenantQuery.getTenantId()]);
    const customer = (rows as any[])[0];
    res.status(201).json(customer);
  } catch (err: any) {
    console.error("[customer] Create error", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer with this phone already exists" });
    }
    throw err; // Let error handler middleware handle it
  }
}

export async function updateCustomer(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { id } = req.params;
  const { name, phone, email, address, notes } = req.body;

  try {
    await tenantQuery.query(
      "UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ? AND tenant_id = ?",
      [name, phone || null, email || null, address || null, notes || null, id, tenantQuery.getTenantId()]
    );

    const [rows] = await tenantQuery.query("SELECT * FROM customers WHERE id = ? AND tenant_id = ?", [id, tenantQuery.getTenantId()]);
    const customerRowsArray = rows as any[];
    if (customerRowsArray.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(customerRowsArray[0]);
  } catch (err: any) {
    console.error("[customer] Update error", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Customer with this phone already exists" });
    }
    throw err; // Let error handler middleware handle it
  }
}

export async function deleteCustomer(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { id } = req.params;

  try {
    const [result] = await tenantQuery.query("DELETE FROM customers WHERE id = ? AND tenant_id = ?", [id, tenantQuery.getTenantId()]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("[customer] Delete error", err);
    throw err; // Let error handler middleware handle it
  }
}

// Müşteri segmentlerini getir (VIP, Düzenli, Yeni)
export async function getCustomerSegments(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;

  try {
    const [allCustomers] = await tenantQuery.query(
      `SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.total_spent_base,
        c.created_at,
        COALESCE(COUNT(DISTINCT vs.id), 0) as sale_count,
        MAX(vs.sale_date) as last_sale_date,
        MIN(vs.sale_date) as first_sale_date,
        GROUP_CONCAT(DISTINCT CONCAT(COALESCE(v.maker, ''), ' ', COALESCE(v.model, ''), ' ', COALESCE(v.production_year, '')) SEPARATOR ', ') as vehicles_purchased,
        GROUP_CONCAT(DISTINCT v.chassis_no SEPARATOR ', ') as chassis_numbers
      FROM customers c
      LEFT JOIN vehicle_sales vs ON vs.tenant_id = ? AND (vs.customer_name = c.name OR (vs.customer_phone IS NOT NULL AND vs.customer_phone = c.phone))
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE c.tenant_id = ?
      GROUP BY c.id`,
      [tenantQuery.getTenantId(), tenantQuery.getTenantId()]
    );

    const customersArray = allCustomers as any[];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const vip = customersArray.filter(
      (c) => Number(c.total_spent_base) > 50000 && Number(c.sale_count) > 3
    );
    const regular = customersArray.filter(
      (c) => Number(c.total_spent_base) > 10000 && Number(c.sale_count) > 1 && !vip.find((v) => v.id === c.id)
    );
    const newCustomers = customersArray.filter((c) => {
      const createdDate = new Date(c.created_at);
      return createdDate >= oneMonthAgo;
    });

    res.json({
      vip,
      regular,
      new: newCustomers,
    });
  } catch (err) {
    console.error("[customer] Segments error", err);
    throw err; // Let error handler middleware handle it
  }
}

