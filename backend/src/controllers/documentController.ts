import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import { generateSalesContract, generateInvoice } from "../services/pdfService";
import multer from "multer";
import { StorageService } from "../services/storage/storageService";
import { uploadLimiter } from "../middleware/rateLimiter";
import { resolveStaffIdForTenant } from "../utils/staffUtils";

const docStorage = multer.memoryStorage();
const DOC_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DOC_ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const documentUpload = multer({
  storage: docStorage,
  limits: { fileSize: DOC_MAX_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (DOC_ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error(`Geçersiz dosya türü. Sadece PDF ve resim (JPEG, PNG, WebP) kabul edilir.`));
  },
});

export async function generateSalesContractPDF(req: AuthRequest, res: Response) {
  const { sale_id } = req.params;

  if (!sale_id) {
    return res.status(400).json({ error: "Sale ID is required" });
  }

  try {
    // Fetch sale data with related information
    const [sales] = await dbPool.query(
      `SELECT 
        vs.*,
        v.maker,
        v.model,
        v.production_year,
        v.chassis_no,
        v.km,
        v.color,
        v.engine_no,
        v.fuel,
        v.transmission,
        b.name as branch_name,
        s.name as staff_name,
        t.name as tenant_name
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN branches b ON vs.branch_id = b.id
      LEFT JOIN staff s ON vs.staff_id = s.id
      LEFT JOIN tenants t ON vs.tenant_id = t.id
      WHERE vs.id = ? AND vs.tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const salesArray = sales as any[];
    if (salesArray.length === 0) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const sale = salesArray[0];

    // Check for installment sale
    let installment = null;
    const [installments] = await dbPool.query(
      `SELECT 
        down_payment,
        installment_count,
        installment_amount,
        total_amount
      FROM vehicle_installment_sales
      WHERE sale_id = ? AND tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const installmentsArray = installments as any[];
    if (installmentsArray.length > 0) {
      installment = installmentsArray[0];
    }

    const saleData = {
      sale_id: sale.id,
      sale_date: sale.sale_date,
      sale_amount: Number(sale.sale_amount),
      sale_currency: sale.sale_currency,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_address: sale.customer_address,
      plate_number: sale.plate_number,
      vehicle: {
        maker: sale.maker,
        model: sale.model,
        production_year: sale.production_year,
        chassis_no: sale.chassis_no,
        km: sale.km,
        color: sale.color,
        engine_no: sale.engine_no,
        fuel: sale.fuel,
        transmission: sale.transmission,
      },
      branch_name: sale.branch_name,
      staff_name: sale.staff_name,
      tenant_name: sale.tenant_name,
      installment: installment,
    };

    generateSalesContract(saleData, res);
  } catch (error) {
    console.error("[document] Generate sales contract error:", error);
    res.status(500).json({ error: "Failed to generate sales contract" });
  }
}

export async function generateInvoicePDF(req: AuthRequest, res: Response) {
  const { sale_id } = req.params;

  if (!sale_id) {
    return res.status(400).json({ error: "Sale ID is required" });
  }

  try {
    // Fetch sale data with related information
    const [sales] = await dbPool.query(
      `SELECT 
        vs.*,
        v.maker,
        v.model,
        v.production_year,
        v.chassis_no,
        v.km,
        v.color,
        v.engine_no,
        v.fuel,
        v.transmission,
        b.name as branch_name,
        s.name as staff_name,
        t.name as tenant_name
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN branches b ON vs.branch_id = b.id
      LEFT JOIN staff s ON vs.staff_id = s.id
      LEFT JOIN tenants t ON vs.tenant_id = t.id
      WHERE vs.id = ? AND vs.tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const salesArray = sales as any[];
    if (salesArray.length === 0) {
      return res.status(404).json({ error: "Sale not found" });
    }

    const sale = salesArray[0];

    // Check for installment sale
    let installment = null;
    const [installments] = await dbPool.query(
      `SELECT 
        down_payment,
        installment_count,
        installment_amount,
        total_amount
      FROM vehicle_installment_sales
      WHERE sale_id = ? AND tenant_id = ?`,
      [sale_id, req.tenantId]
    );

    const installmentsArray = installments as any[];
    if (installmentsArray.length > 0) {
      installment = installmentsArray[0];
    }

    const saleData = {
      sale_id: sale.id,
      sale_date: sale.sale_date,
      sale_amount: Number(sale.sale_amount),
      sale_currency: sale.sale_currency,
      customer_name: sale.customer_name,
      customer_phone: sale.customer_phone,
      customer_address: sale.customer_address,
      plate_number: sale.plate_number,
      vehicle: {
        maker: sale.maker,
        model: sale.model,
        production_year: sale.production_year,
        chassis_no: sale.chassis_no,
        km: sale.km,
        color: sale.color,
        engine_no: sale.engine_no,
        fuel: sale.fuel,
        transmission: sale.transmission,
      },
      branch_name: sale.branch_name,
      staff_name: sale.staff_name,
      tenant_name: sale.tenant_name,
      installment: installment,
    };

    generateInvoice(saleData, res);
  } catch (error) {
    console.error("[document] Generate invoice error:", error);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
}

export async function getExpiringVehicleDocuments(req: AuthRequest, res: Response) {
  const { days = 30 } = req.query;
  const daysNum = Math.max(1, Math.min(365, Number(days) || 30));

  try {
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + daysNum);

    const [documents] = await dbPool.query(
      `SELECT 
        vd.*,
        v.maker,
        v.model,
        v.production_year,
        v.vehicle_number,
        v.chassis_no,
        DATEDIFF(vd.expiry_date, CURDATE()) as days_until_expiry
      FROM vehicle_documents vd
      INNER JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE vd.tenant_id = ?
        AND vd.expiry_date IS NOT NULL
        AND vd.expiry_date >= CURDATE()
        AND vd.expiry_date <= ?
      ORDER BY vd.expiry_date ASC`,
      [req.tenantId, expiryDate.toISOString().split('T')[0]]
    );

    res.json(documents);
  } catch (error) {
    console.error("[document] Get expiring documents error:", error);
    res.status(500).json({ error: "Failed to fetch expiring documents" });
  }
}

export async function getVehicleDocuments(req: AuthRequest, res: Response) {
  const { vehicle_id } = req.params;

  if (!vehicle_id) {
    return res.status(400).json({ error: "Vehicle ID is required" });
  }

  try {
    const [documents] = await dbPool.query(
      `SELECT * FROM vehicle_documents 
       WHERE vehicle_id = ? AND tenant_id = ? 
       ORDER BY id DESC`,
      [vehicle_id, req.tenantId]
    );

    res.json(documents);
  } catch (error) {
    console.error("[document] Get vehicle documents error:", error);
    res.status(500).json({ error: "Failed to fetch vehicle documents" });
  }
}

export async function getCustomerDocuments(req: AuthRequest, res: Response) {
  const customer_id = req.params.customer_id || req.params.id;

  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  try {
    const [customerRows] = await dbPool.query(
      "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
      [customer_id, req.tenantId]
    );
    const customerRowsArray = customerRows as any[];
    if (customerRowsArray.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const [documents] = await dbPool.query(
      `SELECT * FROM customer_documents 
       WHERE customer_id = ? AND tenant_id = ? 
       ORDER BY uploaded_at DESC`,
      [customer_id, req.tenantId]
    );

    const docsArray = documents as any[];
    const docsWithUrls = await Promise.all(
      docsArray.map(async (doc) => {
        const key = doc.file_path.startsWith("/uploads/") ? doc.file_path.replace(/^\/uploads\//, "") : doc.file_path;
        const url = await StorageService.getUrl(key, true);
        return { ...doc, url };
      })
    );

    res.json(docsWithUrls);
  } catch (error) {
    console.error("[document] Get customer documents error:", error);
    res.status(500).json({ error: "Failed to fetch customer documents" });
  }
}

export async function uploadCustomerDocument(req: AuthRequest, res: Response) {
  const customer_id = req.params.customer_id || req.params.id;

  if (!customer_id || !req.file) {
    return res.status(400).json({ error: "Customer ID and file are required" });
  }

  const document_type = (req.body.document_type || "other") as string;
  const document_name = (req.body.document_name || req.file.originalname || "Belge") as string;
  const expiry_date = req.body.expiry_date || null;
  const notes = req.body.notes || null;

  const validTypes = ["id_card", "driving_license", "passport", "address_proof", "bank_statement", "other"];
  if (!validTypes.includes(document_type)) {
    return res.status(400).json({ error: "Invalid document_type" });
  }

  try {
    const [customerRows] = await dbPool.query(
      "SELECT id FROM customers WHERE id = ? AND tenant_id = ?",
      [customer_id, req.tenantId]
    );
    const customerRowsArray = customerRows as any[];
    if (customerRowsArray.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const ext = req.file.originalname.split(".").pop() || "bin";
    const filename = req.file.originalname || `doc_${Date.now()}.${ext}`;

    const uploadResult = await StorageService.upload(req.file.buffer, {
      folder: "documents/customers",
      tenantId: req.tenantId,
      filename: `${customer_id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      contentType: req.file.mimetype,
      makePublic: true,
    });

    const uploadedBy = req.tenantId != null ? await resolveStaffIdForTenant(req.tenantId) : null;

    const [result] = await dbPool.query(
      `INSERT INTO customer_documents (
        tenant_id, customer_id, document_type, document_name, file_path,
        file_size, mime_type, uploaded_by, expiry_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        customer_id,
        document_type,
        document_name,
        uploadResult.key,
        req.file.size,
        req.file.mimetype,
        uploadedBy,
        expiry_date || null,
        notes || null,
      ]
    );

    const docId = (result as any).insertId;
    const [rows] = await dbPool.query("SELECT * FROM customer_documents WHERE id = ?", [docId]);
    const doc = (rows as any[])[0];
    const key = doc.file_path.startsWith("/uploads/") ? doc.file_path.replace(/^\/uploads\//, "") : doc.file_path;
    const url = await StorageService.getUrl(key, true);

    res.status(201).json({ ...doc, url });
  } catch (error) {
    console.error("[document] Upload customer document error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

export async function deleteCustomerDocument(req: AuthRequest, res: Response) {
  const document_id = req.params.document_id || req.params.id;

  if (!document_id) {
    return res.status(400).json({ error: "Document ID is required" });
  }

  try {
    const [rows] = await dbPool.query(
      "SELECT id, file_path FROM customer_documents WHERE id = ? AND tenant_id = ?",
      [document_id, req.tenantId]
    );
    const docsArray = rows as any[];
    if (docsArray.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = docsArray[0];
    const key = doc.file_path.startsWith("/uploads/") ? doc.file_path.replace(/^\/uploads\//, "") : doc.file_path;

    await dbPool.query("DELETE FROM customer_documents WHERE id = ? AND tenant_id = ?", [document_id, req.tenantId]);

    try {
      await StorageService.delete(key);
    } catch (storageErr) {
      console.warn("[document] Failed to delete file from storage:", storageErr);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[document] Delete customer document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
}
