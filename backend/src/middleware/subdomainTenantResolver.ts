import { Request, Response, NextFunction } from "express";
import { dbPool } from "../config/database";
import { AuthRequest } from "./auth";

/**
 * Middleware to resolve tenant from subdomain
 * This is optional - if subdomain is provided, it validates against JWT tenant
 * Primary tenant resolution is still from JWT token
 */
export async function subdomainTenantResolver(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // Only process if tenantId is already set from JWT
  if (!req.tenantId) {
    return next(); // Let auth middleware handle it
  }

  // Check Host header for subdomain
  const host = req.headers.host || req.headers['x-forwarded-host'] || '';
  const hostString = Array.isArray(host) ? host[0] : host;
  
  if (hostString && hostString.includes('.')) {
    const subdomain = hostString.split('.')[0];
    
    // Validate subdomain matches tenant slug
    try {
      const [rows] = await dbPool.query(
        "SELECT id FROM tenants WHERE slug = ? AND id = ?",
        [subdomain, req.tenantId]
      );
      const tenantArray = rows as any[];
      
      if (tenantArray.length === 0 && subdomain !== 'localhost' && subdomain !== '127.0.0.1') {
        // Subdomain doesn't match tenant - but we still allow if JWT is valid
        // This is a warning, not a block (JWT is primary)
        console.warn(`[tenant] Subdomain ${subdomain} does not match tenant ${req.tenantId}`);
      }
    } catch (err) {
      // Ignore errors, JWT tenant is primary
      console.warn("[tenant] Subdomain validation error:", err);
    }
  }
  
  next();
}

