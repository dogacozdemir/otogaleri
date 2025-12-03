import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { dbPool } from "../config/database";

export async function tenantGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  const [rows] = await dbPool.query("SELECT id FROM tenants WHERE id = ?", [req.tenantId]);
  if (Array.isArray(rows) && rows.length === 0) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  next();
}
