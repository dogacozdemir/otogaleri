import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import "../middleware/tenantQuery"; // Import for type augmentation

export async function listBranches(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { page = 1, limit = 50 } = req.query;
  
  try {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * limitNum;
    
    const [rows] = await tenantQuery.query(
      "SELECT * FROM branches WHERE tenant_id = ? ORDER BY name LIMIT ? OFFSET ?",
      [tenantQuery.getTenantId(), limitNum, offset]
    );
    
    const [countRows] = await tenantQuery.query(
      "SELECT COUNT(*) as total FROM branches WHERE tenant_id = ?",
      [tenantQuery.getTenantId()]
    );
    const total = (countRows as any[])[0]?.total || 0;
    
    res.json({
      branches: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("[branch] List error", err);
    throw err; // Let error handler middleware handle it
  }
}

export async function createBranch(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { name, code, city, country, address, phone, tax_office, tax_number } = req.body;

  try {
    const [result] = await tenantQuery.query(
      "INSERT INTO branches (tenant_id, name, code, city, country, address, phone, tax_office, tax_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [tenantQuery.getTenantId(), name, code || null, city || null, country || null, address || null, phone || null, tax_office || null, tax_number || null]
    );
    const branchId = (result as any).insertId;
    const [rows] = await tenantQuery.query("SELECT * FROM branches WHERE id = ? AND tenant_id = ?", [branchId, tenantQuery.getTenantId()]);
    const branch = (rows as any[])[0];
    res.status(201).json(branch);
  } catch (err) {
    console.error("[branch] Create error", err);
    throw err; // Let error handler middleware handle it
  }
}

export async function updateBranch(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { id } = req.params;
  const { name, code, city, country, address, phone, tax_office, tax_number } = req.body;

  try {
    await tenantQuery.query(
      "UPDATE branches SET name = ?, code = ?, city = ?, country = ?, address = ?, phone = ?, tax_office = ?, tax_number = ? WHERE id = ? AND tenant_id = ?",
      [name, code || null, city || null, country || null, address || null, phone || null, tax_office || null, tax_number || null, id, tenantQuery.getTenantId()]
    );
    const [rows] = await tenantQuery.query("SELECT * FROM branches WHERE id = ? AND tenant_id = ?", [id, tenantQuery.getTenantId()]);
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    res.json(rowsArray[0]);
  } catch (err) {
    console.error("[branch] Update error", err);
    throw err; // Let error handler middleware handle it
  }
}

export async function deleteBranch(req: AuthRequest, res: Response) {
  if (!req.tenantQuery) {
    return res.status(500).json({ error: "Tenant query not available" });
  }

  const tenantQuery = req.tenantQuery;
  const { id } = req.params;

  try {
    const [result] = await tenantQuery.query("DELETE FROM branches WHERE id = ? AND tenant_id = ?", [id, tenantQuery.getTenantId()]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    res.json({ message: "Branch deleted" });
  } catch (err) {
    console.error("[branch] Delete error", err);
    throw err; // Let error handler middleware handle it
  }
}
