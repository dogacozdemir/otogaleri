import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

export async function listVehicles(req: AuthRequest, res: Response) {
  const { page = 1, limit = 50, search, is_sold, status, stock_status, branch_id } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT v.*, b.name as branch_name,
      COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as total_costs,
      COALESCE((SELECT COUNT(*) FROM vehicle_costs WHERE vehicle_id = v.id), 0) as cost_count,
      (SELECT CONCAT('/uploads/vehicles/', image_filename) 
       FROM vehicle_images 
       WHERE vehicle_id = v.id AND is_primary = TRUE AND tenant_id = v.tenant_id 
       LIMIT 1) as primary_image_url
    FROM vehicles v
    LEFT JOIN branches b ON v.branch_id = b.id
    WHERE v.tenant_id = ?
  `;
  const params: any[] = [req.tenantId];

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
    query += " AND (v.maker LIKE ? OR v.model LIKE ? OR v.chassis_no LIKE ?)";
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += " ORDER BY v.created_at DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), offset);

  try {
    const [rows] = await dbPool.query(query, params);
    const [countRows] = await dbPool.query(
      "SELECT COUNT(*) as total FROM vehicles WHERE tenant_id = ?",
      [req.tenantId]
    );
    const total = (countRows as any[])[0]?.total || 0;

    res.json({
      vehicles: rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[vehicle] List error", err);
    res.status(500).json({ error: "Failed to list vehicles" });
  }
}

export async function createVehicle(req: AuthRequest, res: Response) {
  const {
    branch_id,
    maker,
    model,
    year,
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

    const [result] = await conn.query(
      `INSERT INTO vehicles (
        tenant_id, branch_id, maker, model, year,
        purchase_amount, purchase_currency, purchase_fx_rate_to_base, purchase_date,
        sale_price, sale_currency,
        status, stock_status, location, target_profit, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        branch_id || null,
        maker || null,
        model || null,
        year || null,
        purchase_amount || null,
        purchase_currency || baseCurrency,
        purchaseFxRate,
        purchase_date || null,
        sale_price || null,
        sale_currency || baseCurrency,
        status || "used",
        stock_status || "in_stock",
        location || null,
        target_profit || null,
        features ? JSON.stringify(features) : null,
      ]
    );

    await conn.commit();
    conn.release();

    const vehicleId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM vehicles WHERE id = ?", [vehicleId]);
    const vehicle = (rows as any[])[0];
    res.status(201).json(vehicle);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("[vehicle] Create error", err);
    res.status(500).json({ error: "Failed to create vehicle" });
  }
}

export async function getVehicleById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT v.*, b.name as branch_name,
        (SELECT CONCAT('/uploads/vehicles/', image_filename) 
         FROM vehicle_images 
         WHERE vehicle_id = v.id AND is_primary = TRUE AND tenant_id = v.tenant_id 
         LIMIT 1) as primary_image_url
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

    res.json({
      ...vehicle,
      costs,
      sales: salesArray.length > 0 ? salesArray[0] : null,
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
    const updateFields: string[] = [];
    const params: any[] = [];

    Object.keys(updates).forEach((key) => {
      if (key !== "id" && key !== "tenant_id") {
        updateFields.push(`${key} = ?`);
        params.push(updates[key]);
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
  } catch (err) {
    console.error("[vehicle] Update error", err);
    res.status(500).json({ error: "Failed to update vehicle" });
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
