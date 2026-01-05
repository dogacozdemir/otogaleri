import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { TenantAwareQuery } from "../repositories/tenantAwareQuery";
import { loggerService } from "./loggerService";

/**
 * Permission Resource-Action Constants
 * Format: RESOURCE_ACTION: ['allowed_roles']
 */
export const PERMISSIONS = {
  // Vehicle permissions
  VEHICLE_CREATE: ["admin", "owner"],
  VEHICLE_READ: ["admin", "owner", "staff", "viewer"],
  VEHICLE_UPDATE: ["admin", "owner", "staff"],
  VEHICLE_DELETE: ["admin", "owner"],
  
  // Vehicle Cost permissions
  VEHICLE_COST_CREATE: ["admin", "owner", "staff"],
  VEHICLE_COST_READ: ["admin", "owner", "staff", "viewer"],
  VEHICLE_COST_UPDATE: ["admin", "owner"],
  VEHICLE_COST_DELETE: ["admin", "owner"],
  
  // Vehicle Sale permissions
  VEHICLE_SALE_CREATE: ["admin", "owner", "staff"],
  VEHICLE_SALE_READ: ["admin", "owner", "staff", "viewer"],
  VEHICLE_SALE_UPDATE: ["admin", "owner"],
  VEHICLE_SALE_DELETE: ["admin", "owner"],
  
  // Customer permissions
  CUSTOMER_CREATE: ["admin", "owner", "staff"],
  CUSTOMER_READ: ["admin", "owner", "staff", "viewer"],
  CUSTOMER_UPDATE: ["admin", "owner", "staff"],
  CUSTOMER_DELETE: ["admin", "owner"],
  
  // Accounting permissions
  INCOME_CREATE: ["admin", "owner", "staff"],
  INCOME_READ: ["admin", "owner", "staff", "viewer"],
  INCOME_UPDATE: ["admin", "owner"],
  INCOME_DELETE: ["admin", "owner"],
  
  EXPENSE_CREATE: ["admin", "owner", "staff"],
  EXPENSE_READ: ["admin", "owner", "staff", "viewer"],
  EXPENSE_UPDATE: ["admin", "owner"],
  EXPENSE_DELETE: ["admin", "owner"],
  
  // Staff permissions
  STAFF_CREATE: ["admin", "owner"],
  STAFF_READ: ["admin", "owner"],
  STAFF_UPDATE: ["admin", "owner"],
  STAFF_DELETE: ["admin", "owner"],
  
  // Branch permissions
  BRANCH_CREATE: ["admin", "owner"],
  BRANCH_READ: ["admin", "owner", "staff", "viewer"],
  BRANCH_UPDATE: ["admin", "owner"],
  BRANCH_DELETE: ["admin", "owner"],
  
  // Report permissions
  REPORT_VIEW: ["admin", "owner", "staff", "viewer"],
  REPORT_EXPORT: ["admin", "owner"],
  
  // Settings permissions
  SETTINGS_UPDATE: ["admin", "owner"],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * RoleService - Enhanced ACL with permission constants
 */
export class RoleService {
  /**
   * Check if a role has permission for a given permission key
   */
  static hasPermission(role: string, permission: PermissionKey): boolean {
    // Owners and admins have full access
    if (role === "owner" || role === "admin") {
      return true;
    }

    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles.includes(role as any);
  }

  /**
   * Check permission using database ACL table (for dynamic permissions)
   */
  static async hasDatabasePermission(
    tenantQuery: TenantAwareQuery,
    role: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Owners and admins have full access
    if (role === "owner" || role === "admin") {
      return true;
    }

    try {
      const [rows] = await tenantQuery.query(
        `SELECT allowed FROM acl_permissions 
         WHERE tenant_id = ? AND role = ? AND resource = ? AND action = ?`,
        [tenantQuery.getTenantId(), role, resource, action]
      );

      const permissions = rows as any[];
      if (permissions.length === 0) {
        return false; // Deny by default
      }

      return permissions[0].allowed === 1;
    } catch (error) {
      console.error("[RoleService] Database permission check error:", error);
      return false;
    }
  }

  /**
   * Middleware factory for permission checking
   * Usage: router.delete('/:id', requiresPermission('VEHICLE_DELETE'), deleteVehicle)
   */
  static requiresPermission(permission: PermissionKey) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.tenantId || !req.userRole) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check permission using constant-based check
      if (!RoleService.hasPermission(req.userRole, permission)) {
        // Log unauthorized access attempt
        const ipAddress = req.ip || req.socket.remoteAddress || undefined;
        loggerService.securityAudit({
          timestamp: new Date().toISOString(),
          eventType: "UNAUTHORIZED_ACCESS" as any,
          tenantId: req.tenantId,
          userId: req.userId,
          userRole: req.userRole,
          ipAddress,
          message: `Unauthorized access attempt: ${permission} by role ${req.userRole}`,
          details: {
            permission,
            attemptedResource: permission.split("_")[0].toLowerCase(),
            attemptedAction: permission.split("_")[1].toLowerCase(),
          },
        });

        return res.status(403).json({
          error: "Permission denied",
          message: `You don't have permission to perform this action`,
        });
      }

      next();
    };
  }

  /**
   * Legacy support: Check permission using resource and action strings
   * Falls back to database ACL if permission constant doesn't exist
   */
  static checkPermission(resource: string, action: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.tenantId || !req.userRole || !req.tenantQuery) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Try to find matching permission constant
      const permissionKey = `${resource.toUpperCase()}_${action.toUpperCase()}` as PermissionKey;
      
      if (PERMISSIONS[permissionKey]) {
        // Use constant-based check
        if (!RoleService.hasPermission(req.userRole, permissionKey)) {
          const ipAddress = req.ip || req.socket.remoteAddress || undefined;
          loggerService.securityAudit({
            timestamp: new Date().toISOString(),
            eventType: "UNAUTHORIZED_ACCESS" as any,
            tenantId: req.tenantId,
            userId: req.userId,
            userRole: req.userRole,
            ipAddress,
            message: `Unauthorized access attempt: ${resource}.${action} by role ${req.userRole}`,
          });

          return res.status(403).json({
            error: "Permission denied",
            message: `You don't have permission to ${action} ${resource}`,
          });
        }
        return next();
      }

      // Fallback to database ACL check
      const hasPermission = await RoleService.hasDatabasePermission(
        req.tenantQuery,
        req.userRole,
        resource,
        action
      );

      if (!hasPermission) {
        const ipAddress = req.ip || req.socket.remoteAddress || undefined;
        loggerService.securityAudit({
          timestamp: new Date().toISOString(),
          eventType: "UNAUTHORIZED_ACCESS" as any,
          tenantId: req.tenantId,
          userId: req.userId,
          userRole: req.userRole,
          ipAddress,
          message: `Unauthorized access attempt: ${resource}.${action} by role ${req.userRole}`,
        });

        return res.status(403).json({
          error: "Permission denied",
          message: `You don't have permission to ${action} ${resource}`,
        });
      }

      next();
    };
  }
}

// Export convenience function for backward compatibility
export const requiresPermission = RoleService.requiresPermission.bind(RoleService);
export const checkPermission = RoleService.checkPermission.bind(RoleService);

