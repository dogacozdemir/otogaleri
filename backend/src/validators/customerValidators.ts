import { z } from 'zod';

/**
 * Sanitize string inputs for XSS protection
 */
const sanitizeString = (input: string) => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255).transform(sanitizeString),
  phone: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  email: z.string().email("Invalid email format").max(255).nullable().optional().transform(val => val ? sanitizeString(val.toLowerCase()) : null),
  address: z.string().max(500).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  notes: z.string().max(1000).nullable().optional().transform(val => val ? sanitizeString(val) : null),
});

export const UpdateCustomerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255).optional().transform(val => val ? sanitizeString(val) : val),
  phone: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  email: z.string().email().max(255).nullable().optional().transform(val => val ? sanitizeString(val.toLowerCase()) : null),
  address: z.string().max(500).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  notes: z.string().max(1000).nullable().optional().transform(val => val ? sanitizeString(val) : null),
}).partial();

export const CustomerIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
});

export const CustomerListQuerySchema = z.object({
  search: z.string().optional(),
  sort_by: z.enum(["name", "total_spent", "sale_count", "last_sale"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  page: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : 1),
  limit: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : 50),
});

