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

// Taksiti devam eden araç sayısını getir
export async function getActiveInstallmentCount(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT COUNT(DISTINCT vis.vehicle_id) as active_installment_count
       FROM vehicle_installment_sales vis
       WHERE vis.tenant_id = ? 
         AND vis.status = 'active'
         AND (
           (vis.total_amount * vis.fx_rate_to_base) - 
           (SELECT COALESCE(SUM(amount * fx_rate_to_base), 0)
            FROM vehicle_installment_payments
            WHERE installment_sale_id = vis.id)
         ) > 0`,
      [req.tenantId]
    );

    const rowsArray = rows as any[];
    const count = Number(rowsArray[0]?.active_installment_count || 0);

    res.json({ count });
  } catch (err) {
    console.error("[analytics] Active installment count error", err);
    res.status(500).json({ error: "Failed to get active installment count" });
  }
}

// Aylık satış karşılaştırması - Bu ay ve önceki ay
export async function getMonthlySales(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        DATE_FORMAT(vs.sale_date, '%Y-%m') as month,
        COUNT(*) as sales_count
      FROM vehicle_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.tenant_id = ? 
        AND vs.sale_date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
      GROUP BY DATE_FORMAT(vs.sale_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 2`,
      [req.tenantId]
    );

    const rowsArray = rows as any[];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

    const currentMonthData = rowsArray.find((r: any) => r.month === currentMonth);
    const lastMonthData = rowsArray.find((r: any) => r.month === lastMonth);

    const currentSales = Number(currentMonthData?.sales_count || 0);
    const lastSales = Number(lastMonthData?.sales_count || 0);
    const changePercent = lastSales > 0 
      ? ((currentSales - lastSales) / lastSales * 100).toFixed(1)
      : currentSales > 0 ? "100" : "0";

    res.json({
      currentMonth: currentSales,
      lastMonth: lastSales,
      changePercent: parseFloat(changePercent),
      trend: currentSales > lastSales ? "up" : currentSales < lastSales ? "down" : "neutral"
    });
  } catch (err) {
    console.error("[analytics] Monthly sales error", err);
    res.status(500).json({ error: "Failed to get monthly sales" });
  }
}

// Stok durumu - Toplam stok ve en çok satılan
export async function getOldStock(req: AuthRequest, res: Response) {
  try {
    // Toplam stoktaki araç sayısı (satılmamış)
    // is_sold = 0 veya NULL olanlar satılmamış sayılır
    const [stockCountRows] = await dbPool.query(
      `SELECT COUNT(*) as total_count
       FROM vehicles v
       WHERE v.tenant_id = ? 
         AND (v.is_sold = FALSE OR v.is_sold = 0 OR v.is_sold IS NULL)`,
      [req.tenantId]
    );

    const totalStock = Number((stockCountRows as any[])[0]?.total_count || 0);

    // 30+ gündür satılmamış araç sayısı
    const [oldStockCountRows] = await dbPool.query(
      `SELECT COUNT(*) as total_count
       FROM vehicles v
       WHERE v.tenant_id = ? 
         AND (v.is_sold = FALSE OR v.is_sold = 0 OR v.is_sold IS NULL)
         AND DATEDIFF(CURDATE(), v.created_at) >= 30`,
      [req.tenantId]
    );

    const totalOldStock = Number((oldStockCountRows as any[])[0]?.total_count || 0);

    // En çok satılan marka/model
    const [topSellingRows] = await dbPool.query(
      `SELECT 
        v.maker as brand,
        v.model,
        COUNT(DISTINCT v.id) as sold_count
      FROM vehicles v
      JOIN vehicle_sales vs ON v.id = vs.vehicle_id
      WHERE v.tenant_id = ? AND v.is_sold = TRUE
      GROUP BY v.maker, v.model
      ORDER BY sold_count DESC
      LIMIT 1`,
      [req.tenantId]
    );

    const topSelling = (topSellingRows as any[])[0] || null;

    res.json({
      totalStock,
      totalOldStock,
      topSelling: topSelling ? {
        brand: topSelling.brand,
        model: topSelling.model,
        soldCount: Number(topSelling.sold_count)
      } : null
    });
  } catch (err) {
    console.error("[analytics] Old stock error", err);
    res.status(500).json({ error: "Failed to get old stock" });
  }
}

// Son aktiviteler - Satışlar, araçlar, ödemeler, müşteriler
// Haftalık satış verilerini getir (son 8 hafta)
export async function getWeeklySales(req: AuthRequest, res: Response) {
  try {
    // Son 8 haftanın başlangıç tarihlerini hesapla
    const weeks: any[] = [];
    const today = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      const weekStart = new Date(weekDate);
      weekStart.setDate(weekDate.getDate() - weekDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      // Bu hafta içindeki satışları say
      const [salesRows] = await dbPool.query(
        `SELECT COUNT(*) as sales_count
         FROM vehicle_sales vs
         WHERE vs.tenant_id = ?
           AND DATE(vs.sale_date) >= ?
           AND DATE(vs.sale_date) <= ?`,
        [req.tenantId, weekStartStr, weekEndStr]
      );
      
      const salesRowsArray = salesRows as any[];
      const salesCount = salesRowsArray[0] ? parseInt(salesRowsArray[0].sales_count) : 0;
      
      weeks.push({
        week: `Hafta ${8 - i}`,
        week_start: weekStartStr,
        sales_count: salesCount,
      });
    }

    res.json(weeks);
  } catch (err) {
    console.error("[analytics] Weekly sales error", err);
    res.status(500).json({ error: "Failed to get weekly sales" });
  }
}

