import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import multer from "multer";
import path from "path";
import fs from "fs";

// Dosya yükleme için multer yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and PDFs are allowed."));
    }
  },
});

// Araç belgeleri listesi
export async function listVehicleDocuments(req: AuthRequest, res: Response) {
  const { vehicle_id } = req.params;

  try {
    const [documents] = await dbPool.query(
      `SELECT 
        d.*,
        s.name as uploaded_by_name
      FROM vehicle_documents d
      LEFT JOIN staff s ON d.uploaded_by = s.id
      WHERE d.tenant_id = ? AND d.vehicle_id = ?
      ORDER BY d.uploaded_at DESC`,
      [req.tenantId, vehicle_id]
    );
    res.json(documents);
  } catch (err) {
    console.error("[document] Vehicle documents list error", err);
    res.status(500).json({ error: "Failed to list vehicle documents" });
  }
}

// Araç belgesi yükle
export async function uploadVehicleDocument(req: AuthRequest, res: Response) {
  const { vehicle_id } = req.params;
  const { document_type, document_name, expiry_date, notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  if (!document_type || !document_name) {
    return res.status(400).json({ error: "Document type and name are required" });
  }

  try {
    const filePath = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    const [result] = await dbPool.query(
      `INSERT INTO vehicle_documents (
        tenant_id, vehicle_id, document_type, document_name,
        file_path, file_size, mime_type, uploaded_by,
        expiry_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        vehicle_id,
        document_type,
        document_name,
        filePath,
        fileSize,
        mimeType,
        req.userId || null,
        expiry_date || null,
        notes || null,
      ]
    );

    const docId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM vehicle_documents WHERE id = ?", [docId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error("[document] Upload vehicle document error", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

// Araç belgesi sil
export async function deleteVehicleDocument(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    // Önce dosyayı bul
    const [docRows] = await dbPool.query(
      "SELECT file_path FROM vehicle_documents WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    if ((docRows as any[]).length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = (docRows as any[])[0].file_path;
    const fullPath = path.join(__dirname, "../..", filePath);

    // Dosyayı sil
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Veritabanından sil
    await dbPool.query("DELETE FROM vehicle_documents WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("[document] Delete vehicle document error", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
}

// Süresi dolacak araç belgeleri
export async function getExpiringVehicleDocuments(req: AuthRequest, res: Response) {
  const { days = 30 } = req.query;

  try {
    const [documents] = await dbPool.query(
      `SELECT 
        d.*,
        v.maker,
        v.model,
        v.production_year as year,
        DATEDIFF(d.expiry_date, CURDATE()) as days_until_expiry
      FROM vehicle_documents d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      WHERE d.tenant_id = ?
        AND d.expiry_date IS NOT NULL
        AND d.expiry_date >= CURDATE()
        AND d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY d.expiry_date ASC`,
      [req.tenantId, days]
    );
    res.json(documents);
  } catch (err) {
    console.error("[document] Expiring documents error", err);
    res.status(500).json({ error: "Failed to get expiring documents" });
  }
}

// Müşteri belgeleri listesi
export async function listCustomerDocuments(req: AuthRequest, res: Response) {
  const { customer_id } = req.params;

  try {
    const [documents] = await dbPool.query(
      `SELECT 
        d.*,
        s1.name as uploaded_by_name,
        s2.name as verified_by_name
      FROM customer_documents d
      LEFT JOIN staff s1 ON d.uploaded_by = s1.id
      LEFT JOIN staff s2 ON d.verified_by = s2.id
      WHERE d.tenant_id = ? AND d.customer_id = ?
      ORDER BY d.uploaded_at DESC`,
      [req.tenantId, customer_id]
    );
    res.json(documents);
  } catch (err) {
    console.error("[document] Customer documents list error", err);
    res.status(500).json({ error: "Failed to list customer documents" });
  }
}

// Müşteri belgesi yükle
export async function uploadCustomerDocument(req: AuthRequest, res: Response) {
  const { customer_id } = req.params;
  const { document_type, document_name, expiry_date, notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "File is required" });
  }

  if (!document_type || !document_name) {
    return res.status(400).json({ error: "Document type and name are required" });
  }

  try {
    const filePath = `/uploads/${req.file.filename}`;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    const [result] = await dbPool.query(
      `INSERT INTO customer_documents (
        tenant_id, customer_id, document_type, document_name,
        file_path, file_size, mime_type, uploaded_by,
        expiry_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        customer_id,
        document_type,
        document_name,
        filePath,
        fileSize,
        mimeType,
        req.userId || null,
        expiry_date || null,
        notes || null,
      ]
    );

    const docId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM customer_documents WHERE id = ?", [docId]);
    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error("[document] Upload customer document error", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

// Müşteri belgesi doğrula
export async function verifyCustomerDocument(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { is_verified } = req.body;

  try {
    await dbPool.query(
      `UPDATE customer_documents 
       SET is_verified = ?, verified_by = ?, verified_at = NOW()
       WHERE id = ? AND tenant_id = ?`,
      [is_verified, req.userId || null, id, req.tenantId]
    );

    const [rows] = await dbPool.query("SELECT * FROM customer_documents WHERE id = ?", [id]);
    res.json((rows as any[])[0]);
  } catch (err) {
    console.error("[document] Verify document error", err);
    res.status(500).json({ error: "Failed to verify document" });
  }
}

// Müşteri belgesi sil
export async function deleteCustomerDocument(req: AuthRequest, res: Response) {
  const { id } = req.params;

  try {
    // Önce dosyayı bul
    const [docRows] = await dbPool.query(
      "SELECT file_path FROM customer_documents WHERE id = ? AND tenant_id = ?",
      [id, req.tenantId]
    );

    if ((docRows as any[]).length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = (docRows as any[])[0].file_path;
    const fullPath = path.join(__dirname, "../..", filePath);

    // Dosyayı sil
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Veritabanından sil
    await dbPool.query("DELETE FROM customer_documents WHERE id = ? AND tenant_id = ?", [id, req.tenantId]);

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("[document] Delete customer document error", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
}

