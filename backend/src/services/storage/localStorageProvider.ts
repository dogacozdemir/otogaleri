import fs from "fs";
import path from "path";
import { IStorageProvider, UploadResult, UploadOptions } from "./storageProvider";

/**
 * LocalStorageProvider - Local filesystem storage implementation (for development)
 * 
 * This provider stores files in the local filesystem, similar to the current implementation.
 * Use this for development or when S3 is not available.
 */
export class LocalStorageProvider implements IStorageProvider {
  private basePath: string;

  constructor(basePath: string = path.join(__dirname, "../../../uploads")) {
    this.basePath = basePath;
    // Ensure base directory exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Generate a unique file key
   */
  private generateKey(folder: string | undefined, filename: string | undefined, originalName?: string): string {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    
    let finalFilename: string;
    if (filename) {
      finalFilename = filename;
    } else if (originalName) {
      const ext = originalName.split('.').pop();
      finalFilename = `${timestamp}-${random}.${ext}`;
    } else {
      finalFilename = `${timestamp}-${random}`;
    }

    if (folder) {
      return `${folder}/${finalFilename}`;
    }
    return finalFilename;
  }

  /**
   * Upload file buffer to local filesystem
   */
  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const key = this.generateKey(options.folder, options.filename);
    const filePath = path.join(this.basePath, key);
    const folderPath = path.dirname(filePath);

    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Get file stats
    const stats = fs.statSync(filePath);
    const contentType = options.contentType || "application/octet-stream";

    // Generate URL (relative to /uploads endpoint)
    const url = `/uploads/${key}`;

    return {
      key,
      url,
      size: stats.size,
      mimeType: contentType,
    };
  }

  /**
   * Delete file from local filesystem
   */
  async delete(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[LocalStorage] Failed to delete ${key}:`, error);
      return false;
    }
  }

  /**
   * Get public URL for a file
   */
  async getUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    return fs.existsSync(filePath);
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified?: Date } | null> {
    try {
      const filePath = path.join(this.basePath, key);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stats = fs.statSync(filePath);
      
      // Try to determine content type from extension
      const ext = path.extname(key).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.csv': 'text/csv',
      };

      return {
        size: stats.size,
        contentType: contentTypeMap[ext] || "application/octet-stream",
        lastModified: stats.mtime,
      };
    } catch (error) {
      return null;
    }
  }
}


