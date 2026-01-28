import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { VehicleService } from "../services/vehicleService";
import "../middleware/tenantQuery"; // Import for type augmentation
import { CreateVehicleSchema, UpdateVehicleSchema, VehicleIdSchema } from "../validators/vehicleValidators";
import { validate } from "../middleware/validation";

/**
 * Vehicle Controller - Thin layer that handles HTTP requests/responses
 * All business logic is delegated to VehicleService
 * Uses Zod validation for input sanitization and XSS protection
 */

// Validation middleware exports
export const validateCreateVehicle = validate(CreateVehicleSchema, "body");
export const validateUpdateVehicle = validate(UpdateVehicleSchema, "body");
export const validateVehicleId = validate(VehicleIdSchema, "params");

// List vehicles
export async function listVehicles(req: AuthRequest, res: Response) {
  const { page = 1, limit = 50, search, is_sold, status, stock_status, branch_id } = req.query;

  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const result = await VehicleService.listVehicles(req.tenantQuery, {
      page: pageNum,
      limit: limitNum,
      offset,
      search: search as string,
      is_sold: is_sold as string,
      status: status as string,
      stock_status: stock_status as string,
      branch_id: branch_id as string,
    });

    res.json(result);
  } catch (err) {
    console.error("[vehicle] List error", err);
    res.status(500).json({ error: "Failed to list vehicles" });
  }
}

// Create vehicle
// Note: validateCreateVehicle middleware should be applied in routes
export async function createVehicle(req: AuthRequest, res: Response) {
  // Convert FormData string numbers to actual numbers before validation
  // This prevents "Expected number, received string" errors from Zod
  const body = { ...req.body };
  const numericFields = [
    'vehicle_number',
    'branch_id',
    'production_year',
    'km',
    'cc',
    'purchase_amount',
    'sale_price',
    'target_profit',
  ];
  
  for (const field of numericFields) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== '') {
      const numValue = Number(body[field]);
      if (!isNaN(numValue)) {
        body[field] = numValue;
      } else {
        body[field] = null;
      }
    }
  }
  
  // req.body is already validated and sanitized by validateCreateVehicle middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const vehicle = await VehicleService.createVehicle(req.tenantQuery, body);

    res.status(201).json(vehicle);
  } catch (err: any) {
    console.error("[vehicle] Create error", err);

    // Handle specific error types
    if (err.message && err.message.includes("Araç no")) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message && err.message.includes("Branch not found")) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message && err.message.includes("Invalid foreign key")) {
      return res.status(400).json({ error: err.message });
    }

    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: "Bu araç no zaten kullanılıyor." });
    }

    res.status(500).json({ error: "Failed to create vehicle" });
  }
}

// Get vehicle by ID
// Note: validateVehicleId middleware should be applied in routes
export async function getVehicleById(req: AuthRequest, res: Response) {
  // req.params.id is already validated by validateVehicleId middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const vehicle = await VehicleService.getVehicleById(req.tenantQuery, req.params.id as unknown as number);
    res.json(vehicle);
  } catch (err: any) {
    if (err.message === "Vehicle not found") {
      return res.status(404).json({ error: err.message });
    }
    console.error("[vehicle] Get error", err);
    res.status(500).json({ error: "Failed to get vehicle" });
  }
}

// Update vehicle
// Note: validateUpdateVehicle and validateVehicleId middleware should be applied in routes
export async function updateVehicle(req: AuthRequest, res: Response) {
  // req.body and req.params are already validated and sanitized
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const vehicle = await VehicleService.updateVehicle(req.tenantQuery, {
      id: req.params.id as unknown as number,
      ...req.body,
    });

    res.json(vehicle);
  } catch (err: any) {
    if (err.message === "Vehicle not found") {
      return res.status(404).json({ error: err.message });
    }

    if (err.message && err.message.includes("Araç no")) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message === "No fields to update") {
      return res.status(400).json({ error: err.message });
    }

    console.error("[vehicle] Update error", err);

    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(400).json({ error: "Bu araç no zaten kullanılıyor." });
    }

    res.status(500).json({ error: "Failed to update vehicle" });
  }
}

// Get next vehicle number
export async function getNextVehicleNumber(req: AuthRequest, res: Response) {
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    const nextNumber = await VehicleService.getNextVehicleNumber(req.tenantQuery);
    res.json({ next_vehicle_number: nextNumber });
  } catch (err) {
    console.error("[vehicle] Get next number error", err);
    res.status(500).json({ error: "Failed to get next vehicle number" });
  }
}

// Delete vehicle
// Note: validateVehicleId middleware should be applied in routes
export async function deleteVehicle(req: AuthRequest, res: Response) {
  // req.params.id is already validated by validateVehicleId middleware
  try {
    if (!req.tenantQuery) {
      return res.status(500).json({ error: "Tenant query not available" });
    }
    await VehicleService.deleteVehicle(req.tenantQuery, req.params.id as unknown as number);
    res.json({ message: "Vehicle deleted" });
  } catch (err: any) {
    if (err.message === "Vehicle not found") {
      return res.status(404).json({ error: err.message });
    }
    console.error("[vehicle] Delete error", err);
    res.status(500).json({ error: "Failed to delete vehicle" });
  }
}
