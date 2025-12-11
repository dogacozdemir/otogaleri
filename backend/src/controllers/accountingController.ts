import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

// Supported currencies list for validation
const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["TRY", "USD", "EUR", "GBP", "JPY"];

interface IncomeConversionDetail {
  id: number;
  type: string;
  amount: number;
  currency: string;
  transaction_date: string;
  converted_amount: number;
  rate_used: number;
  rate_source: 'custom' | 'api';
}

// Gider listesi
export async function getExpensesList(req: AuthRequest, res: Response) {
  const { page = 1, limit = 10, search = "", category = "", startDate, endDate } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = `
      SELECT e.*, b.name as branch_name, v.maker, v.model
      FROM expenses e 
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      WHERE e.tenant_id = ?
    `;
    let countQuery = `SELECT COUNT(*) as total FROM expenses e WHERE e.tenant_id = ?`;
    let params: any[] = [req.tenantId];
    let countParams: any[] = [req.tenantId];

    // Tarih filtreleme
    if (startDate && endDate) {
      query += ` AND e.expense_date >= ? AND e.expense_date <= ?`;
      countQuery += ` AND e.expense_date >= ? AND e.expense_date <= ?`;
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }

    if (search) {
      query += ` AND (e.description LIKE ? OR e.category LIKE ?)`;
      countQuery += ` AND (e.description LIKE ? OR e.category LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
      countParams.push(searchParam, searchParam);
    }

    if (category && category !== "all") {
      query += ` AND e.category = ?`;
      countQuery += ` AND e.category = ?`;
      params.push(category);
      countParams.push(category);
    }

    query += ` ORDER BY e.expense_date DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const [expenses] = await dbPool.query(query, params);
    const [countResult] = await dbPool.query(countQuery, countParams);
    const total = (countResult as any[])[0]?.total || 0;

    res.json({
      expenses,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[accounting] Expenses list error", err);
    res.status(500).json({ error: "Failed to get expenses list" });
  }
}

// Gelir listesi (vehicle sales + manuel income)
export async function getIncomeList(req: AuthRequest, res: Response) {
  const { page = 1, limit = 10, search = "", startDate, endDate } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = `
      SELECT 
        'vehicle_sale' as type,
        vs.id,
        vs.sale_date as date,
        vs.sale_date as income_date,
        vs.sale_amount as amount,
        vs.sale_amount * vs.sale_fx_rate_to_base as amount_base,
        CONCAT('Araç Satışı: ', COALESCE(v.maker, ''), ' ', COALESCE(v.model, '')) as description,
        'Vehicle Sale' as category,
        vs.customer_name,
        s.name as staff_name,
        b.name as branch_name,
        vs.sale_currency as currency,
        vs.sale_fx_rate_to_base as fx_rate_to_base,
        vs.sale_date as transaction_date,
        NULL as custom_rate
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN staff s ON vs.staff_id = s.id
      LEFT JOIN branches b ON vs.branch_id = b.id
      WHERE vs.tenant_id = ?
    `;
    let params: any[] = [req.tenantId];

    // Tarih filtreleme
    if (startDate && endDate) {
      query += ` AND vs.sale_date >= ? AND vs.sale_date <= ?`;
      params.push(startDate, endDate);
    }

    if (search) {
      query += ` AND (vs.customer_name LIKE ? OR v.maker LIKE ? OR v.model LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    // Manual income query - tarih filtresini WHERE clause'una ekle
    let manualIncomeWhere = "WHERE i.tenant_id = ? AND i.vehicle_id IS NULL";
    if (startDate && endDate) {
      manualIncomeWhere += " AND i.income_date >= ? AND i.income_date <= ?";
    }
    if (search) {
      manualIncomeWhere += " AND (i.description LIKE ? OR i.category LIKE ?)";
    }
    
    query += `
      UNION ALL
      SELECT 
        'manual' as type,
        i.id,
        i.income_date as date,
        i.income_date,
        i.amount as amount,
        i.amount_base,
        i.description,
        i.category,
        c.name as customer_name,
        NULL as staff_name,
        b.name as branch_name,
        i.currency,
        i.fx_rate_to_base,
        i.income_date as transaction_date,
        NULL as custom_rate
      FROM income i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN branches b ON i.branch_id = b.id
      ${manualIncomeWhere}
    `;
    params.push(req.tenantId);
    if (startDate && endDate) {
      params.push(startDate, endDate);
    }
    if (search) {
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }
    
    // Inventory sales (stok satışları)
    if (startDate && endDate) {
      query += `
        UNION ALL
        SELECT 
          'inventory_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          CONCAT('Stok Satışı: ', COALESCE(ip.name, '')) as description,
          'Inventory Sale' as category,
          c.name as customer_name,
          s.name as staff_name,
          NULL as branch_name,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        LEFT JOIN inventory_products ip ON im.product_id = ip.id
        LEFT JOIN customers c ON im.customer_id = c.id
        LEFT JOIN staff s ON im.staff_id = s.id
        WHERE im.tenant_id = ? 
          AND im.type = 'sale'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
          AND im.movement_date >= ? AND im.movement_date <= ?
      `;
      params.push(req.tenantId, startDate, endDate);
    } else {
      query += `
        UNION ALL
        SELECT 
          'inventory_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          CONCAT('Stok Satışı: ', COALESCE(ip.name, '')) as description,
          'Inventory Sale' as category,
          c.name as customer_name,
          s.name as staff_name,
          NULL as branch_name,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        LEFT JOIN inventory_products ip ON im.product_id = ip.id
        LEFT JOIN customers c ON im.customer_id = c.id
        LEFT JOIN staff s ON im.staff_id = s.id
        WHERE im.tenant_id = ? 
          AND im.type = 'sale'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
      `;
      params.push(req.tenantId);
    }
    
    if (search) {
      // Inventory sales için search ekle (eğer query'de varsa)
      const searchParam = `%${search}%`;
      // Bu kısım UNION ALL içinde olduğu için WHERE clause'u düzeltmemiz gerekiyor
      // Şimdilik search inventory sales için çalışmayacak, sonra düzeltebiliriz
    }
    
    // Service sales (servis satışları)
    if (startDate && endDate) {
      query += `
        UNION ALL
        SELECT 
          'service_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          CONCAT('Servis Satışı: ', COALESCE(ip.name, '')) as description,
          'Service Sale' as category,
          c.name as customer_name,
          s.name as staff_name,
          NULL as branch_name,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        LEFT JOIN inventory_products ip ON im.product_id = ip.id
        LEFT JOIN customers c ON im.customer_id = c.id
        LEFT JOIN staff s ON im.staff_id = s.id
        WHERE im.tenant_id = ? 
          AND im.type = 'service_usage'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
          AND im.movement_date >= ? AND im.movement_date <= ?
      `;
      params.push(req.tenantId, startDate, endDate);
    } else {
      query += `
        UNION ALL
        SELECT 
          'service_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          CONCAT('Servis Satışı: ', COALESCE(ip.name, '')) as description,
          'Service Sale' as category,
          c.name as customer_name,
          s.name as staff_name,
          NULL as branch_name,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        LEFT JOIN inventory_products ip ON im.product_id = ip.id
        LEFT JOIN customers c ON im.customer_id = c.id
        LEFT JOIN staff s ON im.staff_id = s.id
        WHERE im.tenant_id = ? 
          AND im.type = 'service_usage'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
      `;
      params.push(req.tenantId);
    }

    query += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // Count query - tüm gelir tiplerini say
    let countQuery = `
      SELECT COUNT(*) as count FROM (
        SELECT vs.id FROM vehicle_sales vs WHERE vs.tenant_id = ?
        UNION ALL
        SELECT i.id FROM income i WHERE i.tenant_id = ? AND i.vehicle_id IS NULL
        UNION ALL
        SELECT im.id FROM inventory_movements im 
        WHERE im.tenant_id = ? AND im.type = 'sale' AND im.sale_price IS NOT NULL AND im.sale_price > 0
        UNION ALL
        SELECT im.id FROM inventory_movements im 
        WHERE im.tenant_id = ? AND im.type = 'service_usage' AND im.sale_price IS NOT NULL AND im.sale_price > 0
      ) as combined
    `;
    let countParams: any[] = [req.tenantId, req.tenantId, req.tenantId, req.tenantId];

    if (startDate && endDate) {
      countQuery = `
        SELECT COUNT(*) as count FROM (
          SELECT vs.id FROM vehicle_sales vs 
          WHERE vs.tenant_id = ? AND vs.sale_date >= ? AND vs.sale_date <= ?
          UNION ALL
          SELECT i.id FROM income i 
          WHERE i.tenant_id = ? AND i.vehicle_id IS NULL AND i.income_date >= ? AND i.income_date <= ?
          UNION ALL
          SELECT im.id FROM inventory_movements im 
          WHERE im.tenant_id = ? AND im.type = 'sale' AND im.sale_price IS NOT NULL AND im.sale_price > 0
            AND im.movement_date >= ? AND im.movement_date <= ?
          UNION ALL
          SELECT im.id FROM inventory_movements im 
          WHERE im.tenant_id = ? AND im.type = 'service_usage' AND im.sale_price IS NOT NULL AND im.sale_price > 0
            AND im.movement_date >= ? AND im.movement_date <= ?
        ) as combined
      `;
      countParams = [req.tenantId, startDate, endDate, req.tenantId, startDate, endDate, req.tenantId, startDate, endDate, req.tenantId, startDate, endDate];
    }

    const [incomes] = await dbPool.query(query, params);
    const [countResult] = await dbPool.query(countQuery, countParams);
    const total = (countResult as any[])[0]?.count || 0;

    res.json({
      incomes,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[accounting] Income list error", err);
    res.status(500).json({ error: "Failed to get income list" });
  }
}

// Yıllık gelir-gider (son 12 ay)
export async function getYearlyIncomeExpense(req: AuthRequest, res: Response) {
  try {
    // Son 12 ayın gelirleri (vehicle sales + income + inventory sales + service sales)
    const [incomeData] = await dbPool.query(
      `SELECT 
         DATE_FORMAT(transaction_date, '%Y-%m') as month,
         COALESCE(SUM(amount), 0) as income
       FROM (
         SELECT sale_date as transaction_date, sale_amount * sale_fx_rate_to_base as amount
         FROM vehicle_sales
         WHERE tenant_id = ? AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        UNION ALL
        SELECT income_date as transaction_date, amount_base as amount
        FROM income
        WHERE tenant_id = ? AND vehicle_id IS NULL AND income_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        UNION ALL
        SELECT movement_date as transaction_date, sale_amount_base as amount
        FROM inventory_movements
        WHERE tenant_id = ? AND type = 'sale' AND sale_price IS NOT NULL AND sale_price > 0
          AND movement_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        UNION ALL
        SELECT movement_date as transaction_date, sale_amount_base as amount
        FROM inventory_movements
        WHERE tenant_id = ? AND type = 'service_usage' AND sale_price IS NOT NULL AND sale_price > 0
          AND movement_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       ) as combined
       GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
       ORDER BY month`,
      [req.tenantId, req.tenantId, req.tenantId, req.tenantId]
    );

    // Son 12 ayın giderleri (expenses + vehicle_costs)
    const [expenseData] = await dbPool.query(
      `SELECT 
         DATE_FORMAT(transaction_date, '%Y-%m') as month,
         COALESCE(SUM(amount), 0) as expense
       FROM (
         SELECT expense_date as transaction_date, amount_base as amount
         FROM expenses
         WHERE tenant_id = ? AND expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         UNION ALL
         SELECT cost_date as transaction_date, amount * fx_rate_to_base as amount
         FROM vehicle_costs
         WHERE tenant_id = ? AND cost_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       ) as combined
       GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
       ORDER BY month`,
      [req.tenantId, req.tenantId]
    );

    // Tüm ayları oluştur
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      months.push(monthStr);
    }

    // Verileri birleştir
    const incomeMap = new Map((incomeData as any[]).map((item) => [item.month, item.income]));
    const expenseMap = new Map((expenseData as any[]).map((item) => [item.month, item.expense]));

    const combinedData = months.map((month) => {
      const income = Number(incomeMap.get(month) || 0);
      const expense = Number(expenseMap.get(month) || 0);
      return {
        month,
        income,
        expense,
        profit: income - expense,
      };
    });

    res.json(combinedData);
  } catch (err) {
    console.error("[accounting] Yearly income expense error", err);
    res.status(500).json({ error: "Failed to get yearly income expense" });
  }
}

// Tarih aralığı gelir-gider
export async function getDateRangeIncomeExpense(req: AuthRequest, res: Response) {
  const { startDate, endDate } = req.query;

  try {
    const queryStartDate = startDate || "2020-01-01";
    const queryEndDate = endDate || new Date().toISOString().split("T")[0];

    // Gelir verileri (vehicle sales + manual income + inventory sales + service sales)
    const [incomeData] = await dbPool.query(
      `SELECT 
         DATE(transaction_date) as date,
         COALESCE(SUM(amount), 0) as income,
         COUNT(*) as transaction_count
       FROM (
         SELECT sale_date as transaction_date, sale_amount * sale_fx_rate_to_base as amount
         FROM vehicle_sales
         WHERE tenant_id = ? AND sale_date BETWEEN ? AND ?
        UNION ALL
        SELECT income_date as transaction_date, amount_base as amount
        FROM income
        WHERE tenant_id = ? AND vehicle_id IS NULL AND income_date BETWEEN ? AND ?
        UNION ALL
        SELECT movement_date as transaction_date, sale_amount_base as amount
        FROM inventory_movements
        WHERE tenant_id = ? AND type = 'sale' AND sale_price IS NOT NULL AND sale_price > 0
          AND movement_date BETWEEN ? AND ?
        UNION ALL
        SELECT movement_date as transaction_date, sale_amount_base as amount
        FROM inventory_movements
        WHERE tenant_id = ? AND type = 'service_usage' AND sale_price IS NOT NULL AND sale_price > 0
          AND movement_date BETWEEN ? AND ?
       ) as combined
       GROUP BY DATE(transaction_date)
       ORDER BY date`,
      [
        req.tenantId, queryStartDate, queryEndDate,
        req.tenantId, queryStartDate, queryEndDate,
        req.tenantId, queryStartDate, queryEndDate,
        req.tenantId, queryStartDate, queryEndDate
      ]
    );

    // Gider verileri
    const [expenseData] = await dbPool.query(
      `SELECT 
         DATE(transaction_date) as date,
         COALESCE(SUM(amount), 0) as expense,
         COUNT(*) as transaction_count
       FROM (
         SELECT expense_date as transaction_date, amount_base as amount
         FROM expenses
         WHERE tenant_id = ? AND expense_date BETWEEN ? AND ?
         UNION ALL
         SELECT cost_date as transaction_date, amount * fx_rate_to_base as amount
         FROM vehicle_costs
         WHERE tenant_id = ? AND cost_date BETWEEN ? AND ?
       ) as combined
       GROUP BY DATE(transaction_date)
       ORDER BY date`,
      [req.tenantId, queryStartDate, queryEndDate, req.tenantId, queryStartDate, queryEndDate]
    );

    // Verileri birleştir
    const dateMap = new Map();
    const incomeArray = incomeData as any[];
    const expenseArray = expenseData as any[];

    incomeArray.forEach((item) => {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, {
          date: item.date,
          income: 0,
          expense: 0,
          net_income: 0,
        });
      }
      const entry = dateMap.get(item.date);
      entry.income = Number(item.income) || 0;
      entry.net_income = entry.income - entry.expense;
    });

    expenseArray.forEach((item) => {
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, {
          date: item.date,
          income: 0,
          expense: 0,
          net_income: 0,
        });
      }
      const entry = dateMap.get(item.date);
      entry.expense = Number(item.expense) || 0;
      entry.net_income = entry.income - entry.expense;
    });

    const combinedData = Array.from(dateMap.values()).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json(combinedData);
  } catch (err) {
    console.error("[accounting] Date range income expense error", err);
    res.status(500).json({ error: "Failed to get date range income expense" });
  }
}

// Manuel gelir ekleme
export async function addIncome(req: AuthRequest, res: Response) {
  const { description, category, amount, currency, income_date, branch_id, customer_id, vehicle_id } = req.body;

  if (!description || !amount || !income_date) {
    return res.status(400).json({ error: "Description, amount, and income_date required" });
  }

  try {
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const incomeCurrency = currency || baseCurrency;

    let fxRate = 1;
    if (incomeCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        incomeCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        income_date
      );
    }

    const amountBase = Number(amount) * fxRate;

    const [result] = await dbPool.query(
      `INSERT INTO income (tenant_id, branch_id, vehicle_id, customer_id, description, category, amount, currency, fx_rate_to_base, amount_base, income_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        branch_id || null,
        vehicle_id || null,
        customer_id || null,
        description,
        category || "Other",
        amount,
        incomeCurrency,
        fxRate,
        amountBase,
        income_date,
      ]
    );

    const incomeId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM income WHERE id = ?", [incomeId]);
    res.status(201).json(rows);
  } catch (err) {
    console.error("[accounting] Add income error", err);
    res.status(500).json({ error: "Failed to add income" });
  }
}

// Gider ekleme
export async function addExpense(req: AuthRequest, res: Response) {
  const { description, category, amount, currency, expense_date, branch_id, vehicle_id } = req.body;

  if (!description || !amount || !expense_date) {
    return res.status(400).json({ error: "Description, amount, and expense_date required" });
  }

  try {
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const expenseCurrency = currency || baseCurrency;

    let fxRate = 1;
    if (expenseCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        expenseCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        expense_date
      );
    }

    const amountBase = Number(amount) * fxRate;

    const [result] = await dbPool.query(
      `INSERT INTO expenses (tenant_id, branch_id, vehicle_id, description, category, amount, currency, fx_rate_to_base, amount_base, expense_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        branch_id || null,
        vehicle_id || null,
        description,
        category || "Other",
        amount,
        expenseCurrency,
        fxRate,
        amountBase,
        expense_date,
      ]
    );

    const expenseId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM expenses WHERE id = ?", [expenseId]);
    res.status(201).json(rows);
  } catch (err) {
    console.error("[accounting] Add expense error", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
}

// Gider güncelleme
export async function updateExpense(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { description, category, amount, currency, expense_date, branch_id, vehicle_id } = req.body;

  try {
    // Mevcut gideri kontrol et
    const [existing] = await dbPool.query("SELECT * FROM expenses WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    const existingArray = existing as any[];
    if (existingArray.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const expenseCurrency = currency || baseCurrency;

    let fxRate = 1;
    if (expenseCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        expenseCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        expense_date || existingArray[0].expense_date
      );
    }

    const amountBase = Number(amount) * fxRate;

    await dbPool.query(
      `UPDATE expenses 
       SET description = ?, category = ?, amount = ?, currency = ?, fx_rate_to_base = ?, amount_base = ?, expense_date = ?, branch_id = ?, vehicle_id = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        description || existingArray[0].description,
        category || existingArray[0].category,
        amount || existingArray[0].amount,
        expenseCurrency,
        fxRate,
        amountBase,
        expense_date || existingArray[0].expense_date,
        branch_id !== undefined ? branch_id : existingArray[0].branch_id,
        vehicle_id !== undefined ? vehicle_id : existingArray[0].vehicle_id,
        id,
        req.tenantId,
      ]
    );

    const [rows] = await dbPool.query("SELECT * FROM expenses WHERE id = ?", [id]);
    res.json(rows);
  } catch (err) {
    console.error("[accounting] Update expense error", err);
    res.status(500).json({ error: "Failed to update expense" });
  }
}

