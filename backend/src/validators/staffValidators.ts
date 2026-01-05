import { z } from 'zod';

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

export const CreateStaffSchema = z.object({
  name: z.string().min(1, "Staff name is required").max(255).transform(sanitizeString),
  email: z.string().email("Invalid email format").max(255).nullable().optional().transform(val => val ? sanitizeString(val.toLowerCase()) : null),
  phone: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  role: z.enum(["sales", "manager", "admin", "accountant", "other"]).optional().default("sales"),
  branch_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export const UpdateStaffSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255).optional().transform(val => val ? sanitizeString(val) : val),
  email: z.string().email().max(255).nullable().optional().transform(val => val ? sanitizeString(val.toLowerCase()) : null),
  phone: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  role: z.enum(["sales", "manager", "admin", "accountant", "other"]).optional(),
  branch_id: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
}).partial();

export const StaffIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
});

export const StaffListQuerySchema = z.object({
  branch_id: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : undefined),
  page: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : 1),
  limit: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : 50),
});

