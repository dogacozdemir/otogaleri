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

// Shared enums matching DB schema (vehicles table)
const statusEnum = z.enum(["new", "used", "damaged", "repaired"]);
const stockStatusEnum = z.enum(["in_stock", "on_sale", "reserved", "sold"]);

/**
 * Create Vehicle Schema
 */
export const CreateVehicleSchema = z.object({
  vehicle_number: z.coerce.number().int().positive().optional().nullable(),
  branch_id: z.coerce.number().int().positive().optional().nullable(),
  maker: sanitizedString,
  model: sanitizedString,
  production_year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  transmission: sanitizedString,
  chassis_no: sanitizedString,
  plate_number: sanitizedString,
  km: z.coerce.number().int().nonnegative().optional().nullable(),
  fuel: sanitizedString,
  grade: sanitizedString,
  cc: z.coerce.number().int().nonnegative().optional().nullable(),
  color: sanitizedString,
  engine_no: sanitizedString,
  other: sanitizedString,
  purchase_amount: z.coerce.number().nonnegative().optional().nullable(),
  purchase_currency: z.string().length(3).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sale_price: z.coerce.number().nonnegative().optional().nullable(),
  sale_currency: z.string().length(3).optional(),
  status: statusEnum.optional(),
  stock_status: stockStatusEnum.optional(),
  location: sanitizedString,
  target_profit: z.coerce.number().nonnegative().optional().nullable(),
  features: z.any().optional().nullable(), // JSON object, validate structure if needed
}).strict();

/**
 * Update Vehicle Schema - body validation (id comes from URL params)
 * Includes all vehicle fields that can be updated
 */
export const UpdateVehicleSchema = z.object({
  vehicle_number: z.coerce.number().int().positive().optional().nullable(),
  branch_id: z.coerce.number().int().positive().optional().nullable(),
  maker: sanitizedString,
  model: sanitizedString,
  production_year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  transmission: sanitizedString,
  chassis_no: sanitizedString,
  plate_number: sanitizedString,
  km: z.coerce.number().int().nonnegative().optional().nullable(),
  fuel: sanitizedString,
  grade: sanitizedString,
  cc: z.coerce.number().int().nonnegative().optional().nullable(),
  color: sanitizedString,
  engine_no: sanitizedString,
  other: sanitizedString,
  purchase_amount: z.coerce.number().nonnegative().optional().nullable(),
  purchase_currency: z.string().length(3).optional(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sale_price: z.coerce.number().nonnegative().optional().nullable(),
  sale_currency: z.string().length(3).optional(),
  status: statusEnum.optional(),
  stock_status: stockStatusEnum.optional(),
  location: sanitizedString,
  target_profit: z.coerce.number().nonnegative().optional().nullable(),
  features: z.any().optional().nullable(),
}).strict();

/**
 * Vehicle ID Parameter Schema
 */
export const VehicleIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

