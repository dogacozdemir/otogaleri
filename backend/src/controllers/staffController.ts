import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

export async function listStaff(req: AuthRequest, res: Response) {
  const { branch_id, page = 1, limit = 50 } = req.query;
  
  try {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (pageNum - 1) * limitNum;
    
    let query = "SELECT s.*, b.name as branch_name FROM staff s LEFT JOIN branches b ON s.branch_id = b.id WHERE s.tenant_id = ?";
    const params: any[] = [req.tenantId];

    if (branch_id) {
      query += " AND s.branch_id = ?";
      params.push(branch_id);
    }

    query += " ORDER BY s.name LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    const [rows] = await dbPool.query(query, params);
    
    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM staff WHERE tenant_id = ?";
    const countParams: any[] = [req.tenantId];
    if (branch_id) {
      countQuery += " AND branch_id = ?";
      countParams.push(branch_id);
    }
    const [countRows] = await dbPool.query(countQuery, countParams);
    const total = (countRows as any[])[0]?.total || 0;
    
    res.json({
      staff: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
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

  // Validate branch_id belongs to same tenant
  if (branch_id) {
    const [branchRows] = await dbPool.query(
      "SELECT id FROM branches WHERE id = ? AND tenant_id = ?",
      [branch_id, req.tenantId]
    );
    const branchArray = branchRows as any[];
    if (branchArray.length === 0) {
      return res.status(400).json({ error: "Branch not found or does not belong to your tenant" });
    }
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
  } catch (err: any) {
    console.error("[staff] Create error", err);
    
    // Check for foreign key constraint errors
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      return res.status(400).json({ error: "Invalid foreign key reference. Resource does not belong to your tenant." });
    }
    
    res.status(500).json({ error: "Failed to create staff" });
  }
}

export async function updateStaff(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { name, email, phone, role, branch_id, is_active } = req.body;

  // Validate branch_id belongs to same tenant
  if (branch_id) {
    const [branchRows] = await dbPool.query(
      "SELECT id FROM branches WHERE id = ? AND tenant_id = ?",
      [branch_id, req.tenantId]
    );
    const branchArray = branchRows as any[];
    if (branchArray.length === 0) {
      return res.status(400).json({ error: "Branch not found or does not belong to your tenant" });
    }
  }

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
  } catch (err: any) {
    console.error("[staff] Update error", err);
    
    // Check for foreign key constraint errors
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
      return res.status(400).json({ error: "Invalid foreign key reference. Resource does not belong to your tenant." });
    }
    
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
