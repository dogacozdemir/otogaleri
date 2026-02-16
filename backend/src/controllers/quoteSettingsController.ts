import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

/**
 * Get quote settings for current tenant
 */
export async function getQuoteSettings(req: AuthRequest, res: Response) {
  try {
    const [tenantRows] = await dbPool.query(
      "SELECT name FROM tenants WHERE id = ?",
      [req.tenantId]
    );
    const tenantArr = tenantRows as any[];
    const gallery_name = tenantArr.length > 0 ? tenantArr[0].name : null;

    const [rows] = await dbPool.query(
      "SELECT * FROM quote_settings WHERE tenant_id = ?",
      [req.tenantId]
    );
    const arr = rows as any[];
    if (arr.length === 0) {
      return res.json({
        gallery_name,
        gallery_logo_url: null,
        terms_conditions: null,
        contact_phone: null,
        contact_whatsapp: null,
        contact_address: null,
      });
    }
    const s = arr[0];
    res.json({
      gallery_name,
      gallery_logo_url: s.gallery_logo_url,
      terms_conditions: s.terms_conditions,
      contact_phone: s.contact_phone,
      contact_whatsapp: s.contact_whatsapp,
      contact_address: s.contact_address,
    });
  } catch (err) {
    console.error("[quoteSettings] Get error", err);
    res.status(500).json({ error: "Failed to get quote settings" });
  }
}

/**
 * Update quote settings (upsert)
 */
export async function updateQuoteSettings(req: AuthRequest, res: Response) {
  const { gallery_logo_url, terms_conditions, contact_phone, contact_whatsapp, contact_address } = req.body;

  try {
    await dbPool.query(
      `INSERT INTO quote_settings (tenant_id, gallery_logo_url, terms_conditions, contact_phone, contact_whatsapp, contact_address)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         gallery_logo_url = VALUES(gallery_logo_url),
         terms_conditions = VALUES(terms_conditions),
         contact_phone = VALUES(contact_phone),
         contact_whatsapp = VALUES(contact_whatsapp),
         contact_address = VALUES(contact_address)`,
      [
        req.tenantId,
        gallery_logo_url || null,
        terms_conditions || null,
        contact_phone || null,
        contact_whatsapp || null,
        contact_address || null,
      ]
    );
    const [rows] = await dbPool.query(
      "SELECT * FROM quote_settings WHERE tenant_id = ?",
      [req.tenantId]
    );
    const arr = rows as any[];
    res.json(arr.length > 0 ? arr[0] : {});
  } catch (err) {
    console.error("[quoteSettings] Update error", err);
    res.status(500).json({ error: "Failed to update quote settings" });
  }
}
