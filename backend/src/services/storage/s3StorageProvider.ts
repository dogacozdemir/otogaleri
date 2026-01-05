import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IStorageProvider, UploadResult, UploadOptions, DeleteOptions } from "./storageProvider";

/**
 * S3StorageProvider - AWS S3 or S3-compatible storage implementation
 */
export class S3StorageProvider implements IStorageProvider {
  private s3Client: S3Client;
  private bucketName: string;
  private baseUrl?: string; // Custom base URL (for CloudFront, custom domain, etc.)

  constructor() {
    const {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION = "us-east-1",
      AWS_S3_BUCKET,
      AWS_S3_ENDPOINT, // For S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
      AWS_S3_FORCE_PATH_STYLE = "false", // For S3-compatible services
      AWS_S3_BASE_URL, // Custom base URL for public access
    } = process.env;

    if (!AWS_S3_BUCKET) {
      throw new Error("AWS_S3_BUCKET environment variable is required");
    }

    this.bucketName = AWS_S3_BUCKET;
    this.baseUrl = AWS_S3_BASE_URL;

    // Configure S3 client
    const s3Config: any = {
      region: AWS_REGION,
    };

    // Add credentials if provided (for AWS S3)
    if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
      s3Config.credentials = {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      };
    }

    // For S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
    if (AWS_S3_ENDPOINT) {
      s3Config.endpoint = AWS_S3_ENDPOINT;
      s3Config.forcePathStyle = AWS_S3_FORCE_PATH_STYLE === "true";
    }

    this.s3Client = new S3Client(s3Config);
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
   * Upload file buffer to S3
   */
  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const key = this.generateKey(options.folder, options.filename);
    const contentType = options.contentType || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Make public if requested (for public buckets)
      ...(options.makePublic ? { ACL: "public-read" } : {}),
    });

    await this.s3Client.send(command);

    // Generate URL
    const url = await this.getUrl(key);

    return {
      key,
      url,
      size: buffer.length,
      mimeType: contentType,
    };
  }

  /**
   * Delete file from S3
   */
  async delete(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error(`[S3Storage] Failed to delete ${key}:`, error);
      return false;
    }
  }

  /**
   * Get signed URL for a file (private access with expiration)
   * Signed URL expiration is configurable via AWS_S3_SIGNED_URL_EXPIRES env variable (in seconds)
   */
  async getUrl(key: string): Promise<string> {
    // If custom base URL is provided (CloudFront, custom domain, etc.)
    // Note: Custom base URLs should also use signed URLs for security
    if (this.baseUrl) {
      // Still generate signed URL for security, but use custom base if configured
      // For now, we'll generate signed URL from S3 and return it
      // In production, you might want to use CloudFront signed URLs instead
    }

    // Generate signed URL with configurable expiration
    // Default: 1 hour (3600 seconds)
    // Configurable via AWS_S3_SIGNED_URL_EXPIRES environment variable
    const expiresIn = process.env.AWS_S3_SIGNED_URL_EXPIRES 
      ? Number(process.env.AWS_S3_SIGNED_URL_EXPIRES) 
      : 3600; // Default 1 hour

    // Validate expiration is within reasonable bounds (1 minute to 7 days)
    const minExpiration = 60; // 1 minute
    const maxExpiration = 7 * 24 * 60 * 60; // 7 days
    const validExpiration = Math.max(minExpiration, Math.min(maxExpiration, expiresIn));

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      // Always use signed URLs for security (even if bucket is public)
      // This ensures access control and prevents unauthorized access
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: validExpiration });
      return signedUrl;
    } catch (error) {
      // Fallback to direct URL if signing fails
      const region = process.env.AWS_REGION || "us-east-1";
      const endpoint = process.env.AWS_S3_ENDPOINT;
      
      if (endpoint) {
        // S3-compatible service
        return `${endpoint}/${this.bucketName}/${key}`;
      } else {
        // AWS S3
        return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
      }
    }
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified?: Date } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || "application/octet-stream",
        lastModified: response.LastModified,
      };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}


