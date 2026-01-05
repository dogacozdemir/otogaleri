import { dbPool } from "../config/database";
import { getOrFetchRate } from "./fxCacheService";
import { SupportedCurrency } from "./currencyService";
import { MoneyService } from "./moneyService";
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";

// Supported currencies list for validation
const SUPPORTED_CURRENCIES: SupportedCurrency[] = ["TRY", "USD", "EUR", "GBP", "JPY"];

export interface Expense {
  id: number;
  tenant_id: number;
  branch_id: number | null;
  vehicle_id: number | null;
  description: string;
  category: string;
  amount: number;
  currency: string;
  fx_rate_to_base: number;
  amount_base: number;
  expense_date: string;
  created_at: string;
  branch_name?: string;
  maker?: string;
  model?: string;
}

export interface Income {
  id: number;
  type: 'vehicle_sale' | 'manual' | 'inventory_sale' | 'service_sale';
  date: string;
  income_date: string;
  amount: number;
  amount_base: number;
  description: string;
  category: string;
  customer_name: string | null;
  staff_name: string | null;
  branch_name: string | null;
  currency: string;
  fx_rate_to_base: number;
  transaction_date: string;
  custom_rate: number | null;
}

export interface IncomeConversionDetail {
  id: number;
  type: string;
  amount: number;
  currency: string;
  transaction_date: string;
  converted_amount: number;
  rate_used: number;
  rate_source: 'custom' | 'api';
}

