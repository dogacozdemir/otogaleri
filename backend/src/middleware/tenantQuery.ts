import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";

/**
 * Middleware to attach TenantAwareQuery instance to request
 * 
 * This makes it easy to use tenant-aware queries in controllers:
 * 
 *   const query = req.tenantQuery;
 *   const vehicles = await query.select('vehicles', { status: 'active' });
 */
export function tenantQueryMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID not found" });
  }

  // Attach TenantAwareQuery instance to request
  (req as any).tenantQuery = new TenantAwareQuery(req.tenantId);

  next();
}

// Extend AuthRequest interface to include tenantQuery
declare module "../middleware/auth" {
  interface AuthRequest extends Request {
    tenantId?: number;
    userId?: number;
    userRole?: string;
    tenantQuery?: TenantAwareQuery;
  }
}


