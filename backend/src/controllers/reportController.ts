import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";

// Özelleştirilmiş rapor listesi
export async function listCustomReports(req: AuthRequest, res: Response) {
  try {
    const [reports] = await dbPool.query(
      `SELECT 
        r.*,
        s.name as created_by_name
      FROM custom_reports r
      LEFT JOIN staff s ON r.created_by = s.id
      WHERE r.tenant_id = ?
      ORDER BY r.created_at DESC`,
      [req.tenantId]
    );
    res.json(reports);
  } catch (err) {
    console.error("[report] List error", err);
    res.status(500).json({ error: "Failed to list reports" });
  }
}

// Tek bir rapor detayı
export async function getCustomReportById(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      `SELECT 
        r.*,
        s.name as created_by_name
      FROM custom_reports r
      LEFT JOIN staff s ON r.created_by = s.id
      WHERE r.id = ? AND r.tenant_id = ?`,
      [id, req.tenantId]
    );

    const reports = rows as any[];
    if (reports.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json(reports[0]);
  } catch (err) {
    console.error("[report] Get error", err);
    res.status(500).json({ error: "Failed to get report" });
  }
}

// Yeni rapor oluştur
export async function createCustomReport(req: AuthRequest, res: Response) {
  const {
    name,
    description,
    report_type,
    query_config,
    format,
    schedule_type,
    schedule_config,
    recipients,
  } = req.body;

  if (!name || !report_type || !query_config || !recipients) {
    return res.status(400).json({ error: "Name, report_type, query_config, and recipients are required" });
  }

  try {
    const [result] = await dbPool.query(
      `INSERT INTO custom_reports (
        tenant_id, name, description, report_type,
        query_config, format, schedule_type, schedule_config,
        recipients, created_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        req.tenantId,
        name,
        description || null,
        report_type,
        JSON.stringify(query_config),
        format || "pdf",
        schedule_type || null,
        schedule_config ? JSON.stringify(schedule_config) : null,
        JSON.stringify(recipients),
        req.userId || null,
      ]
    );

    const reportId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM custom_reports WHERE id = ?", [reportId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error("[report] Create error", err);
    res.status(500).json({ error: "Failed to create report" });
  }
}

// Rapor güncelle
export async function updateCustomReport(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    name,
    description,
    report_type,
    query_config,
    format,
    schedule_type,
    schedule_config,
    recipients,
    is_active,
  } = req.body;

  try {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push("description = ?");
      params.push(description);
    }
    if (report_type !== undefined) {
      updateFields.push("report_type = ?");
      params.push(report_type);
    }
    if (query_config !== undefined) {
      updateFields.push("query_config = ?");
      params.push(JSON.stringify(query_config));
    }
    if (format !== undefined) {
      updateFields.push("format = ?");
      params.push(format);
    }
    if (schedule_type !== undefined) {
      updateFields.push("schedule_type = ?");
      params.push(schedule_type);
    }
    if (schedule_config !== undefined) {
      updateFields.push("schedule_config = ?");
      params.push(schedule_config ? JSON.stringify(schedule_config) : null);
    }
    if (recipients !== undefined) {
      updateFields.push("recipients = ?");
      params.push(JSON.stringify(recipients));
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      params.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    params.push(id, req.tenantId);

    await dbPool.query(
      `UPDATE custom_reports SET ${updateFields.join(", ")} WHERE id = ? AND tenant_id = ?`,
      params
    );

    const [rows] = await dbPool.query("SELECT * FROM custom_reports WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err) {
    console.error("[report] Update error", err);
    res.status(500).json({ error: "Failed to update report" });
  }
}

// Rapor sil
export async function deleteCustomReport(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [result] = await dbPool.query(
      "DELETE FROM custom_reports WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("[report] Delete error", err);
    res.status(500).json({ error: "Failed to delete report" });
  }
}

// Rapor çalıştır (manuel)
export async function runCustomReport(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    const [rows] = await dbPool.query(
      "SELECT * FROM custom_reports WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    const reports = rows as any[];
    if (reports.length === 0) {
      return res.status(404).json({ error: "Report not found" });
    }

    const report = reports[0];
    const queryConfig = typeof report.query_config === "string" 
      ? JSON.parse(report.query_config) 
      : report.query_config;

    // Rapor çalıştırma kaydı oluştur
    const [runResult] = await dbPool.query(
      `INSERT INTO report_runs (report_id, status) VALUES (?, 'pending')`,
      [id]
    );
    const runId = (runResult as any).insertId;

    // TODO: Gerçek rapor oluşturma mantığı buraya eklenecek
    // Şimdilik basit bir response döndürüyoruz
    res.json({
      run_id: runId,
      message: "Report execution started",
      status: "pending",
    });
  } catch (err) {
    console.error("[report] Run error", err);
    res.status(500).json({ error: "Failed to run report" });
  }
}

// Rapor çalıştırma geçmişi
export async function getReportRuns(req: AuthRequest, res: Response) {
  const { report_id } = req.query;

  try {
    let query = `
      SELECT r.*
      FROM report_runs r
      INNER JOIN custom_reports cr ON r.report_id = cr.id
      WHERE cr.tenant_id = ?
    `;
    const params: any[] = [req.tenantId];

    if (report_id) {
      query += ` AND r.report_id = ?`;
      params.push(report_id);
    }

    query += ` ORDER BY r.created_at DESC LIMIT 50`;

    const [runs] = await dbPool.query(query, params);
    res.json(runs);
  } catch (err) {
    console.error("[report] Runs list error", err);
    res.status(500).json({ error: "Failed to list report runs" });
  }
}

