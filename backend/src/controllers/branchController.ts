import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

export async function listBranches(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      "SELECT * FROM branches WHERE tenant_id = ? ORDER BY name",
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    console.error("[branch] List error", err);
    res.status(500).json({ error: "Failed to list branches" });
  }
}

export async function createBranch(req: AuthRequest, res: Response) {
  const { name, code, city, country, address, phone, tax_office, tax_number } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Branch name required" });
  }

  try {
    const [result] = await dbPool.query(
      "INSERT INTO branches (tenant_id, name, code, city, country, address, phone, tax_office, tax_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [req.tenantId, name, code || null, city || null, country || null, address || null, phone || null, tax_office || null, tax_number || null]
    );
    const branchId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM branches WHERE id = ?", [branchId]);
    const branch = (rows as any[])[0];
    res.status(201).json(branch);
  } catch (err) {
    console.error("[branch] Create error", err);
    res.status(500).json({ error: "Failed to create branch" });
  }
}

export async function updateBranch(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, code, city, country, address, phone, tax_office, tax_number } = req.body;

  try {
    await dbPool.query(
      "UPDATE branches SET name = ?, code = ?, city = ?, country = ?, address = ?, phone = ?, tax_office = ?, tax_number = ? WHERE id = ? AND tenant_id = ?",
      [name, code || null, city || null, country || null, address || null, phone || null, tax_office || null, tax_number || null, id, req.tenantId]
    );
    const [rows] = await dbPool.query("SELECT * FROM branches WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    res.json(rowsArray[0]);
  } catch (err) {
    console.error("[branch] Update error", err);
    res.status(500).json({ error: "Failed to update branch" });
  }
}

export async function deleteBranch(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query("DELETE FROM branches WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    res.json({ message: "Branch deleted" });
  } catch (err) {
    console.error("[branch] Delete error", err);
    res.status(500).json({ error: "Failed to delete branch" });
  }
}