export interface ExpenseConversionDetail {
  id: number;
  amount: number;
  currency: string;
  transaction_date: string;
  converted_amount: number;
  rate_used: number;
  rate_source: 'custom' | 'api';
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ExpenseListParams extends PaginationParams {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface IncomeListParams extends PaginationParams {
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface YearlyIncomeExpenseData {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

export interface DateRangeIncomeExpenseData {
  date: string;
  income: number;
  expense: number;
  net_income: number;
}

export interface CreateIncomeParams {
  description: string;
  category?: string;
  amount: number;
  currency?: string;
  income_date: string;
  branch_id?: number | null;
  customer_id?: number | null;
  vehicle_id?: number | null;
}

export interface CreateExpenseParams {
  description: string;
  category?: string;
  amount: number;
  currency?: string;
  expense_date: string;
  branch_id?: number | null;
  vehicle_id?: number | null;
}

export interface UpdateIncomeParams extends Partial<CreateIncomeParams> {
  id: number;
}

export interface UpdateExpenseParams extends Partial<CreateExpenseParams> {
  id: number;
}

export interface CurrencyConversionResult {
  target_currency: string;
  base_currency: string;
  total_converted: number;
  conversion_details: IncomeConversionDetail[] | ExpenseConversionDetail[];
}

/**
 * AccountingService - Handles all accounting business logic
 * All methods require tenantId for multi-tenancy safety
 */
export class AccountingService {
  /**
   * Get list of expenses with pagination and filters
   */
  static async getExpensesList(
    tenantQuery: TenantAwareQuery,
    params: ExpenseListParams
  ): Promise<PaginatedResponse<Expense>> {
    const conditions: Record<string, any> = {};
    
    // Date filtering
    if (params.startDate && params.endDate) {
      // Use raw query for date range
      const query = `
        SELECT e.*, b.name as branch_name, v.maker, v.model
        FROM expenses e 
        LEFT JOIN branches b ON e.branch_id = b.id
        LEFT JOIN vehicles v ON e.vehicle_id = v.id
        WHERE e.tenant_id = ? AND e.expense_date >= ? AND e.expense_date <= ?
      `;
      const countQuery = `SELECT COUNT(*) as total FROM expenses e WHERE e.tenant_id = ? AND e.expense_date >= ? AND e.expense_date <= ?`;
      
      let searchConditions = '';
      const tenantId = tenantQuery.getTenantId();
      const queryParams: any[] = [tenantId, params.startDate, params.endDate];
      const countParams: any[] = [tenantId, params.startDate, params.endDate];

      // Search filtering
      if (params.search) {
        searchConditions = ` AND (e.description LIKE ? OR e.category LIKE ?)`;
        const searchParam = `%${params.search}%`;
        queryParams.push(searchParam, searchParam);
        countParams.push(searchParam, searchParam);
      }

      // Category filtering
      if (params.category && params.category !== "all") {
        searchConditions += ` AND e.category = ?`;
        queryParams.push(params.category);
        countParams.push(params.category);
      }

      const finalQuery = query + searchConditions + ` ORDER BY e.expense_date DESC LIMIT ? OFFSET ?`;
      queryParams.push(params.limit, params.offset);

      const [expenses] = await tenantQuery.query(finalQuery, queryParams);
      const [countResult] = await tenantQuery.query(countQuery + searchConditions, countParams);
      const total = (countResult as any[])[0]?.total || 0;

      return {
        data: expenses as Expense[],
        pagination: {
          total,
          page: params.page,
          limit: params.limit,
          totalPages: Math.ceil(total / params.limit),
        },
      };
    }

    // Use TenantAwareQuery methods for simpler queries
    if (params.search) {
      conditions.description = { like: `%${params.search}%` };
    }
    if (params.category && params.category !== "all") {
      conditions.category = params.category;
    }

    // For complex queries with JOINs, use raw query
    const query = `
      SELECT e.*, b.name as branch_name, v.maker, v.model
      FROM expenses e 
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      WHERE e.tenant_id = ?
    `;
    const countQuery = `SELECT COUNT(*) as total FROM expenses e WHERE e.tenant_id = ?`;
    
    const queryParams: any[] = [];
    const countParams: any[] = [];

    if (params.search) {
      queryParams.push(`%${params.search}%`, `%${params.search}%`);
      countParams.push(`%${params.search}%`, `%${params.search}%`);
    }
    if (params.category && params.category !== "all") {
      queryParams.push(params.category);
      countParams.push(params.category);
    }

    const finalQuery = query + (params.search ? ` AND (e.description LIKE ? OR e.category LIKE ?)` : '') + 
      (params.category && params.category !== "all" ? ` AND e.category = ?` : '') + 
      ` ORDER BY e.expense_date DESC LIMIT ? OFFSET ?`;
    queryParams.push(params.limit, params.offset);

    const [expenses] = await tenantQuery.query(finalQuery, queryParams);
    const [countResult] = await tenantQuery.query(
      countQuery + (params.search ? ` AND (e.description LIKE ? OR e.category LIKE ?)` : '') + 
      (params.category && params.category !== "all" ? ` AND e.category = ?` : ''),
      countParams
    );
    const total = (countResult as any[])[0]?.total || 0;

    return {
      data: expenses as Expense[],
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  /**
   * Get list of incomes (vehicle sales + manual income + inventory sales + service sales)
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async getIncomeList(
    tenantQuery: TenantAwareQuery,
    params: IncomeListParams
  ): Promise<PaginatedResponse<Income>> {
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
    const tenantId = tenantQuery.getTenantId();
    let queryParams: any[] = [tenantId];

    // Date filtering
    if (params.startDate && params.endDate) {
      query += ` AND vs.sale_date >= ? AND vs.sale_date <= ?`;
      queryParams.push(params.startDate, params.endDate);
    }

    // Search filtering
    if (params.search) {
      query += ` AND (vs.customer_name LIKE ? OR v.maker LIKE ? OR v.model LIKE ?)`;
      const searchParam = `%${params.search}%`;
      queryParams.push(searchParam, searchParam, searchParam);
    }

    // Manual income query
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
      WHERE i.tenant_id = ? AND i.vehicle_id IS NULL
    `;
    queryParams.push(tenantId);
    // Manual income params
    if (params.startDate && params.endDate) {
      query += ` AND i.income_date >= ? AND i.income_date <= ?`;
      queryParams.push(params.startDate, params.endDate);
    }
    if (params.search) {
      query += ` AND (i.description LIKE ? OR i.category LIKE ?)`;
      const searchParam = `%${params.search}%`;
      queryParams.push(searchParam, searchParam);
    }
    
    // Inventory sales
    if (params.startDate && params.endDate) {
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
      queryParams.push(tenantId, params.startDate, params.endDate);
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
      queryParams.push(tenantId);
    }
    
    // Service sales
    if (params.startDate && params.endDate) {
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
      queryParams.push(tenantId, params.startDate, params.endDate);
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
      queryParams.push(tenantId);
    }

    query += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
    queryParams.push(params.limit, params.offset);

    // Count query
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
    let countParams: any[] = [tenantId, tenantId, tenantId, tenantId];

    if (params.startDate && params.endDate) {
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
      countParams = [
        tenantId, params.startDate, params.endDate,
        tenantId, params.startDate, params.endDate,
        tenantId, params.startDate, params.endDate,
        tenantId, params.startDate, params.endDate
      ];
    }

    // Use tenantQuery.query() - it will enforce tenant_id automatically via strict mode
    const [incomes] = await tenantQuery.query(query, queryParams);
    const [countResult] = await tenantQuery.query(countQuery, countParams);
    const total = (countResult as any[])[0]?.count || 0;

    return {
      data: incomes as Income[],
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  /**
   * Get yearly income and expense data (last 12 months)
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async getYearlyIncomeExpense(
    tenantQuery: TenantAwareQuery
  ): Promise<YearlyIncomeExpenseData[]> {
    // Last 12 months income (vehicle sales + income + inventory sales + service sales)
    const [incomeData] = await tenantQuery.query(
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
      []
    );

    // Last 12 months expenses (expenses + vehicle_costs)
    const [expenseData] = await tenantQuery.query(
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
      []
    );

    // Generate all months
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7);
      months.push(monthStr);
    }

    // Combine data
    const incomeMap = new Map((incomeData as any[]).map((item) => [item.month, item.income]));
    const expenseMap = new Map((expenseData as any[]).map((item) => [item.month, item.expense]));

    return months.map((month) => {
      const income = Number(incomeMap.get(month) || 0);
      const expense = Number(expenseMap.get(month) || 0);
      return {
        month,
        income,
        expense,
        profit: income - expense,
      };
    });
  }

  /**
   * Get date range income and expense data
   */
  static async getDateRangeIncomeExpense(
    tenantQuery: TenantAwareQuery,
    startDate?: string,
    endDate?: string
  ): Promise<DateRangeIncomeExpenseData[]> {
    const queryStartDate = startDate || "2020-01-01";
    const queryEndDate = endDate || new Date().toISOString().split("T")[0];
    const tenantId = tenantQuery.getTenantId();

    // Income data
    const [incomeData] = await tenantQuery.query(
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
        tenantId, queryStartDate, queryEndDate,
        tenantId, queryStartDate, queryEndDate,
        tenantId, queryStartDate, queryEndDate,
        tenantId, queryStartDate, queryEndDate
      ]
    );

    // Expense data
    const [expenseData] = await tenantQuery.query(
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
      [tenantId, queryStartDate, queryEndDate, tenantId, queryStartDate, queryEndDate]
    );

    // Combine data
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

    return Array.from(dateMap.values()).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

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
   * Create a new income entry
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async createIncome(
    tenantQuery: TenantAwareQuery,
    params: CreateIncomeParams
  ): Promise<any> {
    const baseCurrency = await this.getBaseCurrency(tenantQuery);
    const incomeCurrency = params.currency || baseCurrency;

    let fxRate = 1;
    if (incomeCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        tenantQuery,
        incomeCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        params.income_date
      );
    }

    // Use MoneyService for precise currency conversion
    const amountBase = MoneyService.convertCurrency(
      params.amount,
      incomeCurrency as SupportedCurrency,
      baseCurrency as SupportedCurrency,
      fxRate
    );

    const incomeId = await tenantQuery.insert('income', {
      branch_id: params.branch_id || null,
      vehicle_id: params.vehicle_id || null,
      customer_id: params.customer_id || null,
      description: params.description,
      category: params.category || "Other",
      amount: params.amount,
      currency: incomeCurrency,
      fx_rate_to_base: fxRate,
      amount_base: amountBase,
      income_date: params.income_date,
    });

    const [rows] = await tenantQuery.query("SELECT * FROM income WHERE id = ?", [incomeId]);
    return (rows as any[])[0];
  }

  /**
   * Create a new expense entry
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async createExpense(
    tenantQuery: TenantAwareQuery,
    params: CreateExpenseParams
  ): Promise<any> {
    const baseCurrency = await this.getBaseCurrency(tenantQuery);
    const expenseCurrency = params.currency || baseCurrency;

    let fxRate = 1;
    if (expenseCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        tenantQuery,
        expenseCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        params.expense_date
      );
    }

    // Use MoneyService for precise currency conversion
    const amountBase = MoneyService.convertCurrency(
      params.amount,
      expenseCurrency as SupportedCurrency,
      baseCurrency as SupportedCurrency,
      fxRate
    );

    const expenseId = await tenantQuery.insert('expenses', {
      branch_id: params.branch_id || null,
      vehicle_id: params.vehicle_id || null,
      description: params.description,
      category: params.category || "Other",
      amount: params.amount,
      currency: expenseCurrency,
      fx_rate_to_base: fxRate,
      amount_base: amountBase,
      expense_date: params.expense_date,
    });

    const [rows] = await tenantQuery.query("SELECT * FROM expenses WHERE id = ?", [expenseId]);
    return (rows as any[])[0];
  }

  /**
   * Update an existing expense
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async updateExpense(
    tenantQuery: TenantAwareQuery,
    params: UpdateExpenseParams
  ): Promise<any> {
    // Check if expense exists and belongs to tenant
    const existing = await tenantQuery.selectOne('expenses', { id: params.id });
    if (!existing) {
      throw new Error("Expense not found");
    }

    const existingExpense = existing as any;
    const baseCurrency = await this.getBaseCurrency(tenantQuery);
    const expenseCurrency = params.currency || existingExpense.currency || baseCurrency;

    let fxRate = 1;
    if (expenseCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        tenantQuery,
        expenseCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        params.expense_date || existingExpense.expense_date
      );
    }

    const amount = params.amount !== undefined ? params.amount : existingExpense.amount;
    // Use MoneyService for precise currency conversion
    const amountBase = MoneyService.convertCurrency(
      amount,
      expenseCurrency as SupportedCurrency,
      baseCurrency as SupportedCurrency,
      fxRate
    );

    await tenantQuery.update('expenses', {
      description: params.description || existingExpense.description,
      category: params.category || existingExpense.category,
      amount: amount,
      currency: expenseCurrency,
      fx_rate_to_base: fxRate,
      amount_base: amountBase,
      expense_date: params.expense_date || existingExpense.expense_date,
      branch_id: params.branch_id !== undefined ? params.branch_id : existingExpense.branch_id,
      vehicle_id: params.vehicle_id !== undefined ? params.vehicle_id : existingExpense.vehicle_id,
    }, { id: params.id });

    const [rows] = await tenantQuery.query("SELECT * FROM expenses WHERE id = ?", [params.id]);
    return (rows as any[])[0];
  }

  /**
   * Delete an expense
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async deleteExpense(tenantQuery: TenantAwareQuery, expenseId: number): Promise<void> {
    const affectedRows = await tenantQuery.delete('expenses', { id: expenseId });
    if (affectedRows === 0) {
      throw new Error("Expense not found");
    }
  }

  /**
   * Update an existing income
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async updateIncome(
    tenantQuery: TenantAwareQuery,
    params: UpdateIncomeParams
  ): Promise<any> {
    // Check if income exists and belongs to tenant
    const existing = await tenantQuery.selectOne('income', { id: params.id });
    if (!existing) {
      throw new Error("Income not found");
    }

    const existingIncome = existing as any;
    const baseCurrency = await this.getBaseCurrency(tenantQuery);
    const incomeCurrency = params.currency || existingIncome.currency || baseCurrency;

    let fxRate = 1;
    if (incomeCurrency !== baseCurrency) {
      fxRate = await getOrFetchRate(
        tenantQuery,
        incomeCurrency as SupportedCurrency,
        baseCurrency as SupportedCurrency,
        params.income_date || existingIncome.income_date
      );
    }

    const amount = params.amount !== undefined ? params.amount : existingIncome.amount;
    // Use MoneyService for precise currency conversion
    const amountBase = MoneyService.convertCurrency(
      amount,
      incomeCurrency as SupportedCurrency,
      baseCurrency as SupportedCurrency,
      fxRate
    );

    await tenantQuery.update('income', {
      description: params.description || existingIncome.description,
      category: params.category || existingIncome.category,
      amount: amount,
      currency: incomeCurrency,
      fx_rate_to_base: fxRate,
      amount_base: amountBase,
      income_date: params.income_date || existingIncome.income_date,
      branch_id: params.branch_id !== undefined ? params.branch_id : existingIncome.branch_id,
      customer_id: params.customer_id !== undefined ? params.customer_id : existingIncome.customer_id,
      vehicle_id: params.vehicle_id !== undefined ? params.vehicle_id : existingIncome.vehicle_id,
    }, { id: params.id });

    const [rows] = await tenantQuery.query("SELECT * FROM income WHERE id = ?", [params.id]);
    return (rows as any[])[0];
  }

  /**
   * Delete an income
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async deleteIncome(tenantQuery: TenantAwareQuery, incomeId: number): Promise<void> {
    const affectedRows = await tenantQuery.delete('income', { id: incomeId });
    if (affectedRows === 0) {
      throw new Error("Income not found");
    }
  }

  /**
   * Convert incomes to target currency
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async convertIncomesToCurrency(
    tenantQuery: TenantAwareQuery,
    targetCurrency: string,
    startDate?: string,
    endDate?: string
  ): Promise<CurrencyConversionResult> {
    if (!SUPPORTED_CURRENCIES.includes(targetCurrency as SupportedCurrency)) {
      throw new Error(`Unsupported target_currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`);
    }

    const baseCurrency = await this.getBaseCurrency(tenantQuery);

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
    const tenantId = tenantQuery.getTenantId();
    let params: any[] = [tenantId];

    if (startDate && endDate) {
      query += ` AND vs.sale_date >= ? AND vs.sale_date <= ?`;
      params.push(startDate, endDate);
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
      WHERE i.tenant_id = ? AND i.vehicle_id IS NULL
    `;
    params.push(tenantId);
    if (startDate && endDate) {
      query += ` AND i.income_date >= ? AND i.income_date <= ?`;
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
      params.push(tenantId, startDate, endDate);
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
      params.push(tenantId);
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
      params.push(tenantId, startDate, endDate);
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
      params.push(tenantId);
    }

    // Use tenantQuery.query() - it will enforce tenant_id automatically via strict mode
    const [incomes] = await tenantQuery.query(query, params);
    const incomeArray = incomes as any[];

    const convertedAmounts: number[] = [];
    const conversionDetails: IncomeConversionDetail[] = [];

    for (const income of incomeArray) {
      const incomeCurrency = (income.currency || baseCurrency) as SupportedCurrency;
      const transactionDate = income.transaction_date || income.income_date || income.date;
      const incomeAmount = Number(income.amount || 0);

      if (MoneyService.isZero(incomeAmount, incomeCurrency)) continue;

      if (incomeCurrency === targetCurrency) {
        convertedAmounts.push(incomeAmount);
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

      try {
        let rateToTarget = 1;
        if (targetCurrency !== baseCurrency || incomeCurrency !== baseCurrency) {
          rateToTarget = await getOrFetchRate(
            tenantQuery,
            incomeCurrency,
            targetCurrency as SupportedCurrency,
            transactionDate
          );
        }

        // Use MoneyService for precise currency conversion
        const convertedAmount = MoneyService.convertCurrency(
          incomeAmount,
          incomeCurrency,
          targetCurrency as SupportedCurrency,
          rateToTarget
        );
        convertedAmounts.push(convertedAmount);

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
      } catch (rateError: any) {
        console.error(`[accounting] Failed to convert income ${income.id} (${incomeCurrency}->${targetCurrency} on ${transactionDate}):`, rateError.message);
        // Try converting through base currency
        try {
          if (incomeCurrency !== baseCurrency) {
            const rateToBase = await getOrFetchRate(
              tenantQuery,
              incomeCurrency as SupportedCurrency,
              baseCurrency as SupportedCurrency,
              transactionDate
            );
            // Use MoneyService for precise conversion through base currency
            const amountInBase = MoneyService.convertCurrency(
              incomeAmount,
              incomeCurrency,
              baseCurrency as SupportedCurrency,
              rateToBase
            );
            
            if (targetCurrency !== baseCurrency) {
              const rateToTarget = await getOrFetchRate(
                tenantQuery,
                baseCurrency as SupportedCurrency,
                targetCurrency as SupportedCurrency,
                transactionDate
              );
              const convertedAmount = MoneyService.convertCurrency(
                amountInBase,
                baseCurrency as SupportedCurrency,
                targetCurrency as SupportedCurrency,
                rateToTarget
              );
              convertedAmounts.push(convertedAmount);
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
              convertedAmounts.push(amountInBase);
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
          // Last resort: use amount_base if available
          if (income.amount_base) {
            const amountInBase = Number(income.amount_base);
            if (targetCurrency === baseCurrency) {
              convertedAmounts.push(amountInBase);
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
                const finalRate = await getOrFetchRate(
                  tenantQuery,
                  baseCurrency as SupportedCurrency,
                  targetCurrency as SupportedCurrency,
                  transactionDate
                );
                // Use MoneyService for precise conversion
                const convertedAmount = MoneyService.convertCurrency(
                  amountInBase,
                  baseCurrency as SupportedCurrency,
                  targetCurrency as SupportedCurrency,
                  finalRate
                );
                convertedAmounts.push(convertedAmount);
                conversionDetails.push({
                  id: income.id,
                  type: income.type,
                  amount: incomeAmount,
                  currency: incomeCurrency,
                  transaction_date: transactionDate,
                  converted_amount: convertedAmount,
                  rate_used: finalRate,
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

    // Use MoneyService to sum all converted amounts with precision
    const totalConverted = MoneyService.sum(convertedAmounts, targetCurrency as SupportedCurrency);

    return {
      target_currency: targetCurrency,
      base_currency: baseCurrency,
      total_converted: totalConverted,
      conversion_details: conversionDetails
    };
  }

  /**
   * Convert expenses to target currency
   * Uses TenantAwareQuery for automatic tenant_id enforcement
   */
  static async convertExpensesToCurrency(
    tenantQuery: TenantAwareQuery,
    targetCurrency: string,
    startDate?: string,
    endDate?: string
  ): Promise<CurrencyConversionResult> {
    if (!SUPPORTED_CURRENCIES.includes(targetCurrency as SupportedCurrency)) {
      throw new Error(`Unsupported target_currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`);
    }

    const baseCurrency = await this.getBaseCurrency(tenantQuery);

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
    const tenantId = tenantQuery.getTenantId();
    let params: any[] = [tenantId];

    if (startDate && endDate) {
      query += ` AND e.expense_date >= ? AND e.expense_date <= ?`;
      params.push(startDate, endDate);
    }

    // Use tenantQuery.query() - it will enforce tenant_id automatically via strict mode
    const [expenses] = await tenantQuery.query(query, params);
    const expensesArray = expenses as any[];

    const convertedAmounts: number[] = [];
    const conversionDetails: ExpenseConversionDetail[] = [];

    for (const expense of expensesArray) {
      const expenseCurrency = (expense.currency || baseCurrency) as SupportedCurrency;
      const transactionDate = expense.transaction_date || expense.date;
      const expenseAmount = Number(expense.amount || 0);

      if (MoneyService.isZero(expenseAmount, expenseCurrency)) continue;

      if (expenseCurrency === targetCurrency) {
        convertedAmounts.push(expenseAmount);
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

      try {
        let rateToTarget = 1;
        if (targetCurrency !== baseCurrency || expenseCurrency !== baseCurrency) {
          rateToTarget = await getOrFetchRate(
            tenantQuery,
            expenseCurrency,
            targetCurrency as SupportedCurrency,
            transactionDate
          );
        }

        // Use MoneyService for precise currency conversion
        const convertedAmount = MoneyService.convertCurrency(
          expenseAmount,
          expenseCurrency,
          targetCurrency as SupportedCurrency,
          rateToTarget
        );
        convertedAmounts.push(convertedAmount);

        conversionDetails.push({
          id: expense.id,
          amount: expenseAmount,
          currency: expenseCurrency,
          transaction_date: transactionDate,
          converted_amount: convertedAmount,
          rate_used: rateToTarget,
          rate_source: 'api'
        });
      } catch (rateError: any) {
        console.error(`[accounting] Failed to convert expense ${expense.id} (${expenseCurrency}->${targetCurrency} on ${transactionDate}):`, rateError.message);
        // Try converting through base currency
        try {
          if (expenseCurrency !== baseCurrency) {
            const rateToBase = await getOrFetchRate(
              tenantQuery,
              expenseCurrency as SupportedCurrency,
              baseCurrency as SupportedCurrency,
              transactionDate
            );
            // Use MoneyService for precise conversion through base currency
            const amountInBase = MoneyService.convertCurrency(
              expenseAmount,
              expenseCurrency,
              baseCurrency as SupportedCurrency,
              rateToBase
            );
            
            if (targetCurrency !== baseCurrency) {
              const rateToTarget = await getOrFetchRate(
                tenantQuery,
                baseCurrency as SupportedCurrency,
                targetCurrency as SupportedCurrency,
                transactionDate
              );
              const convertedAmount = MoneyService.convertCurrency(
                amountInBase,
                baseCurrency as SupportedCurrency,
                targetCurrency as SupportedCurrency,
                rateToTarget
              );
              convertedAmounts.push(convertedAmount);
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
              convertedAmounts.push(amountInBase);
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
            if (targetCurrency === baseCurrency) {
              convertedAmounts.push(amountInBase);
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
                const rateToTarget = await getOrFetchRate(
                  tenantQuery,
                  baseCurrency as SupportedCurrency,
                  targetCurrency as SupportedCurrency,
                  transactionDate
                );
                // Use MoneyService for precise conversion
                const convertedAmount = MoneyService.convertCurrency(
                  amountInBase,
                  baseCurrency as SupportedCurrency,
                  targetCurrency as SupportedCurrency,
                  rateToTarget
                );
                convertedAmounts.push(convertedAmount);
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

    // Use MoneyService to sum all converted amounts with precision
    const totalConverted = MoneyService.sum(convertedAmounts, targetCurrency as SupportedCurrency);

    return {
      target_currency: targetCurrency,
      base_currency: baseCurrency,
      total_converted: totalConverted,
      conversion_details: conversionDetails
    };
  }
}

