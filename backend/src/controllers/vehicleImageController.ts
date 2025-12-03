import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// Dosya yükleme için multer yapılandırması
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/vehicles");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `vehicle-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images (JPEG, PNG, WEBP) are allowed."));
    }
  },
});

// Resim optimizasyonu
async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize(1920, 1080, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

export async function listVehicleImages(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;

  try {
    // Check if vehicle exists and belongs to tenant
    const [vehicleRows] = await dbPool.query(
      "SELECT id FROM vehicles WHERE id = ? AND tenant_id = ?",
      [vehicle_id, req.tenantId]
    );
    const vehicleRowsArray = vehicleRows as any[];
    if (vehicleRowsArray.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const [images] = await dbPool.query(
      `SELECT 
        id,
        image_path,
        image_filename,
        file_size,
        mime_type,
        is_primary,
        display_order,
        created_at,
        CONCAT('/uploads/vehicles/', image_filename) as url
      FROM vehicle_images
      WHERE tenant_id = ? AND vehicle_id = ?
      ORDER BY is_primary DESC, display_order ASC, created_at ASC`,
      [req.tenantId, vehicle_id]
    );

    res.json(images);
  } catch (err) {
    console.error("[vehicleImage] List error", err);
    res.status(500).json({ error: "Failed to list images" });
  }
}

export async function uploadVehicleImage(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;

  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  try {
    // Check if vehicle exists and belongs to tenant
    const [vehicleRows] = await dbPool.query(
      "SELECT id FROM vehicles WHERE id = ? AND tenant_id = ?",
      [vehicle_id, req.tenantId]
    );
    const vehicleRowsArray = vehicleRows as any[];
    if (vehicleRowsArray.length === 0) {
      // Delete uploaded file if vehicle not found
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const originalPath = req.file.path;
    const optimizedFilename = `optimized-${req.file.filename}`;
    const optimizedPath = path.join(path.dirname(originalPath), optimizedFilename);

    // Optimize image
    try {
      await optimizeImage(originalPath, optimizedPath);
      // Delete original if optimization successful
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
    } catch (optimizeError) {
      console.error("[vehicleImage] Optimization error", optimizeError);
      // Continue with original if optimization fails
    }

    const finalPath = fs.existsSync(optimizedPath) ? optimizedPath : originalPath;
    const finalFilename = fs.existsSync(optimizedPath) ? optimizedFilename : req.file.filename;

    // Get file stats
    const stats = fs.statSync(finalPath);
    const fileSize = stats.size;

    // Get display order (next available)
    const [orderRows] = await dbPool.query(
      "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM vehicle_images WHERE vehicle_id = ?",
      [vehicle_id]
    );
    const nextOrder = (orderRows as any[])[0]?.next_order || 1;

    // Insert into database
    const [result] = await dbPool.query(
      `INSERT INTO vehicle_images (
        tenant_id, vehicle_id, image_path, image_filename,
        file_size, mime_type, display_order, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        vehicle_id,
        `/uploads/vehicles/${finalFilename}`,
        finalFilename,
        fileSize,
        req.file.mimetype,
        nextOrder,
        req.userId || null,
      ]
    );

    const imageId = (result as any).insertId;
    const [rows] = await dbPool.query(
      `SELECT 
        id,
        image_path,
        image_filename,
        file_size,
        mime_type,
        is_primary,
        display_order,
        created_at,
        CONCAT('/uploads/vehicles/', image_filename) as url
      FROM vehicle_images WHERE id = ?`,
      [imageId]
    );

    res.status(201).json((rows as any[])[0]);
  } catch (err) {
    console.error("[vehicleImage] Upload error", err);
    // Clean up uploaded file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload image" });
  }
}

export async function setPrimaryImage(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const image_id = req.params.image_id;

  try {
    // Check if image exists and belongs to tenant
    const [imageRows] = await dbPool.query(
      `SELECT id FROM vehicle_images 
       WHERE id = ? AND vehicle_id = ? AND tenant_id = ?`,
      [image_id, vehicle_id, req.tenantId]
    );
    const imageRowsArray = imageRows as any[];
    if (imageRowsArray.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Start transaction: unset all primary images for this vehicle, then set the selected one
    await dbPool.query(
      "UPDATE vehicle_images SET is_primary = FALSE WHERE vehicle_id = ? AND tenant_id = ?",
      [vehicle_id, req.tenantId]
    );

    await dbPool.query(
      "UPDATE vehicle_images SET is_primary = TRUE WHERE id = ? AND tenant_id = ?",
      [image_id, req.tenantId]
    );

    // Get updated image
    const [updatedRows] = await dbPool.query(
      `SELECT 
        id,
        image_path,
        image_filename,
        file_size,
        mime_type,
        is_primary,
        display_order,
        created_at,
        CONCAT('/uploads/vehicles/', image_filename) as url
      FROM vehicle_images WHERE id = ?`,
      [image_id]
    );

    res.json((updatedRows as any[])[0]);
  } catch (err) {
    console.error("[vehicleImage] Set primary error", err);
    res.status(500).json({ error: "Failed to set primary image" });
  }
}

export async function deleteVehicleImage(req: AuthRequest, res: Response) {
  const vehicle_id = req.params.vehicle_id || req.params.id;
  const image_id = req.params.image_id;

  try {
    // Check if image exists and belongs to tenant
    const [imageRows] = await dbPool.query(
      `SELECT image_filename, image_path FROM vehicle_images 
       WHERE id = ? AND vehicle_id = ? AND tenant_id = ?`,
      [image_id, vehicle_id, req.tenantId]
    );
    const imageRowsArray = imageRows as any[];
    if (imageRowsArray.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }

    const image = imageRowsArray[0];
    const filePath = path.join(__dirname, "../../uploads/vehicles", image.image_filename);

    // Delete from database
    await dbPool.query(
      "DELETE FROM vehicle_images WHERE id = ? AND tenant_id = ?",
      [image_id, req.tenantId]
    );

    // Delete file from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("[vehicleImage] Delete error", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
}
