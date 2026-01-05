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

export const CreateBranchSchema = z.object({
  name: z.string().min(1, "Branch name is required").max(255).transform(sanitizeString),
  code: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  city: z.string().max(100).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  country: z.string().max(100).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  address: z.string().max(500).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  phone: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  tax_office: z.string().max(100).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  tax_number: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
});

export const UpdateBranchSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(255).optional().transform(val => val ? sanitizeString(val) : val),
  code: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  city: z.string().max(100).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  country: z.string().max(100).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  address: z.string().max(500).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  phone: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  tax_office: z.string().max(100).nullable().optional().transform(val => val ? sanitizeString(val) : null),
  tax_number: z.string().max(50).nullable().optional().transform(val => val ? sanitizeString(val) : null),
}).partial();

export const BranchIdSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
});

export const BranchListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : 1),
  limit: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : 50),
});

