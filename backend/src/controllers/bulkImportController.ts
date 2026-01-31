import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import multer from "multer";
import { parseExcelFile, parseCSVFile, validateVehicleImport, validateCostImport } from "../services/bulkImportService";
import { getOrFetchRate } from "../services/fxCacheService";
import { SupportedCurrency } from "../services/currencyService";

// File upload configuration
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/csv'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls') || file.originalname.endsWith('.csv')) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed."));
  },
});

/**
 * Bulk import vehicles from Excel/CSV
 */
export async function bulkImportVehicles(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Parse file based on extension
    let rawData: any[];
    const filename = req.file.originalname.toLowerCase();
    
    if (filename.endsWith('.csv')) {
      rawData = parseCSVFile(req.file.buffer);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      rawData = parseExcelFile(req.file.buffer);
    } else {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Unsupported file format" });
    }

    if (rawData.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "File is empty or has no data rows" });
    }

    // Validate data
    const validationResult = validateVehicleImport(rawData);

    if (validationResult.errors.length > 0 && validationResult.success.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: "All rows have validation errors",
        errors: validationResult.errors,
      });
    }

    // Get tenant base currency
    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Get existing vehicle numbers to avoid duplicates
    const [existingVehicles] = await conn.query(
      "SELECT vehicle_number FROM vehicles WHERE tenant_id = ? AND vehicle_number IS NOT NULL",
      [req.tenantId]
    );
    const usedNumbers = new Set((existingVehicles as any[]).map((v: any) => v.vehicle_number));

    // Insert valid vehicles
    const insertedVehicles: any[] = [];
    const insertErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < validationResult.success.length; i++) {
      const vehicle = validationResult.success[i];
      
      try {
        // Determine vehicle number
        let finalVehicleNumber: number | null = null;
        
        if (vehicle.vehicle_number !== null && vehicle.vehicle_number !== undefined) {
          if (usedNumbers.has(vehicle.vehicle_number)) {
            insertErrors.push({
              row: i + 2,
              error: `Araç no ${vehicle.vehicle_number} zaten kullanılıyor`,
            });
            continue;
          }
          finalVehicleNumber = vehicle.vehicle_number;
        } else {
          // Auto-assign next available number
          let nextNumber = 1;
          while (usedNumbers.has(nextNumber)) {
            nextNumber++;
          }
          finalVehicleNumber = nextNumber;
        }
        usedNumbers.add(finalVehicleNumber);

        // Calculate FX rate if needed
        let purchaseFxRate = 1;
        const purchaseCurrency = vehicle.purchase_currency || baseCurrency;
        if (vehicle.purchase_amount && vehicle.purchase_date && purchaseCurrency !== baseCurrency) {
          if (!req.tenantQuery) {
            await conn.rollback();
            conn.release();
            return res.status(500).json({ error: "Tenant query not available" });
          }
          purchaseFxRate = await getOrFetchRate(
            req.tenantQuery,
            purchaseCurrency as SupportedCurrency,
            baseCurrency as SupportedCurrency,
            vehicle.purchase_date
          );
        }

        // Insert vehicle
        const [result] = await conn.query(
            `INSERT INTO vehicles (
            tenant_id, vehicle_number, maker, model, production_year, arrival_date,
            transmission, chassis_no, plate_number, km, fuel, grade, cc, color, engine_no, other,
            purchase_amount, purchase_currency, purchase_fx_rate_to_base, purchase_date,
            sale_price, sale_currency, status, stock_status, location, target_profit
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.tenantId,
            finalVehicleNumber,
            vehicle.maker || null,
            vehicle.model || null,
            vehicle.production_year || null,
            vehicle.arrival_date || null,
            vehicle.transmission || null,
            vehicle.chassis_no || null,
            vehicle.plate_number || null,
            vehicle.km || null,
            vehicle.fuel || null,
            vehicle.grade || null,
            vehicle.cc || null,
            vehicle.color || null,
            vehicle.engine_no || null,
            vehicle.other || null,
            vehicle.purchase_amount || null,
            purchaseCurrency,
            purchaseFxRate,
            vehicle.purchase_date || null,
            vehicle.sale_price || null,
            baseCurrency,
            vehicle.status || 'used',
            vehicle.stock_status || 'in_stock',
            vehicle.location || null,
            vehicle.target_profit || null,
          ]
        );

        insertedVehicles.push({
          id: (result as any).insertId,
          vehicle_number: finalVehicleNumber,
          maker: vehicle.maker,
          model: vehicle.model,
        });
      } catch (err: any) {
        insertErrors.push({
          row: i + 2,
          error: err.message || "Failed to insert vehicle",
        });
      }
    }

    // If no vehicles were inserted, rollback
    if (insertedVehicles.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: "No vehicles were inserted",
        validationErrors: validationResult.errors,
        insertErrors,
      });
    }

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      inserted: insertedVehicles.length,
      totalRows: rawData.length,
      validationErrors: validationResult.errors,
      insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
    });
  } catch (err: any) {
    await conn.rollback();
    conn.release();
    console.error("[bulkImport] Vehicles import error", err);
    res.status(500).json({ error: "Failed to import vehicles", details: err.message });
  }
}

/**
 * Bulk import vehicle costs from Excel/CSV
 */
export async function bulkImportCosts(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    // Parse file
    let rawData: any[];
    const filename = req.file.originalname.toLowerCase();
    
    if (filename.endsWith('.csv')) {
      rawData = parseCSVFile(req.file.buffer);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      rawData = parseExcelFile(req.file.buffer);
    } else {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "Unsupported file format" });
    }

    if (rawData.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: "File is empty or has no data rows" });
    }

    // Validate data
    const validationResult = validateCostImport(rawData);

    if (validationResult.errors.length > 0 && validationResult.success.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: "All rows have validation errors",
        errors: validationResult.errors,
      });
    }

    // Get tenant base currency
    const [tenantRows] = await conn.query("SELECT default_currency FROM tenants WHERE id = ?", [req.tenantId]);
    const baseCurrency = (tenantRows as any[])[0]?.default_currency || "TRY";

    // Get vehicle mapping (vehicle_number -> vehicle_id)
    const [vehicles] = await conn.query(
      "SELECT id, vehicle_number FROM vehicles WHERE tenant_id = ?",
      [req.tenantId]
    );
    const vehicleMap = new Map<number, number>();
    (vehicles as any[]).forEach((v: any) => {
      if (v.vehicle_number) {
        vehicleMap.set(v.vehicle_number, v.id);
      }
    });

    // Insert costs
    const insertedCosts: any[] = [];
    const insertErrors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < validationResult.success.length; i++) {
      const cost = validationResult.success[i];
      
      try {
        // Find vehicle by vehicle_number
        const vehicleId = vehicleMap.get(cost.vehicle_number);
        if (!vehicleId) {
          insertErrors.push({
            row: i + 2,
            error: `Araç no ${cost.vehicle_number} bulunamadı`,
          });
          continue;
        }

        // Calculate FX rate
        let fxRate = 1;
        const costCurrency = cost.currency || baseCurrency;
        if (costCurrency !== baseCurrency) {
          if (!req.tenantQuery) {
            await conn.rollback();
            conn.release();
            return res.status(500).json({ error: "Tenant query not available" });
          }
          fxRate = await getOrFetchRate(
            req.tenantQuery,
            costCurrency as SupportedCurrency,
            baseCurrency as SupportedCurrency,
            cost.cost_date
          );
        }

        // Insert cost
        const [result] = await conn.query(
          `INSERT INTO vehicle_costs (
            tenant_id, vehicle_id, cost_name, amount, currency, fx_rate_to_base, cost_date, category
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.tenantId,
            vehicleId,
            cost.cost_name,
            cost.amount,
            costCurrency,
            fxRate,
            cost.cost_date,
            cost.category || 'other',
          ]
        );

        insertedCosts.push({
          id: (result as any).insertId,
          vehicle_id: vehicleId,
          vehicle_number: cost.vehicle_number,
          cost_name: cost.cost_name,
        });
      } catch (err: any) {
        insertErrors.push({
          row: i + 2,
          error: err.message || "Failed to insert cost",
        });
      }
    }

    if (insertedCosts.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: "No costs were inserted",
        validationErrors: validationResult.errors,
        insertErrors,
      });
    }

    await conn.commit();
    conn.release();

    res.status(201).json({
      success: true,
      inserted: insertedCosts.length,
      totalRows: rawData.length,
      validationErrors: validationResult.errors,
      insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
    });
  } catch (err: any) {
    await conn.rollback();
    conn.release();
    console.error("[bulkImport] Costs import error", err);
    res.status(500).json({ error: "Failed to import costs", details: err.message });
  }
}

