import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { AccountingService } from "../services/accountingService";
import "../middleware/tenantQuery"; // Import for type augmentation
import {
  CreateIncomeSchema,
  UpdateIncomeSchema,
  CreateExpenseSchema,
  UpdateExpenseSchema,
  IncomeIdSchema,
  ExpenseIdSchema,
  CurrencyConversionSchema,
} from "../validators/accountingValidators";
import { validate } from "../middleware/validation";

/**
 * Accounting Controller - Thin layer that handles HTTP requests/responses
 * All business logic is delegated to AccountingService
 * Uses TenantAwareQuery for automatic tenant isolation
 * Uses Zod validation for input sanitization and XSS protection
 */

// Validation middleware exports
export const validateCreateIncome = validate(CreateIncomeSchema, "body");
export const validateUpdateIncome = validate(UpdateIncomeSchema, "body");
export const validateCreateExpense = validate(CreateExpenseSchema, "body");
export const validateUpdateExpense = validate(UpdateExpenseSchema, "body");
export const validateIncomeId = validate(IncomeIdSchema, "params");
export const validateExpenseId = validate(ExpenseIdSchema, "params");
export const validateCurrencyConversion = validate(CurrencyConversionSchema, "body");

// Get expenses list
export async function getExpensesList(req: AuthRequest, res: Response) {
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }

    const { page = 1, limit = 10, search = "", category = "", startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await AccountingService.getExpensesList(req.tenantQuery, {
      page: Number(page),
      limit: Number(limit),
      offset,
      search: search as string,
      category: category as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      expenses: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("[accounting] Expenses list error", err);
    res.status(500).json({ error: "Failed to get expenses list" });
  }
}

// Get income list
export async function getIncomeList(req: AuthRequest, res: Response) {
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }

    const { page = 1, limit = 10, search = "", startDate, endDate } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await AccountingService.getIncomeList(req.tenantQuery, {
      page: Number(page),
      limit: Number(limit),
      offset,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      incomes: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("[accounting] Income list error", err);
    res.status(500).json({ error: "Failed to get income list" });
  }
}

// Get yearly income and expense
export async function getYearlyIncomeExpense(req: AuthRequest, res: Response) {
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const data = await AccountingService.getYearlyIncomeExpense(req.tenantQuery);
    res.json(data);
  } catch (err) {
    console.error("[accounting] Yearly income expense error", err);
    res.status(500).json({ error: "Failed to get yearly income expense" });
  }
}

// Get date range income and expense
export async function getDateRangeIncomeExpense(req: AuthRequest, res: Response) {
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const { startDate, endDate } = req.query;
    const data = await AccountingService.getDateRangeIncomeExpense(
      req.tenantQuery,
      startDate as string,
      endDate as string
    );
    res.json(data);
  } catch (err) {
    console.error("[accounting] Date range income expense error", err);
    res.status(500).json({ error: "Failed to get date range income expense" });
  }
}

// Add income
// Note: validateCreateIncome middleware should be applied in routes
export async function addIncome(req: AuthRequest, res: Response) {
  // req.body is already validated and sanitized by validateCreateIncome middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const income = await AccountingService.createIncome(req.tenantQuery, req.body);
    res.status(201).json(income);
  } catch (err) {
    console.error("[accounting] Add income error", err);
    res.status(500).json({ error: "Failed to add income" });
  }
}

// Add expense
// Note: validateCreateExpense middleware should be applied in routes
export async function addExpense(req: AuthRequest, res: Response) {
  // req.body is already validated and sanitized by validateCreateExpense middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const expense = await AccountingService.createExpense(req.tenantQuery, req.body);
    res.status(201).json(expense);
  } catch (err) {
    console.error("[accounting] Add expense error", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
}

// Update expense
// Note: validateUpdateExpense and validateExpenseId middleware should be applied in routes
export async function updateExpense(req: AuthRequest, res: Response) {
  // req.body and req.params are already validated and sanitized
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const expense = await AccountingService.updateExpense(req.tenantQuery, {
      id: req.params.id as unknown as number,
      ...req.body,
    });
    res.json(expense);
  } catch (err: any) {
    if (err.message === "Expense not found") {
      return res.status(404).json({ error: err.message });
    }
    console.error("[accounting] Update expense error", err);
    res.status(500).json({ error: "Failed to update expense" });
  }
}

// Delete expense
// Note: validateExpenseId middleware should be applied in routes
export async function deleteExpense(req: AuthRequest, res: Response) {
  // req.params.id is already validated by validateExpenseId middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    await AccountingService.deleteExpense(req.tenantQuery, req.params.id as unknown as number);
    res.json({ message: "Expense deleted successfully" });
  } catch (err: any) {
    if (err.message === "Expense not found") {
      return res.status(404).json({ error: err.message });
    }
    console.error("[accounting] Delete expense error", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
}

// Update income
// Note: validateUpdateIncome and validateIncomeId middleware should be applied in routes
export async function updateIncome(req: AuthRequest, res: Response) {
  // req.body and req.params are already validated and sanitized
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const income = await AccountingService.updateIncome(req.tenantQuery, {
      id: req.params.id as unknown as number,
      ...req.body,
    });
    res.json(income);
  } catch (err: any) {
    if (err.message === "Income not found") {
      return res.status(404).json({ error: err.message });
    }
    console.error("[accounting] Update income error", err);
    res.status(500).json({ error: "Failed to update income" });
  }
}

// Delete income
// Note: validateIncomeId middleware should be applied in routes
export async function deleteIncome(req: AuthRequest, res: Response) {
  // req.params.id is already validated by validateIncomeId middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    await AccountingService.deleteIncome(req.tenantQuery, req.params.id as unknown as number);
    res.json({ message: "Income deleted successfully" });
  } catch (err: any) {
    if (err.message === "Income not found") {
      return res.status(404).json({ error: err.message });
    }
    console.error("[accounting] Delete income error", err);
    res.status(500).json({ error: "Failed to delete income" });
  }
}

// Convert incomes to target currency
// Note: validateCurrencyConversion middleware should be applied in routes
export async function convertIncomesToCurrency(req: AuthRequest, res: Response) {
  // req.body is already validated by validateCurrencyConversion middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    
    // Validate target_currency is provided
    if (!req.body.target_currency) {
      return res.status(400).json({ error: "target_currency is required" });
    }
    
    const result = await AccountingService.convertIncomesToCurrency(
      req.tenantQuery,
      req.body.target_currency,
      req.body.startDate,
      req.body.endDate
    );
    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes("Unsupported target_currency")) {
      return res.status(400).json({ error: err.message });
    }
    console.error("[accounting] Convert incomes error", err);
    // Return more detailed error message for debugging
    const errorMessage = err.message || "Failed to convert incomes";
    res.status(500).json({ error: errorMessage });
  }
}

// Convert expenses to target currency
// Note: validateCurrencyConversion middleware should be applied in routes
export async function convertExpensesToCurrency(req: AuthRequest, res: Response) {
  // req.body is already validated by validateCurrencyConversion middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const result = await AccountingService.convertExpensesToCurrency(
      req.tenantQuery,
      req.body.target_currency,
      req.body.startDate,
      req.body.endDate
    );
    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes("Unsupported target_currency")) {
      return res.status(400).json({ error: err.message });
    }
    console.error("[accounting] Convert expenses error", err);
    res.status(500).json({ error: "Failed to convert expenses" });
  }
}