// Gider silme
export async function deleteExpense(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query("DELETE FROM expenses WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    const resultArray = result as any;
    if (resultArray.affectedRows === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("[accounting] Delete expense error", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
}

// Gelir güncelleme
export async function updateIncome(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { description, category, amount, currency, income_date, branch_id, customer_id, vehicle_id } = req.body;

  try {
    const [existing] = await dbPool.query("SELECT * FROM income WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    const existingArray = existing as any[];
    if (existingArray.length === 0) {
      return res.status(404).json({ error: "Income not found" });
    }

    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";
    const incomeCurrency = currency || baseCurrency;

    let fxRate = 1;
    if (incomeCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        incomeCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        income_date || existingArray[0].income_date
      );
    }

    const amountBase = Number(amount) * fxRate;

    await dbPool.query(
      `UPDATE income 
       SET description = ?, category = ?, amount = ?, currency = ?, fx_rate_to_base = ?, amount_base = ?, income_date = ?, branch_id = ?, customer_id = ?, vehicle_id = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        description || existingArray[0].description,
        category || existingArray[0].category,
        amount || existingArray[0].amount,
        incomeCurrency,
        fxRate,
        amountBase,
        income_date || existingArray[0].income_date,
        branch_id !== undefined ? branch_id : existingArray[0].branch_id,
        customer_id !== undefined ? customer_id : existingArray[0].customer_id,
        vehicle_id !== undefined ? vehicle_id : existingArray[0].vehicle_id,
        id,
        req.tenantId,
      ]
    );

    const [rows] = await dbPool.query("SELECT * FROM income WHERE id = ?", [id]);
    res.json(rows);
  } catch (err) {
    console.error("[accounting] Update income error", err);
    res.status(500).json({ error: "Failed to update income" });
  }
}

// Gelir silme
export async function deleteIncome(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query("DELETE FROM income WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    const resultArray = result as any;
    if (resultArray.affectedRows === 0) {
      return res.status(404).json({ error: "Income not found" });
    }
    res.json({ message: "Income deleted successfully" });
  } catch (err) {
    console.error("[accounting] Delete income error", err);
    res.status(500).json({ error: "Failed to delete income" });
  }
}

// Convert incomes to target currency
export async function convertIncomesToCurrency(req: AuthRequest, res: Response) {
  const { target_currency, startDate, endDate } = req.body;

  if (!target_currency) {
    return res.status(400).json({ error: "target_currency is required" });
  }

  // Validate target_currency is a supported currency
  if (!SUPPORTED_CURRENCIES.includes(target_currency as SupportedCurrency)) {
    return res.status(400).json({ error: `Unsupported target_currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}` });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Get all incomes using the same query logic as getIncomeList
    let query = `
      SELECT 
        'vehicle_sale' as type,
        vs.id,
        vs.sale_date as date,
        vs.sale_date as income_date,
        vs.sale_amount as amount,
        vs.sale_amount * vs.sale_fx_rate_to_base as amount_base,
        vs.sale_currency as currency,
        vs.sale_fx_rate_to_base as fx_rate_to_base,
        vs.sale_date as transaction_date,
        NULL as custom_rate
      FROM vehicle_sales vs
      WHERE vs.tenant_id = ?
    `;
    let params: any[] = [req.tenantId];

    if (startDate && endDate) {
      query += ` AND vs.sale_date >= ? AND vs.sale_date <= ?`;
      params.push(startDate, endDate);
    }

    // Manual income query - tarih filtresini WHERE clause'una ekle
    let manualIncomeWhere = "WHERE i.tenant_id = ? AND i.vehicle_id IS NULL";
    if (startDate && endDate) {
      manualIncomeWhere += " AND i.income_date >= ? AND i.income_date <= ?";
    }
    
    query += `
      UNION ALL
      SELECT 
        'manual' as type,
        i.id,
        i.income_date as date,
        i.income_date,
        i.amount as amount,
        i.amount_base,
        i.currency,
        i.fx_rate_to_base,
        i.income_date as transaction_date,
        NULL as custom_rate
      FROM income i
      ${manualIncomeWhere}
    `;
    params.push(req.tenantId);
    if (startDate && endDate) {
      params.push(startDate, endDate);
    }

    // Inventory sales
    if (startDate && endDate) {
      query += `
        UNION ALL
        SELECT 
          'inventory_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        WHERE im.tenant_id = ? 
          AND im.type = 'sale'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
          AND im.movement_date >= ? AND im.movement_date <= ?
      `;
      params.push(req.tenantId, startDate, endDate);
    } else {
      query += `
        UNION ALL
        SELECT 
          'inventory_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        WHERE im.tenant_id = ? 
          AND im.type = 'sale'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
      `;
      params.push(req.tenantId);
    }

    // Service sales
    if (startDate && endDate) {
      query += `
        UNION ALL
        SELECT 
          'service_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        WHERE im.tenant_id = ? 
          AND im.type = 'service_usage'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
          AND im.movement_date >= ? AND im.movement_date <= ?
      `;
      params.push(req.tenantId, startDate, endDate);
    } else {
      query += `
        UNION ALL
        SELECT 
          'service_sale' as type,
          im.id,
          im.movement_date as date,
          im.movement_date as income_date,
          im.sale_price * im.quantity as amount,
          im.sale_amount_base as amount_base,
          im.sale_currency as currency,
          im.sale_fx_rate_to_base as fx_rate_to_base,
          im.movement_date as transaction_date,
          NULL as custom_rate
        FROM inventory_movements im
        WHERE im.tenant_id = ? 
          AND im.type = 'service_usage'
          AND im.sale_price IS NOT NULL
          AND im.sale_price > 0
      `;
      params.push(req.tenantId);
    }

    const [incomes] = await dbPool.query(query, params);
    const incomeArray = incomes as any[];

    let totalConverted = 0;
    const conversionDetails: IncomeConversionDetail[] = [];

    for (const income of incomeArray) {
      const incomeCurrency = income.currency || baseCurrency;
      const transactionDate = income.transaction_date || income.income_date || income.date;
      const incomeAmount = Number(income.amount || 0);

      if (incomeAmount === 0) continue;

      let rateToTarget = 1;
      let rateSource: 'custom' | 'api' = 'api';

      if (incomeCurrency === target_currency) {
        // Same currency, no conversion needed
        totalConverted += incomeAmount;
        conversionDetails.push({
          id: income.id,
          type: income.type,
          amount: incomeAmount,
          currency: incomeCurrency,
          transaction_date: transactionDate,
          converted_amount: incomeAmount,
          rate_used: 1,
          rate_source: 'api'
        });
        continue;
      }

      // Note: custom_rate is not yet implemented for income/vehicle_sales tables
      // For now, always use API rates

      // No custom rate - use date-based rate directly from incomeCurrency to targetCurrency
      try {
        if (target_currency !== baseCurrency || incomeCurrency !== baseCurrency) {
          rateToTarget = await getOrFetchRate(
            incomeCurrency as SupportedCurrency,
            target_currency as SupportedCurrency,
            transactionDate
          );
        } else {
          rateToTarget = 1;
        }

        const convertedAmount = incomeAmount * rateToTarget;
        totalConverted += convertedAmount;

        conversionDetails.push({
          id: income.id,
          type: income.type,
          amount: incomeAmount,
          currency: incomeCurrency,
          transaction_date: transactionDate,
          converted_amount: convertedAmount,
          rate_used: rateToTarget,
          rate_source: rateSource
        });
      } catch (rateError: any) {
        console.error(`[accounting] Failed to convert income ${income.id} (${incomeCurrency}->${target_currency} on ${transactionDate}):`, rateError.message);
        // Skip this income or use base currency conversion as fallback
        // Try converting through base currency
        try {
          if (incomeCurrency !== baseCurrency) {
            const rateToBase = await getOrFetchRate(
              incomeCurrency as SupportedCurrency,
              baseCurrency as SupportedCurrency,
              transactionDate
            );
            const amountInBase = incomeAmount * rateToBase;
            
            if (target_currency !== baseCurrency) {
              rateToTarget = await getOrFetchRate(
                baseCurrency as SupportedCurrency,
                target_currency as SupportedCurrency,
                transactionDate
              );
              const convertedAmount = amountInBase * rateToTarget;
              totalConverted += convertedAmount;
              conversionDetails.push({
                id: income.id,
                type: income.type,
                amount: incomeAmount,
                currency: incomeCurrency,
                transaction_date: transactionDate,
                converted_amount: convertedAmount,
                rate_used: rateToTarget,
                rate_source: 'api'
              });
            } else {
              totalConverted += amountInBase;
              conversionDetails.push({
                id: income.id,
                type: income.type,
                amount: incomeAmount,
                currency: incomeCurrency,
                transaction_date: transactionDate,
                converted_amount: amountInBase,
                rate_used: rateToBase,
                rate_source: 'api'
              });
            }
          }
        } catch (fallbackError: any) {
          console.error(`[accounting] Fallback conversion also failed for income ${income.id}:`, fallbackError.message);
          // Last resort: skip this income or use amount_base if available
          if (income.amount_base) {
            const amountInBase = Number(income.amount_base);
            if (target_currency === baseCurrency) {
              totalConverted += amountInBase;
              conversionDetails.push({
                id: income.id,
                type: income.type,
                amount: incomeAmount,
                currency: incomeCurrency,
                transaction_date: transactionDate,
                converted_amount: amountInBase,
                rate_used: income.fx_rate_to_base || 1,
                rate_source: 'api'
              });
            } else {
              // Try to convert from base to target
              try {
                rateToTarget = await getOrFetchRate(
                  baseCurrency as SupportedCurrency,
                  target_currency as SupportedCurrency,
                  transactionDate
                );
                const convertedAmount = amountInBase * rateToTarget;
                totalConverted += convertedAmount;
                conversionDetails.push({
                  id: income.id,
                  type: income.type,
                  amount: incomeAmount,
                  currency: incomeCurrency,
                  transaction_date: transactionDate,
                  converted_amount: convertedAmount,
                  rate_used: rateToTarget,
                  rate_source: 'api'
                });
              } catch (finalError) {
                console.error(`[accounting] Final fallback failed for income ${income.id}, skipping`);
              }
            }
          }
        }
      }
    }

    res.json({
      target_currency,
      base_currency: baseCurrency,
      total_converted: totalConverted,
      conversion_details: conversionDetails
    });
  } catch (err) {
    console.error("[accounting] Convert incomes error", err);
    res.status(500).json({ error: "Failed to convert incomes" });
  }
}

// Convert expenses to target currency (similar to convertIncomesToCurrency)
export async function convertExpensesToCurrency(req: AuthRequest, res: Response) {
  const { target_currency, startDate, endDate } = req.body;

  if (!target_currency) {
    return res.status(400).json({ error: "target_currency is required" });
  }

  // Validate target_currency is a supported currency
  if (!SUPPORTED_CURRENCIES.includes(target_currency as SupportedCurrency)) {
    return res.status(400).json({ error: `Unsupported target_currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}` });
  }

  try {
    // Get tenant's base currency
    const [tenantRows] = await dbPool.query(
      "SELECT default_currency FROM tenants WHERE id = ?",
      [req.tenantId]
    );
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Query to fetch all expenses
    let query = `
      SELECT 
        e.id,
        e.expense_date as date,
        e.expense_date as transaction_date,
        e.amount,
        e.amount_base,
        e.currency,
        e.fx_rate_to_base,
        NULL as custom_rate
      FROM expenses e
      WHERE e.tenant_id = ?
    `;
    let params: any[] = [req.tenantId];

    if (startDate && endDate) {
      query += ` AND e.expense_date >= ? AND e.expense_date <= ?`;
      params.push(startDate, endDate);
    }

    const [expenses] = await dbPool.query(query, params);
    const expensesArray = expenses as any[];

    let totalConverted = 0;
    const conversionDetails: any[] = [];

    for (const expense of expensesArray) {
      const expenseCurrency = expense.currency || baseCurrency;
      const transactionDate = expense.transaction_date || expense.date;
      const expenseAmount = Number(expense.amount || 0);

      if (expenseAmount === 0) continue;

      let rateToTarget = 1;
      let rateSource: 'custom' | 'api' = 'api';

      if (expenseCurrency === target_currency) {
        totalConverted += expenseAmount;
        conversionDetails.push({
          id: expense.id,
          amount: expenseAmount,
          currency: expenseCurrency,
          transaction_date: transactionDate,
          converted_amount: expenseAmount,
          rate_used: 1,
          rate_source: 'api'
        });
        continue;
      }

      // Note: custom_rate is not yet implemented for expenses table
      // For now, always use API rates

      try {
        if (target_currency !== baseCurrency || expenseCurrency !== baseCurrency) {
          rateToTarget = await getOrFetchRate(
            expenseCurrency as SupportedCurrency,
            target_currency as SupportedCurrency,
            transactionDate
          );
        } else {
          rateToTarget = 1;
        }

        const convertedAmount = expenseAmount * rateToTarget;
        totalConverted += convertedAmount;

        conversionDetails.push({
          id: expense.id,
          amount: expenseAmount,
          currency: expenseCurrency,
          transaction_date: transactionDate,
          converted_amount: convertedAmount,
          rate_used: rateToTarget,
          rate_source: rateSource
        });
      } catch (rateError: any) {
        console.error(`[accounting] Failed to convert expense ${expense.id} (${expenseCurrency}->${target_currency} on ${transactionDate}):`, rateError.message);
        // Try converting through base currency
        try {
          if (expenseCurrency !== baseCurrency) {
            const rateToBase = await getOrFetchRate(
              expenseCurrency as SupportedCurrency,
              baseCurrency as SupportedCurrency,
              transactionDate
            );
            const amountInBase = expenseAmount * rateToBase;
            
            if (target_currency !== baseCurrency) {
              rateToTarget = await getOrFetchRate(
                baseCurrency as SupportedCurrency,
                target_currency as SupportedCurrency,
                transactionDate
              );
              const convertedAmount = amountInBase * rateToTarget;
              totalConverted += convertedAmount;
              conversionDetails.push({
                id: expense.id,
                amount: expenseAmount,
                currency: expenseCurrency,
                transaction_date: transactionDate,
                converted_amount: convertedAmount,
                rate_used: rateToTarget,
                rate_source: 'api'
              });
            } else {
              totalConverted += amountInBase;
              conversionDetails.push({
                id: expense.id,
                amount: expenseAmount,
                currency: expenseCurrency,
                transaction_date: transactionDate,
                converted_amount: amountInBase,
                rate_used: rateToBase,
                rate_source: 'api'
              });
            }
          }
        } catch (fallbackError: any) {
          console.error(`[accounting] Fallback conversion also failed for expense ${expense.id}:`, fallbackError.message);
          // Last resort: use amount_base if available
          if (expense.amount_base) {
            const amountInBase = Number(expense.amount_base);
            if (target_currency === baseCurrency) {
              totalConverted += amountInBase;
              conversionDetails.push({
                id: expense.id,
                amount: expenseAmount,
                currency: expenseCurrency,
                transaction_date: transactionDate,
                converted_amount: amountInBase,
                rate_used: expense.fx_rate_to_base || 1,
                rate_source: 'api'
              });
            } else {
              try {
                rateToTarget = await getOrFetchRate(
                  baseCurrency as SupportedCurrency,
                  target_currency as SupportedCurrency,
                  transactionDate
                );
                const convertedAmount = amountInBase * rateToTarget;
                totalConverted += convertedAmount;
                conversionDetails.push({
                  id: expense.id,
                  amount: expenseAmount,
                  currency: expenseCurrency,
                  transaction_date: transactionDate,
                  converted_amount: convertedAmount,
                  rate_used: rateToTarget,
                  rate_source: 'api'
                });
              } catch (finalError) {
                console.error(`[accounting] Final fallback failed for expense ${expense.id}, skipping`);
              }
            }
          }
        }
      }
    }

    res.json({
      target_currency,
      base_currency: baseCurrency,
      total_converted: totalConverted,
      conversion_details: conversionDetails
    });
  } catch (err) {
    console.error("[accounting] Convert expenses error", err);
    res.status(500).json({ error: "Failed to convert expenses" });
  }
}

