import { z } from "zod";

/**
 * Vehicle Validators - Zod schemas for vehicle-related endpoints
 * Includes XSS protection via trim and sanitization
 */

// Helper function to sanitize strings (trim and escape HTML)
const sanitizeString = (val: string | undefined): string | undefined => {
  if (!val) return val;
  return val.trim().replace(/[<>]/g, ""); // Basic XSS protection
};

// Custom string schema with sanitization
const sanitizedString = z.string().transform(sanitizeString).optional().nullable();

// Custom required string schema with sanitization
const sanitizedRequiredString = z.string().min(1).transform(sanitizeString);

/**
 * Create Vehicle Schema
 */
export const CreateVehicleSchema = z.object({
  vehicle_number: z.number().int().positive().optional().nullable(),
  branch_id: z.number().int().positive().optional().nullable(),
  maker: sanitizedString,
  model: sanitizedString,
  production_year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  purchase_amount: z.number().nonnegative().optional().nullable(),
  purchase_currency: z.string().length(3).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sale_price: z.number().nonnegative().optional().nullable(),
  sale_currency: z.string().length(3).optional(),
  status: z.enum(["new", "used", "damaged"]).optional(),
  stock_status: z.enum(["in_stock", "sold", "reserved", "pending"]).optional(),
  location: sanitizedString,
  target_profit: z.number().nonnegative().optional().nullable(),
  features: z.any().optional().nullable(), // JSON object, validate structure if needed
}).strict();

/**
 * Update Vehicle Schema (all fields optional except id)
 */
export const UpdateVehicleSchema = z.object({
  id: z.number().int().positive(),
  vehicle_number: z.number().int().positive().optional().nullable(),
  branch_id: z.number().int().positive().optional().nullable(),
  maker: sanitizedString,
  model: sanitizedString,
  production_year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  purchase_amount: z.number().nonnegative().optional().nullable(),
  purchase_currency: z.string().length(3).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sale_price: z.number().nonnegative().optional().nullable(),
  sale_currency: z.string().length(3).optional(),
  status: z.enum(["new", "used", "damaged"]).optional(),
  stock_status: z.enum(["in_stock", "sold", "reserved", "pending"]).optional(),
  location: sanitizedString,
  target_profit: z.number().nonnegative().optional().nullable(),
  features: z.any().optional().nullable(),
}).strict();

/**
 * Vehicle ID Parameter Schema
 */
export const VehicleIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

