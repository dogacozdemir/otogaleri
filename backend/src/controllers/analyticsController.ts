import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

export async function getBrandProfit(req: AuthRequest, res: Response) {
  const { limit = 10, start_date, end_date } = req.query;

  let dateFilter = "";
  const params: any[] = [req.tenantId];

  if (start_date && end_date) {
    dateFilter = " AND vs.sale_date BETWEEN ? AND ?";
    params.push(start_date, end_date);
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        v.maker as brand,
        COUNT(DISTINCT v.id) as vehicle_count,
        COUNT(DISTINCT CASE WHEN v.is_sold = TRUE THEN v.id END) as sold_count,
        COALESCE(SUM(CASE WHEN vs.id IS NOT NULL THEN vs.sale_amount * vs.sale_fx_rate_to_base ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN vs.id IS NOT NULL THEN 
          (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
           COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0))
        ELSE 0 END), 0) as total_costs,
        COALESCE(SUM(CASE WHEN vs.id IS NOT NULL THEN 
          (vs.sale_amount * vs.sale_fx_rate_to_base) - 
          (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
           COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0))
        ELSE 0 END), 0) as total_profit
      FROM vehicles v
      LEFT JOIN vehicle_sales vs ON v.id = vs.vehicle_id AND vs.tenant_id = ?
      WHERE v.tenant_id = ? ${dateFilter}
      GROUP BY v.maker
      HAVING vehicle_count > 0
      ORDER BY total_profit DESC
      LIMIT ?`,
      [req.tenantId, ...params, Number(limit)]
    );

    const rowsArray = rows as any[];
    // MySQL'den dönen DECIMAL değerlerini number'a çevir
    const formattedRows = rowsArray.map(row => ({
      ...row,
      total_revenue: parseFloat(row.total_revenue) || 0,
      total_costs: parseFloat(row.total_costs) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error("[analytics] Brand profit error", err);
    res.status(500).json({ error: "Failed to get brand profit" });
  }
}

export async function getModelProfit(req: AuthRequest, res: Response) {
  const { limit = 10, brand, start_date, end_date } = req.query;

  let dateFilter = "";
  let brandFilter = "";
  const params: any[] = [req.tenantId];

  if (start_date && end_date) {
    dateFilter = " AND vs.sale_date BETWEEN ? AND ?";
    params.push(start_date, end_date);
  }

  if (brand) {
    brandFilter = " AND v.maker = ?";
    params.push(brand);
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        v.maker as brand,
        v.model,
        COUNT(DISTINCT v.id) as vehicle_count,
        COUNT(DISTINCT CASE WHEN v.is_sold = TRUE THEN v.id END) as sold_count,
        COALESCE(SUM(CASE WHEN vs.id IS NOT NULL THEN vs.sale_amount * vs.sale_fx_rate_to_base ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN vs.id IS NOT NULL THEN 
          (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
           COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0))
        ELSE 0 END), 0) as total_costs,
        COALESCE(SUM(CASE WHEN vs.id IS NOT NULL THEN 
          (vs.sale_amount * vs.sale_fx_rate_to_base) - 
          (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
           COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0))
        ELSE 0 END), 0) as total_profit
      FROM vehicles v
      LEFT JOIN vehicle_sales vs ON v.id = vs.vehicle_id AND vs.tenant_id = ?
      WHERE v.tenant_id = ? ${brandFilter} ${dateFilter}
      GROUP BY v.maker, v.model
      HAVING vehicle_count > 0
      ORDER BY total_profit DESC
      LIMIT ?`,
      [req.tenantId, ...params, Number(limit)]
    );

    const rowsArray = rows as any[];
    // MySQL'den dönen DECIMAL değerlerini number'a çevir
    const formattedRows = rowsArray.map(row => ({
      ...row,
      total_revenue: parseFloat(row.total_revenue) || 0,
      total_costs: parseFloat(row.total_costs) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error("[analytics] Model profit error", err);
    res.status(500).json({ error: "Failed to get model profit" });
  }
}

export async function getSalesDuration(req: AuthRequest, res: Response) {
  const { start_date, end_date } = req.query;

  let dateFilter = "";
  const params: any[] = [req.tenantId];

  if (start_date && end_date) {
    dateFilter = " AND vs.sale_date BETWEEN ? AND ?";
    params.push(start_date, end_date);
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        v.maker as brand,
        v.model,
        AVG(DATEDIFF(vs.sale_date, v.created_at)) as avg_days_to_sell,
        COUNT(*) as total_sales
      FROM vehicles v
      JOIN vehicle_sales vs ON v.id = vs.vehicle_id
      WHERE v.tenant_id = ? AND v.is_sold = TRUE ${dateFilter}
      GROUP BY v.maker, v.model
      ORDER BY total_sales DESC`,
      params
    );

    const rowsArray = rows as any[];
    res.json(rowsArray || []);
  } catch (err) {
    console.error("[analytics] Sales duration error", err);
    res.status(500).json({ error: "Failed to get sales duration" });
  }
}

export async function getTopProfitable(req: AuthRequest, res: Response) {
  const { limit = 10, start_date, end_date } = req.query;

  let dateFilter = "";
  const params: any[] = [req.tenantId];

  if (start_date && end_date) {
    dateFilter = " AND vs.sale_date BETWEEN ? AND ?";
    params.push(start_date, end_date);
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        v.id,
        v.maker,
        v.model,
        v.year,
        v.chassis_no,
        vs.sale_amount * vs.sale_fx_rate_to_base as sale_price,
        (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
         COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0)) as total_costs,
        (vs.sale_amount * vs.sale_fx_rate_to_base) - 
        (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
         COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0)) as profit,
        vs.sale_date,
        vs.customer_name,
        vs.staff_id
      FROM vehicles v
      JOIN vehicle_sales vs ON v.id = vs.vehicle_id
      WHERE v.tenant_id = ? AND v.is_sold = TRUE ${dateFilter}
      ORDER BY profit DESC
      LIMIT ?`,
      [...params, Number(limit)]
    );

    const rowsArray = rows as any[];
    // MySQL'den dönen DECIMAL değerlerini number'a çevir
    const formattedRows = rowsArray.map(row => ({
      ...row,
      sale_price: parseFloat(row.sale_price) || 0,
      total_costs: parseFloat(row.total_costs) || 0,
      profit: parseFloat(row.profit) || 0,
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error("[analytics] Top profitable error", err);
    res.status(500).json({ error: "Failed to get top profitable" });
  }
}

export async function getMonthlyComparison(req: AuthRequest, res: Response) {
  const { months = 12 } = req.query;

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        DATE_FORMAT(vs.sale_date, '%Y-%m') as month,
        COUNT(*) as sales_count,
        COALESCE(SUM(vs.sale_amount * vs.sale_fx_rate_to_base), 0) as total_revenue,
        COALESCE(SUM(v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
         COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0)), 0) as total_costs,
        COALESCE(SUM((vs.sale_amount * vs.sale_fx_rate_to_base) - 
         (v.purchase_amount * COALESCE(v.purchase_fx_rate_to_base, 1) + 
          COALESCE((SELECT SUM(amount * fx_rate_to_base) FROM vehicle_costs WHERE vehicle_id = v.id), 0))), 0) as total_profit
      FROM vehicle_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.tenant_id = ? 
        AND vs.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(vs.sale_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT ?`,
      [req.tenantId, Number(months), Number(months)]
    );

    const rowsArray = rows as any[];
    // MySQL'den dönen DECIMAL değerlerini number'a çevir
    const formattedRows = rowsArray.map(row => ({
      ...row,
      total_revenue: parseFloat(row.total_revenue) || 0,
      total_costs: parseFloat(row.total_costs) || 0,
      total_profit: parseFloat(row.total_profit) || 0,
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error("[analytics] Monthly comparison error", err);
    res.status(500).json({ error: "Failed to get monthly comparison" });
  }
}

export async function getCategoryCosts(req: AuthRequest, res: Response) {
  const { vehicle_id, start_date, end_date } = req.query;

  try {
    let query = `
      SELECT 
        COALESCE(category, 'other') as category,
        COUNT(*) as cost_count,
        COALESCE(SUM(amount * fx_rate_to_base), 0) as total_amount
      FROM vehicle_costs
      WHERE tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (vehicle_id) {
      query += ` AND vehicle_id = ?`;
      params.push(vehicle_id);
    }

    if (start_date && end_date) {
      query += ` AND cost_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    query += ` GROUP BY category ORDER BY total_amount DESC`;

    const [rows] = await dbPool.query(query, params);
    const rowsArray = rows as any[];

    // Kategori isimlerini Türkçe'ye çevir
    const categoryNames: Record<string, string> = {
      'purchase': 'Alış',
      'shipping': 'Nakliye',
      'customs': 'Gümrük',
      'repair': 'Tamir',
      'insurance': 'Sigorta',
      'tax': 'Vergi',
      'other': 'Diğer'
    };

    const result = rowsArray.map(cat => ({
      ...cat,
      category_name: categoryNames[cat.category] || cat.category
    }));

    res.json(result);
  } catch (err) {
    console.error("[analytics] Category costs error", err);
    res.status(500).json({ error: "Failed to get category costs" });
  }
}
