import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { dbPool } from "../config/database";
import multer from "multer";
import sharp from "sharp";
const FileType = require("file-type");
import { StorageService } from "../services/storage/storageService";

// File upload configuration - use memory storage for S3 compatibility
const storage = multer.memoryStorage();

// Strict MIME type validation - only allow specific image types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = /\.(jpeg|jpg|png|webp)$/i;

// Maximum file size (configurable via env, default 10MB)
const MAX_FILE_SIZE = process.env.MAX_UPLOAD_SIZE 
  ? Number(process.env.MAX_UPLOAD_SIZE) 
  : 10 * 1024 * 1024; // 10MB default

export const upload = multer({
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Strict MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid MIME type: ${file.mimetype}. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`));
    }

    // Extension check
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(new Error(`Invalid file extension. Only .jpeg, .jpg, .png, .webp are allowed.`));
    }

    // Additional security: Check file size before processing
    if (req.headers['content-length']) {
      const contentLength = Number(req.headers['content-length']);
      if (contentLength > MAX_FILE_SIZE) {
        return cb(new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`));
      }
    }

    cb(null, true);
  },
});

/**
 * Optimize image to WebP format
 */
async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(1920, 1080, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 6 })
    .toBuffer();
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
        image_path as url
      FROM vehicle_images
      WHERE tenant_id = ? AND vehicle_id = ?
      ORDER BY is_primary DESC, display_order ASC, created_at ASC`,
      [req.tenantId, vehicle_id]
    );

    // Get URLs from storage service for each image
    const imagesArray = images as any[];
    const imagesWithUrls = await Promise.all(
      imagesArray.map(async (image) => {
        // Extract key from image_path (remove /uploads/ prefix if exists)
        const key = image.image_path.replace(/^\/uploads\//, '');
        const url = await StorageService.getUrl(key);
        return {
          ...image,
          url,
        };
      })
    );

    res.json(imagesWithUrls);
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

  // Additional file size validation (defense in depth)
  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ 
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    });
  }

  // Validate MIME type again (defense in depth)
  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: `Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.` 
    });
  }

  // Magic number validation - verify actual file content matches declared MIME type
  try {
    const detectedType = await FileType.fromBuffer(req.file.buffer);
    
    if (!detectedType) {
      return res.status(400).json({ 
        error: "Unable to detect file type. File may be corrupted or invalid." 
      });
    }

    // Map detected MIME types to allowed types
    const mimeTypeMap: Record<string, string[]> = {
      'image/jpeg': ['image/jpeg', 'image/jpg'],
      'image/jpg': ['image/jpeg', 'image/jpg'],
      'image/png': ['image/png'],
      'image/webp': ['image/webp'],
    };

    const allowedForDetected = mimeTypeMap[detectedType.mime] || [];
    
    if (!allowedForDetected.includes(req.file.mimetype)) {
      console.warn(`[vehicleImage] MIME type mismatch: declared=${req.file.mimetype}, detected=${detectedType.mime}`);
      return res.status(400).json({ 
        error: "File content does not match declared file type. File may be malicious or corrupted." 
      });
    }
  } catch (magicError) {
    // If magic number detection fails, log but allow (defense in depth - we already have MIME type check)
    console.warn("[vehicleImage] Magic number validation failed:", magicError);
    // Continue with upload but log the warning
  }

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

    // Optimize image to WebP
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await optimizeImage(req.file.buffer);
    } catch (optimizeError) {
      console.error("[vehicleImage] Optimization error", optimizeError);
      // Use original buffer if optimization fails
      optimizedBuffer = req.file.buffer;
    }

    // Get display order (next available)
    const [orderRows] = await dbPool.query(
      "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM vehicle_images WHERE vehicle_id = ?",
      [vehicle_id]
    );
    const nextOrder = (orderRows as any[])[0]?.next_order || 1;

    // Upload to storage (S3 or local)
    const uploadResult = await StorageService.upload(optimizedBuffer, {
      folder: "vehicles",
      contentType: "image/webp",
      makePublic: true, // Make images publicly accessible
    });

    // Insert into database
    const [result] = await dbPool.query(
      `INSERT INTO vehicle_images (
        tenant_id, vehicle_id, image_path, image_filename,
        file_size, mime_type, display_order, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenantId,
        vehicle_id,
        uploadResult.key, // Store the key/path from storage
        uploadResult.key.split('/').pop() || uploadResult.key, // Filename is the last part of key
        uploadResult.size,
        uploadResult.mimeType,
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
        created_at
      FROM vehicle_images WHERE id = ?`,
      [imageId]
    );

    const image = (rows as any[])[0];
    const url = await StorageService.getUrl(image.image_path);

    res.status(201).json({
      ...image,
      url,
    });
  } catch (err) {
    console.error("[vehicleImage] Upload error", err);
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
        created_at
      FROM vehicle_images WHERE id = ?`,
      [image_id]
    );

    const image = (updatedRows as any[])[0];
    const url = await StorageService.getUrl(image.image_path);

    res.json({
      ...image,
      url,
    });
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
    const storageKey = image.image_path; // Use the stored key/path

    // Delete from storage
    await StorageService.delete(storageKey);

    // Delete from database
    await dbPool.query(
      "DELETE FROM vehicle_images WHERE id = ? AND tenant_id = ?",
      [image_id, req.tenantId]
    );

    res.json({ message: "Image deleted successfully" });
  } catch (err) {
    console.error("[vehicleImage] Delete error", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
}
