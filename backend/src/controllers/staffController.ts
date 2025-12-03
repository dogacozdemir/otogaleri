import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

export async function listStaff(req: AuthRequest, res: Response) {
  const { branch_id } = req.query;
  let query = "SELECT s.*, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.tenant_id = ?";
  const params: any[] = [req.tenantId];

  if (branch_id) {
    query += " AND s.branch_id = ?";
    params.push(branch_id);
  }

  query += " ORDER BY s.name";

  try {
    const [rows] = await dbPool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("[staff] List error", err);
    res.status(500).json({ error: "Failed to list staff" });
  }
}

export async function createStaff(req: AuthRequest, res: Response) {
  const { name, email, phone, role, branch_id, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Staff name required" });
  }

  try {
    const [result] = await dbPool.query(
      "INSERT INTO staff (tenant_id, branch_id, name, email, phone, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenantId, branch_id || null, name, email || null, phone || null, role || "sales", is_active !== undefined ? is_active : 1]
    );
    const staffId = (result as any).insertId;
    const [rows] = await dbPool.query(
      "SELECT s.*, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.id = ?",
      [staffId]
    );
    const staff = (rows as any[])[0];
    res.status(201).json(staff);
  } catch (err) {
    console.error("[staff] Create error", err);
    res.status(500).json({ error: "Failed to create staff" });
  }
}

export async function updateStaff(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, email, phone, role, branch_id, is_active } = req.body;

  try {
    await dbPool.query(
      "UPDATE staff SET name = ?, email = ?, phone = ?, role = ?, branch_id = ?, is_active = ? WHERE id = ? AND tenant_id = ?",
      [name, email || null, phone || null, role, branch_id || null, is_active, id, req.tenantId]
    );
    const [rows] = await dbPool.query(
      "SELECT s.*, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.id = ? AND s.tenant_id = ?",
      [id, req.tenantId]
    );
    const rowsArray = rows as any[];
    if (rowsArray.length === 0) {
      return res.status(404).json({ error: "Staff not found" });
    }
    res.json(rowsArray[0]);
  } catch (err) {
    console.error("[staff] Update error", err);
    res.status(500).json({ error: "Failed to update staff" });
  }
}

export async function deleteStaff(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query("DELETE FROM staff WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Staff not found" });
    }
    res.json({ message: "Staff deleted" });
  } catch (err) {
    console.error("[staff] Delete error", err);
    res.status(500).json({ error: "Failed to delete staff" });
  }
}
