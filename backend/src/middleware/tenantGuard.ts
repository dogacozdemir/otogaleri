import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { dbPool } from "../config/database";
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";

/**
 * TenantGuard - Validates tenant exists and attaches TenantAwareQuery to request
 * 
 * This middleware:
 * 1. Validates tenant exists
 * 2. Attaches TenantAwareQuery instance to req.tenantQuery for safe database operations
 */
export async function tenantGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  // Validate tenant exists
  const [rows] = await dbPool.query("SELECT id FROM tenants WHERE id = ?", [req.tenantId]);
  if (Array.isArray(rows) && rows.length === 0) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  // Attach TenantAwareQuery instance to request for safe database operations
  (req as any).tenantQuery = new TenantAwareQuery(req.tenantId);

  next();
}
