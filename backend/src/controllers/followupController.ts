import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

// Satış sonrası takip listesi
export async function listFollowups(req: AuthRequest, res: Response) {
  const { status, sale_id, customer_id, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
        f.*,
        vs.customer_name,
        vs.sale_date,
        vs.sale_amount,
        v.maker,
        v.model,
        v.production_year as year,
        c.name as customer_name_full,
        s.name as created_by_name
      FROM post_sale_followups f
      LEFT JOIN vehicle_sales vs ON f.sale_id = vs.id
      LEFT JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN customers c ON f.customer_id = c.id
      LEFT JOIN staff s ON f.created_by = s.id
      WHERE f.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (status) {
      query += ` AND f.status = ?`;
      params.push(status);
    }

    if (sale_id) {
      query += ` AND f.sale_id = ?`;
      params.push(sale_id);
    }

    if (customer_id) {
      query += ` AND f.customer_id = ?`;
      params.push(customer_id);
    }

    if (startDate) {
      query += ` AND f.followup_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND f.followup_date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY f.followup_date ASC, f.followup_time ASC`;

    const [followups] = await dbPool.query(query, params);
    res.json(followups);
  } catch (err) {
    console.error("[followup] List error", err);
    res.status(500).json({ error: "Failed to list followups" });
  }
}

// Tek bir takip detayı
export async function getFollowupById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        f.*,
        vs.customer_name,
        vs.sale_date,
        vs.sale_amount,
        v.maker,
        v.model,
        v.production_year as year,
        c.name as customer_name_full,
        s.name as created_by_name
      FROM post_sale_followups f
      LEFT JOIN vehicle_sales vs ON f.sale_id = vs.id
      LEFT JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN customers c ON f.customer_id = c.id
      LEFT JOIN staff s ON f.created_by = s.id
      WHERE f.id = ? AND f.tenant_id = ?`,
      [id, req.tenantId]
    );

    const followups = rows as any[];
    if (followups.length === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

    res.json(followups[0]);
  } catch (err) {
    console.error("[followup] Get error", err);
    res.status(500).json({ error: "Failed to get followup" });
  }
}

// Yeni takip oluştur
export async function createFollowup(req: AuthRequest, res: Response) {
  const {
    sale_id,
    customer_id,
    vehicle_id,
    followup_type,
    followup_date,
    followup_time,
    notes,
    next_followup_date,
  } = req.body;

  if (!sale_id || !customer_id || !vehicle_id || !followup_date) {
    return res.status(400).json({ error: "Sale ID, customer ID, vehicle ID, and followup date are required" });
  }

  try {
    const [result] = await dbPool.query(
      `INSERT INTO post_sale_followups (
        tenant_id, sale_id, customer_id, vehicle_id,
        followup_type, followup_date, followup_time,
        notes, next_followup_date, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.tenantId,
        sale_id,
        customer_id,
        vehicle_id,
        followup_type || "call",
        followup_date,
        followup_time || null,
        notes || null,
        next_followup_date || null,
        req.userId || null,
      ]
    );

    const followupId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM post_sale_followups WHERE id = ?", [followupId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error("[followup] Create error", err);
    res.status(500).json({ error: "Failed to create followup" });
  }
}

// Takip güncelle
export async function updateFollowup(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    followup_type,
    followup_date,
    followup_time,
    status,
    notes,
    satisfaction_score,
    feedback,
    next_followup_date,
  } = req.body;

  try {
    // Önce mevcut takibi kontrol et
    const [existing] = await dbPool.query(
      "SELECT * FROM post_sale_followups WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    if ((existing as any[]).length === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    if (followup_type !== undefined) {
      updateFields.push("followup_type = ?");
      params.push(followup_type);
    }
    if (followup_date !== undefined) {
      updateFields.push("followup_date = ?");
      params.push(followup_date);
    }
    if (followup_time !== undefined) {
      updateFields.push("followup_time = ?");
      params.push(followup_time);
    }
    if (status !== undefined) {
      updateFields.push("status = ?");
      params.push(status);
      if (status === "completed") {
        updateFields.push("completed_at = NOW()");
      }
    }
    if (notes !== undefined) {
      updateFields.push("notes = ?");
      params.push(notes);
    }
    if (satisfaction_score !== undefined) {
      updateFields.push("satisfaction_score = ?");
      params.push(satisfaction_score);
    }
    if (feedback !== undefined) {
      updateFields.push("feedback = ?");
      params.push(feedback);
    }
    if (next_followup_date !== undefined) {
      updateFields.push("next_followup_date = ?");
      params.push(next_followup_date);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id, req.tenantId);

    await dbPool.query(
      `UPDATE post_sale_followups SET ${updateFields.join(", ")} WHERE id = ? AND tenant_id = ?`,
      params
    );

    const [rows] = await dbPool.query("SELECT * FROM post_sale_followups WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err) {
    console.error("[followup] Update error", err);
    res.status(500).json({ error: "Failed to update followup" });
  }
}

// Takip sil
export async function deleteFollowup(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query(
      "DELETE FROM post_sale_followups WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Followup not found" });
    }

    res.json({ message: "Followup deleted successfully" });
  } catch (err) {
    console.error("[followup] Delete error", err);
    res.status(500).json({ error: "Failed to delete followup" });
  }
}

// Bugünkü takip görevleri (artık tüm görevleri getiriyor)
export async function getTodayFollowups(req: AuthRequest, res: Response) {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        f.*,
        vs.customer_name,
        vs.sale_date,
        v.maker,
        v.model,
        v.production_year as year,
        c.name as customer_name_full,
        c.phone as customer_phone
      FROM post_sale_followups f
      LEFT JOIN vehicle_sales vs ON f.sale_id = vs.id
      LEFT JOIN vehicles v ON f.vehicle_id = v.id
      LEFT JOIN customers c ON f.customer_id = c.id
      WHERE f.tenant_id = ? 
        AND f.status = 'pending'
      ORDER BY f.followup_date ASC, f.followup_time ASC`,
      [req.tenantId]
    );

    res.json(rows);
  } catch (err) {
    console.error("[followup] Today followups error", err);
    res.status(500).json({ error: "Failed to get followups" });
  }
}

// Takip şablonları listesi
export async function listFollowupTemplates(req: AuthRequest, res: Response) {
  try {
    const [templates] = await dbPool.query(
      "SELECT * FROM followup_templates WHERE tenant_id = ? AND is_active = TRUE ORDER BY days_after_sale ASC",
      [req.tenantId]
    );
    res.json(templates);
  } catch (err) {
    console.error("[followup] Templates list error", err);
    res.status(500).json({ error: "Failed to list templates" });
  }
}

// Takip şablonu oluştur
export async function createFollowupTemplate(req: AuthRequest, res: Response) {
  const { name, days_after_sale, followup_type, message_template } = req.body;

  if (!name || days_after_sale === undefined || !followup_type || !message_template) {
    return res.status(400).json({ error: "Name, days_after_sale, followup_type, and message_template are required" });
  }

  try {
    const [result] = await dbPool.query(
      `INSERT INTO followup_templates (tenant_id, name, days_after_sale, followup_type, message_template)
       VALUES (?, ?, ?, ?, ?)`,
      [req.tenantId, name, days_after_sale, followup_type, message_template]
    );

    const templateId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM followup_templates WHERE id = ?", [templateId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error("[followup] Create template error", err);
    res.status(500).json({ error: "Failed to create template" });
  }
}

