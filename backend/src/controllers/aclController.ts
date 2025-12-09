import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

/**
 * Get all permissions for a tenant
 */
export async function getPermissions(req: AuthRequest, res: Response) {
  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT * FROM acl_permissions 
       WHERE tenant_id = ? 
       ORDER BY role, resource, action`,
      [req.tenantId]
    );

    res.json(rows);
  } catch (error) {
    console.error("[acl] Get permissions error:", error);
    res.status(500).json({ error: "Failed to get permissions" });
  }
}

/**
 * Get permissions for a specific role
 */
export async function getPermissionsByRole(req: AuthRequest, res: Response) {
  const { role } = req.params;

  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }

  try {
    const [rows] = await dbPool.query(
      `SELECT * FROM acl_permissions 
       WHERE tenant_id = ? AND role = ? 
       ORDER BY resource, action`,
      [req.tenantId, role]
    );

    res.json(rows);
  } catch (error) {
    console.error("[acl] Get permissions by role error:", error);
    res.status(500).json({ error: "Failed to get permissions" });
  }
}

/**
 * Create or update a permission
 */
export async function upsertPermission(req: AuthRequest, res: Response) {
  const { role, resource, action, allowed } = req.body;

  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  if (!role || !resource || !action || allowed === undefined) {
    return res.status(400).json({ 
      error: "role, resource, action, and allowed are required" 
    });
  }

  // Validate role
  const validRoles = ["owner", "manager", "sales", "accounting", "other"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const [result] = await dbPool.query(
      `INSERT INTO acl_permissions (tenant_id, role, resource, action, allowed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), updated_at = CURRENT_TIMESTAMP`,
      [req.tenantId, role, resource, action, allowed ? 1 : 0]
    );

    // Get the created/updated permission
    const [rows] = await dbPool.query(
      `SELECT * FROM acl_permissions 
       WHERE tenant_id = ? AND role = ? AND resource = ? AND action = ?`,
      [req.tenantId, role, resource, action]
    );

    const permissions = rows as any[];
    res.status(201).json(permissions[0]);
  } catch (error) {
    console.error("[acl] Upsert permission error:", error);
    res.status(500).json({ error: "Failed to save permission" });
  }
}

/**
 * Delete a permission
 */
export async function deletePermission(req: AuthRequest, res: Response) {
  const { id } = req.params;

  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  try {
    const [result] = await dbPool.query(
      `DELETE FROM acl_permissions 
       WHERE id = ? AND tenant_id = ?`,
      [id, req.tenantId]
    );

    const deleteResult = result as any;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: "Permission not found" });
    }

    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("[acl] Delete permission error:", error);
    res.status(500).json({ error: "Failed to delete permission" });
  }
}

/**
 * Bulk update permissions
 */
export async function bulkUpdatePermissions(req: AuthRequest, res: Response) {
  const { permissions } = req.body;

  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: "permissions must be an array" });
  }

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    for (const perm of permissions) {
      const { role, resource, action, allowed } = perm;

      if (!role || !resource || !action || allowed === undefined) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ 
          error: "Each permission must have role, resource, action, and allowed" 
        });
      }

      await conn.query(
        `INSERT INTO acl_permissions (tenant_id, role, resource, action, allowed)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), updated_at = CURRENT_TIMESTAMP`,
        [req.tenantId, role, resource, action, allowed ? 1 : 0]
      );
    }

    await conn.commit();
    conn.release();

    // Return updated permissions
    const [rows] = await dbPool.query(
      `SELECT * FROM acl_permissions 
       WHERE tenant_id = ? 
       ORDER BY role, resource, action`,
      [req.tenantId]
    );

    res.json(rows);
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error("[acl] Bulk update permissions error:", error);
    res.status(500).json({ error: "Failed to update permissions" });
  }
}

/**
 * Initialize default permissions for a tenant
 */
export async function initializeDefaultPermissions(req: AuthRequest, res: Response) {
  if (!req.tenantId) {
    return res.status(401).json({ error: "Tenant ID missing" });
  }

  // Default permissions matrix
  const defaultPermissions = [
    // Manager permissions
    { role: "manager", resource: "vehicles", action: "view", allowed: true },
    { role: "manager", resource: "vehicles", action: "create", allowed: true },
    { role: "manager", resource: "vehicles", action: "update", allowed: true },
    { role: "manager", resource: "vehicles", action: "delete", allowed: true },
    { role: "manager", resource: "vehicles", action: "sell", allowed: true },
    { role: "manager", resource: "customers", action: "view", allowed: true },
    { role: "manager", resource: "customers", action: "create", allowed: true },
    { role: "manager", resource: "customers", action: "update", allowed: true },
    { role: "manager", resource: "customers", action: "delete", allowed: true },
    { role: "manager", resource: "staff", action: "view", allowed: true },
    { role: "manager", resource: "staff", action: "create", allowed: true },
    { role: "manager", resource: "staff", action: "update", allowed: true },
    { role: "manager", resource: "staff", action: "delete", allowed: false },
    { role: "manager", resource: "analytics", action: "view", allowed: true },
    { role: "manager", resource: "reports", action: "view", allowed: true },
    { role: "manager", resource: "settings", action: "view", allowed: true },
    { role: "manager", resource: "settings", action: "update", allowed: true },
    { role: "manager", resource: "acl", action: "view", allowed: true },
    { role: "manager", resource: "acl", action: "update", allowed: true },

    // Sales permissions
    { role: "sales", resource: "vehicles", action: "view", allowed: true },
    { role: "sales", resource: "vehicles", action: "create", allowed: true },
    { role: "sales", resource: "vehicles", action: "update", allowed: true },
    { role: "sales", resource: "vehicles", action: "delete", allowed: false },
    { role: "sales", resource: "vehicles", action: "sell", allowed: true },
    { role: "sales", resource: "customers", action: "view", allowed: true },
    { role: "sales", resource: "customers", action: "create", allowed: true },
    { role: "sales", resource: "customers", action: "update", allowed: true },
    { role: "sales", resource: "customers", action: "delete", allowed: false },
    { role: "sales", resource: "analytics", action: "view", allowed: true },
    { role: "sales", resource: "reports", action: "view", allowed: false },
    { role: "sales", resource: "settings", action: "view", allowed: false },
    { role: "sales", resource: "settings", action: "update", allowed: false },
    { role: "sales", resource: "acl", action: "view", allowed: false },
    { role: "sales", resource: "acl", action: "update", allowed: false },

    // Accounting permissions
    { role: "accounting", resource: "vehicles", action: "view", allowed: true },
    { role: "accounting", resource: "vehicles", action: "create", allowed: false },
    { role: "accounting", resource: "vehicles", action: "update", allowed: false },
    { role: "accounting", resource: "vehicles", action: "delete", allowed: false },
    { role: "accounting", resource: "vehicles", action: "sell", allowed: false },
    { role: "accounting", resource: "customers", action: "view", allowed: true },
    { role: "accounting", resource: "customers", action: "create", allowed: false },
    { role: "accounting", resource: "customers", action: "update", allowed: false },
    { role: "accounting", resource: "customers", action: "delete", allowed: false },
    { role: "accounting", resource: "analytics", action: "view", allowed: true },
    { role: "accounting", resource: "reports", action: "view", allowed: true },
    { role: "accounting", resource: "settings", action: "view", allowed: false },
    { role: "accounting", resource: "settings", action: "update", allowed: false },
    { role: "accounting", resource: "acl", action: "view", allowed: false },
    { role: "accounting", resource: "acl", action: "update", allowed: false },

    // Other role - minimal permissions
    { role: "other", resource: "vehicles", action: "view", allowed: true },
    { role: "other", resource: "customers", action: "view", allowed: true },
  ];

  const conn = await dbPool.getConnection();
  await conn.beginTransaction();

  try {
    for (const perm of defaultPermissions) {
      await conn.query(
        `INSERT INTO acl_permissions (tenant_id, role, resource, action, allowed)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
        [req.tenantId, perm.role, perm.resource, perm.action, perm.allowed ? 1 : 0]
      );
    }

    await conn.commit();
    conn.release();

    // Return all permissions
    const [rows] = await dbPool.query(
      `SELECT * FROM acl_permissions 
       WHERE tenant_id = ? 
       ORDER BY role, resource, action`,
      [req.tenantId]
    );

    res.json({ message: "Default permissions initialized", permissions: rows });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error("[acl] Initialize default permissions error:", error);
    res.status(500).json({ error: "Failed to initialize default permissions" });
  }
}