// Haftalık stok verilerini getir (son 8 hafta) - Servis ve Satış çıkışlarını ayrı göster
export async function getWeeklyInventory(req: AuthRequest, res: Response) {
  try {
    const weeks: any[] = [];
    const today = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      const weekStart = new Date(weekDate);
      weekStart.setDate(weekDate.getDate() - weekDate.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];
      
      // Bu hafta içindeki servis çıkışlarını say
      const [serviceRows] = await dbPool.query(
        `SELECT COALESCE(SUM(quantity), 0) as service_count
         FROM inventory_movements
         WHERE tenant_id = ?
           AND type = 'service_usage'
           AND DATE(movement_date) >= ?
           AND DATE(movement_date) <= ?`,
        [req.tenantId, weekStartStr, weekEndStr]
      );
      
      // Bu hafta içindeki satış çıkışlarını say
      const [saleRows] = await dbPool.query(
        `SELECT COALESCE(SUM(quantity), 0) as sale_count
         FROM inventory_movements
         WHERE tenant_id = ?
           AND type = 'sale'
           AND DATE(movement_date) >= ?
           AND DATE(movement_date) <= ?`,
        [req.tenantId, weekStartStr, weekEndStr]
      );
      
      const serviceRowsArray = serviceRows as any[];
      const saleRowsArray = saleRows as any[];
      
      const serviceCount = serviceRowsArray[0] ? parseInt(serviceRowsArray[0].service_count) : 0;
      const saleCount = saleRowsArray[0] ? parseInt(saleRowsArray[0].sale_count) : 0;
      
      weeks.push({
        week: `Hafta ${8 - i}`,
        week_start: weekStartStr,
        service_count: serviceCount,
        sale_count: saleCount,
      });
    }

    res.json(weeks);
  } catch (err) {
    console.error("[analytics] Weekly inventory error", err);
    res.status(500).json({ error: "Failed to get weekly inventory" });
  }
}

export async function getRecentActivities(req: AuthRequest, res: Response) {
  try {
    const { limit = 10 } = req.query;

    // Son satışlar
    const [salesRows] = await dbPool.query(
      `SELECT 
        vs.id,
        vs.sale_date,
        vs.customer_name,
        v.maker,
        v.model,
        v.year,
        'sale' as activity_type
      FROM vehicle_sales vs
      JOIN vehicles v ON vs.vehicle_id = v.id
      WHERE vs.tenant_id = ?
      ORDER BY vs.sale_date DESC
      LIMIT ?`,
      [req.tenantId, Number(limit)]
    );

    // Son eklenen araçlar
    const [vehiclesRows] = await dbPool.query(
      `SELECT 
        id,
        maker,
        model,
        year,
        created_at,
        'vehicle' as activity_type
      FROM vehicles
      WHERE tenant_id = ? AND is_sold = FALSE
      ORDER BY created_at DESC
      LIMIT ?`,
      [req.tenantId, Number(limit)]
    );

    // Son ödemeler (taksit ödemeleri)
    const [paymentsRows] = await dbPool.query(
      `SELECT 
        vip.id,
        vip.payment_date,
        vip.amount,
        vis.vehicle_id,
        v.maker,
        v.model,
        vs.customer_name,
        'payment' as activity_type
      FROM vehicle_installment_payments vip
      JOIN vehicle_installment_sales vis ON vip.installment_sale_id = vis.id
      JOIN vehicles v ON vis.vehicle_id = v.id
      LEFT JOIN vehicle_sales vs ON vis.sale_id = vs.id
      WHERE vis.tenant_id = ?
      ORDER BY vip.payment_date DESC
      LIMIT ?`,
      [req.tenantId, Number(limit)]
    );

    // Son eklenen müşteriler
    const [customersRows] = await dbPool.query(
      `SELECT 
        id,
        name,
        phone,
        created_at,
        'customer' as activity_type
      FROM customers
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
      [req.tenantId, Number(limit)]
    );

    // Tüm aktiviteleri birleştir ve tarihe göre sırala
    const allActivities = [
      ...(salesRows as any[]).map((s: any) => ({
        id: `sale-${s.id}`,
        type: 'sale',
        date: s.sale_date,
        title: `${s.maker} ${s.model} satıldı`,
        subtitle: s.customer_name,
        details: `${s.year} - ${s.maker} ${s.model}`
      })),
      ...(vehiclesRows as any[]).map((v: any) => ({
        id: `vehicle-${v.id}`,
        type: 'vehicle',
        date: v.created_at,
        title: `${v.maker} ${v.model} eklendi`,
        subtitle: 'Yeni araç',
        details: `${v.year} - ${v.maker} ${v.model}`
      })),
      ...(paymentsRows as any[]).map((p: any) => ({
        id: `payment-${p.id}`,
        type: 'payment',
        date: p.payment_date,
        title: `Taksit ödemesi alındı`,
        subtitle: p.customer_name || 'Müşteri',
        details: `${p.maker} ${p.model} - ${parseFloat(p.amount).toLocaleString('tr-TR')}`
      })),
      ...(customersRows as any[]).map((c: any) => ({
        id: `customer-${c.id}`,
        type: 'customer',
        date: c.created_at,
        title: `${c.name} eklendi`,
        subtitle: c.phone || 'Telefon yok',
        details: 'Yeni müşteri'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, Number(limit));

    res.json(allActivities);
  } catch (err) {
    console.error("[analytics] Recent activities error", err);
    res.status(500).json({ error: "Failed to get recent activities" });
  }
}
