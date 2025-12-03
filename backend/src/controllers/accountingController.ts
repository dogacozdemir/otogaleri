import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

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
        vs.sale_amount * vs.sale_fx_rate_to_base as amount,
        vs.sale_amount * vs.sale_fx_rate_to_base as amount_base,
        CONCAT('Araç Satışı: ', COALESCE(v.maker, ''), ' ', COALESCE(v.model, '')) as description,
        'Vehicle Sale' as category,
        vs.customer_name,
        s.name as staff_name,
        b.name as branch_name,
        vs.sale_currency as currency
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

    query += `
      UNION ALL
      SELECT 
        'manual' as type,
        i.id,
        i.income_date as date,
        i.income_date,
        i.amount_base as amount,
        i.amount_base,
        i.description,
        i.category,
        c.name as customer_name,
        NULL as staff_name,
        b.name as branch_name,
        i.currency
      FROM income i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN branches b ON i.branch_id = b.id
      WHERE i.tenant_id = ? AND i.vehicle_id IS NULL
    `;
    params.push(req.tenantId);

    if (startDate && endDate) {
      query += ` AND i.income_date >= ? AND i.income_date <= ?`;
      params.push(startDate, endDate);
    }

    if (search) {
      query += ` AND (i.description LIKE ? OR i.category LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    query += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // Count query - ayrı ayrı say
    let countQuery1 = `SELECT COUNT(*) as count FROM vehicle_sales vs WHERE vs.tenant_id = ?`;
    let countQuery2 = `SELECT COUNT(*) as count FROM income i WHERE i.tenant_id = ? AND i.vehicle_id IS NULL`;
    let countParams1: any[] = [req.tenantId];
    let countParams2: any[] = [req.tenantId];

    if (startDate && endDate) {
      countQuery1 += ` AND vs.sale_date >= ? AND vs.sale_date <= ?`;
      countParams1.push(startDate, endDate);
      countQuery2 += ` AND i.income_date >= ? AND i.income_date <= ?`;
      countParams2.push(startDate, endDate);
    }
    if (search) {
      countQuery1 += ` AND (vs.customer_name LIKE ? OR EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vs.vehicle_id AND (v.maker LIKE ? OR v.model LIKE ?)))`;
      const searchParam = `%${search}%`;
      countParams1.push(searchParam, searchParam, searchParam);
      countQuery2 += ` AND (i.description LIKE ? OR i.category LIKE ?)`;
      countParams2.push(searchParam, searchParam);
    }

    const [incomes] = await dbPool.query(query, params);
    const [countResult1] = await dbPool.query(countQuery1, countParams1);
    const [countResult2] = await dbPool.query(countQuery2, countParams2);
    const total = ((countResult1 as any[])[0]?.count || 0) + ((countResult2 as any[])[0]?.count || 0);

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
    // Son 12 ayın gelirleri (vehicle sales + income)
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
       ) as combined
       GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
       ORDER BY month`,
      [req.tenantId, req.tenantId]
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

    // Gelir verileri
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
       ) as combined
       GROUP BY DATE(transaction_date)
       ORDER BY date`,
      [req.tenantId, queryStartDate, queryEndDate, req.tenantId, queryStartDate, queryEndDate]
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

