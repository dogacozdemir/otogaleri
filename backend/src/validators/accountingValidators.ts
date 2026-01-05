import { z } from "zod";

/**
 * Accounting Validators - Zod schemas for accounting-related endpoints
 * Includes XSS protection via trim and sanitization
 */

// Helper function to sanitize strings (trim and escape HTML)
const sanitizeString = (val: string | undefined): string | undefined => {
  if (!val) return val;
  return val.trim().replace(/[<>]/g, ""); // Basic XSS protection
};

// Custom string schema with sanitization
const sanitizedString = z.string().transform(sanitizeString).optional().nullable();
const sanitizedRequiredString = z.string().min(1).transform(sanitizeString);

// Supported currencies
const supportedCurrencies = z.enum(["TRY", "USD", "EUR", "GBP", "JPY"]);

/**
 * Create Income Schema
 */
export const CreateIncomeSchema = z.object({
  description: sanitizedRequiredString,
  category: sanitizedString,
  amount: z.number().positive(),
  currency: supportedCurrencies.optional(),
  income_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branch_id: z.number().int().positive().optional().nullable(),
  customer_id: z.number().int().positive().optional().nullable(),
  vehicle_id: z.number().int().positive().optional().nullable(),
}).strict();

/**
 * Update Income Schema
 */
export const UpdateIncomeSchema = z.object({
  id: z.number().int().positive(),
  description: sanitizedRequiredString.optional(),
  category: sanitizedString,
  amount: z.number().positive().optional(),
  currency: supportedCurrencies.optional(),
  income_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  branch_id: z.number().int().positive().optional().nullable(),
  customer_id: z.number().int().positive().optional().nullable(),
  vehicle_id: z.number().int().positive().optional().nullable(),
}).strict();

/**
 * Create Expense Schema
 */
export const CreateExpenseSchema = z.object({
  description: sanitizedRequiredString,
  category: sanitizedString,
  amount: z.number().positive(),
  currency: supportedCurrencies.optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branch_id: z.number().int().positive().optional().nullable(),
  vehicle_id: z.number().int().positive().optional().nullable(),
}).strict();

/**
 * Update Expense Schema
 */
export const UpdateExpenseSchema = z.object({
  id: z.number().int().positive(),
  description: sanitizedRequiredString.optional(),
  category: sanitizedString,
  amount: z.number().positive().optional(),
  currency: supportedCurrencies.optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  branch_id: z.number().int().positive().optional().nullable(),
  vehicle_id: z.number().int().positive().optional().nullable(),
}).strict();

/**
 * Income/Expense ID Parameter Schema
 */
export const IncomeIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const ExpenseIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

/**
 * Currency Conversion Schema
 */
export const CurrencyConversionSchema = z.object({
  target_currency: supportedCurrencies,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

