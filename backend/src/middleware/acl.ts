import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { dbPool } from "../config/database";

/**
 * ACL Middleware - Check if user has permission to perform an action on a resource
 * Usage: checkPermission('vehicles', 'delete')(req, res, next)
 */
export function checkPermission(resource: string, action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.tenantId || !req.userRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Owners and admins have full access
    if (req.userRole === "owner" || req.userRole === "admin") {
      return next();
    }

    try {
      // Check if permission exists and is allowed
      const [rows] = await dbPool.query(
        `SELECT allowed FROM acl_permissions 
         WHERE tenant_id = ? AND role = ? AND resource = ? AND action = ?`,
        [req.tenantId, req.userRole, resource, action]
      );

      const permissions = rows as any[];
      
      // If no permission record exists, deny by default
      if (permissions.length === 0) {
        return res.status(403).json({ 
          error: "Permission denied",
          message: `You don't have permission to ${action} ${resource}` 
        });
      }

      const permission = permissions[0];
      if (!permission.allowed) {
        return res.status(403).json({ 
          error: "Permission denied",
          message: `You don't have permission to ${action} ${resource}` 
        });
      }

      next();
    } catch (error) {
      console.error("[acl] Permission check error:", error);
      res.status(500).json({ error: "Failed to check permission" });
    }
  };
}

/**
 * Check if user has permission (returns boolean, doesn't send response)
 * Useful for conditional logic in controllers
 */
export async function hasPermission(
  tenantId: number,
  role: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Owners and admins have full access
  if (role === "owner" || role === "admin") {
    return true;
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT allowed FROM acl_permissions 
       WHERE tenant_id = ? AND role = ? AND resource = ? AND action = ?`,
      [tenantId, role, resource, action]
    );

    const permissions = rows as any[];
    if (permissions.length === 0) {
      return false; // Deny by default
    }

    return permissions[0].allowed === 1;
  } catch (error) {
    console.error("[acl] Has permission check error:", error);
    return false;
  }
}

