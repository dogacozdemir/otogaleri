import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

// Vehicle import schema
export const VehicleImportSchema = z.object({
  vehicle_number: z.coerce.number().nullable().optional(),
  maker: z.string().min(1).optional().nullable(),
  model: z.string().optional().nullable(),
  production_year: z.coerce.number().nullable().optional(),
  arrival_date: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  chassis_no: z.string().optional().nullable(),
  plate_number: z.string().optional().nullable(),
  km: z.coerce.number().nullable().optional(),
  fuel: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  cc: z.coerce.number().nullable().optional(),
  color: z.string().optional().nullable(),
  engine_no: z.string().optional().nullable(),
  other: z.string().optional().nullable(),
  sale_price: z.coerce.number().nullable().optional(),
  purchase_amount: z.coerce.number().nullable().optional(),
  purchase_currency: z.string().length(3).default('TRY').optional(),
  purchase_date: z.string().optional().nullable(),
  status: z.enum(['new', 'used', 'damaged', 'repaired']).default('used').optional(),
  stock_status: z.enum(['in_stock', 'on_sale', 'reserved', 'sold']).default('in_stock').optional(),
  location: z.string().optional().nullable(),
  target_profit: z.coerce.number().nullable().optional(),
});

// Cost import schema
export const CostImportSchema = z.object({
  vehicle_number: z.coerce.number(),
  cost_name: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default('TRY'),
  cost_date: z.string(),
  category: z.enum(['purchase', 'shipping', 'customs', 'repair', 'insurance', 'tax', 'other']).default('other').optional(),
});

export type VehicleImportRow = z.infer<typeof VehicleImportSchema>;
export type CostImportRow = z.infer<typeof CostImportSchema>;

export interface ImportResult<T> {
  success: T[];
  errors: Array<{ row: number; data: any; error: string }>;
}

/**
 * Parse Excel file and return array of objects
 */
export function parseExcelFile(buffer: Buffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { raw: false });
}

/**
 * Parse CSV file and return array of objects
 */
export function parseCSVFile(buffer: Buffer): any[] {
  const content = buffer.toString('utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as any[];
}

/**
 * Validate and parse vehicle import data
 */
export function validateVehicleImport(data: any[]): ImportResult<VehicleImportRow> {
  const success: VehicleImportRow[] = [];
  const errors: Array<{ row: number; data: any; error: string }> = [];

  data.forEach((row, index) => {
    try {
      // Convert empty strings to null
      const cleanedRow: any = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        cleanedRow[key] = value === '' || value === null || value === undefined ? null : value;
      });

      const validated = VehicleImportSchema.parse(cleanedRow);
      success.push(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          row: index + 2, // +2 because index is 0-based and we skip header
          data: row,
          error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
      } else {
        errors.push({
          row: index + 2,
          data: row,
          error: String(error),
        });
      }
    }
  });

  return { success, errors };
}

/**
 * Validate and parse cost import data
 */
export function validateCostImport(data: any[]): ImportResult<CostImportRow> {
  const success: CostImportRow[] = [];
  const errors: Array<{ row: number; data: any; error: string }> = [];

  data.forEach((row, index) => {
    try {
      const cleanedRow: any = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        cleanedRow[key] = value === '' || value === null || value === undefined ? null : value;
      });

      const validated = CostImportSchema.parse(cleanedRow);
      success.push(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          row: index + 2,
          data: row,
          error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
        });
      } else {
        errors.push({
          row: index + 2,
          data: row,
          error: String(error),
        });
      }
    }
  });

  return { success, errors };
}

