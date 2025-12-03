import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

// Özel segment oluşturma için tablo gerekli, şimdilik basit bir yapı
// İleride customer_segments tablosu eklenebilir

export async function getCustomSegments(req: AuthRequest, res: Response) {
  try {
    // Şimdilik boş array döndür, ileride segment tablosu eklendiğinde implement edilecek
    res.json([]);
  } catch (err) {
    console.error("[crm] Get segments error", err);
    res.status(500).json({ error: "Failed to get segments" });
  }
}

export async function createCustomSegment(req: AuthRequest, res: Response) {
  const { name, criteria } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Segment name required" });
  }

  try {
    // Şimdilik basit bir response, ileride segment tablosu eklendiğinde implement edilecek
    res.status(201).json({
      id: Date.now(),
      name,
      criteria: criteria || { conditions: [] },
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[crm] Create segment error", err);
    res.status(500).json({ error: "Failed to create segment" });
  }
}

export async function deleteCustomSegment(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    // Şimdilik basit bir response
    res.json({ message: "Segment deleted" });
  } catch (err) {
    console.error("[crm] Delete segment error", err);
    res.status(500).json({ error: "Failed to delete segment" });
  }
}

