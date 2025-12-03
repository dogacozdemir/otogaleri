import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

// Tenant bilgilerini getir
export async function getTenant(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT id, name, slug, default_currency, country, phone, address, city, language, created_at
       FROM tenants 
       WHERE id = ?`,
      [req.tenantId]
    );
    const tenant = (rows as any[])[0];
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json(tenant);
  } catch (err) {
    console.error("[tenant] Get error", err);
    res.status(500).json({ error: "Failed to get tenant" });
  }
}

// Tenant bilgilerini güncelle
export async function updateTenant(req: AuthRequest, res: Response) {
  const { name, phone, address, city, default_currency, language } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Tenant name required" });
  }

  try {
    await dbPool.query(
      `UPDATE tenants 
       SET name = ?, phone = ?, address = ?, city = ?, default_currency = ?, language = ?
       WHERE id = ?`,
      [
        name.trim(),
        phone || null,
        address || null,
        city || null,
        default_currency || "TRY",
        language || "tr",
        req.tenantId,
      ]
    );

    const [rows] = await dbPool.query(
      `SELECT id, name, slug, default_currency, country, phone, address, city, language, created_at
       FROM tenants 
       WHERE id = ?`,
      [req.tenantId]
    );
    const tenant = (rows as any[])[0];
    res.json(tenant);
  } catch (err) {
    console.error("[tenant] Update error", err);
    res.status(500).json({ error: "Failed to update tenant" });
  }
}
