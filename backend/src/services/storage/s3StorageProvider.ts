import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { IStorageProvider, UploadResult, UploadOptions, DeleteOptions } from "./storageProvider";

/**
 * S3StorageProvider - AWS S3 or S3-compatible storage implementation
 */
export class S3StorageProvider implements IStorageProvider {
  private s3Client: S3Client;
  private cloudFrontClient?: CloudFrontClient;
  private bucketName: string;
  private baseUrl?: string; // Custom base URL (for CloudFront, custom domain, etc.)
  private cloudFrontDistributionId?: string;

  constructor() {
    const {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION = "us-east-1",
      AWS_S3_BUCKET,
      AWS_S3_ENDPOINT, // For S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
      AWS_S3_FORCE_PATH_STYLE = "false", // For S3-compatible services
      AWS_S3_BASE_URL, // Custom base URL for public access
      AWS_S3_SIGNED_URL_EXPIRES, // Signed URL expiration in seconds
      AWS_CLOUDFRONT_DISTRIBUTION_ID, // CloudFront distribution ID for cache invalidation
    } = process.env;

    // Health Check: Validate required configuration
    if (!AWS_S3_BUCKET) {
      const errorMessage = 
        "[S3StorageProvider] CRITICAL: AWS_S3_BUCKET environment variable is required.\n" +
        "Please set AWS_S3_BUCKET in your .env file.\n" +
        "Example: AWS_S3_BUCKET=your-bucket-name\n" +
        "If you want to use local storage instead, set STORAGE_PROVIDER=local";
      console.error(errorMessage);
      throw new Error("AWS_S3_BUCKET environment variable is required");
    }

    // Validate signed URL expiration if provided
    if (AWS_S3_SIGNED_URL_EXPIRES) {
      const expiresIn = Number(AWS_S3_SIGNED_URL_EXPIRES);
      if (isNaN(expiresIn) || expiresIn < 60 || expiresIn > 7 * 24 * 60 * 60) {
        console.warn(
          `[S3StorageProvider] WARNING: AWS_S3_SIGNED_URL_EXPIRES=${AWS_S3_SIGNED_URL_EXPIRES} is invalid. ` +
          `Must be between 60 (1 minute) and 604800 (7 days). Using default: 3600 seconds.`
        );
      }
    }

    // Log configuration status
    const hasCredentials = !!(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);
    const storageType = AWS_S3_ENDPOINT ? "S3-compatible" : "AWS S3";
    const authMethod = hasCredentials ? "Access Keys" : "IAM Role (recommended for production)";
    
    console.log(`[S3StorageProvider] Initializing ${storageType} storage:`);
    console.log(`  - Bucket: ${AWS_S3_BUCKET}`);
    console.log(`  - Region: ${AWS_REGION}`);
    console.log(`  - Authentication: ${authMethod}`);
    if (AWS_S3_ENDPOINT) {
      console.log(`  - Endpoint: ${AWS_S3_ENDPOINT}`);
      console.log(`  - Force Path Style: ${AWS_S3_FORCE_PATH_STYLE === "true"}`);
    }
    if (AWS_S3_BASE_URL) {
      console.log(`  - Custom Base URL: ${AWS_S3_BASE_URL}`);
    }
    console.log(`  - Signed URL Expiration: ${AWS_S3_SIGNED_URL_EXPIRES || 3600} seconds`);

    // Initialize CloudFront client if distribution ID is provided
    if (AWS_CLOUDFRONT_DISTRIBUTION_ID) {
      const cloudFrontConfig: any = {
        region: AWS_REGION,
      };

      if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
        cloudFrontConfig.credentials = {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        };
      }

      this.cloudFrontClient = new CloudFrontClient(cloudFrontConfig);
      this.cloudFrontDistributionId = AWS_CLOUDFRONT_DISTRIBUTION_ID;
      console.log(`  - CloudFront Distribution ID: ${AWS_CLOUDFRONT_DISTRIBUTION_ID}`);
    } else {
      console.log(`  - CloudFront: Not configured (CDN cache purge disabled)`);
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
   * Generate a unique file key with tenant isolation
   * Structure: tenants/{tenantId}/{folder}/{filename} or {folder}/{filename} if tenantId is not provided
   */
  private generateKey(
    folder: string | undefined, 
    filename: string | undefined, 
    tenantId?: number,
    originalName?: string
  ): string {
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

    // Build path parts with tenant isolation
    const parts: string[] = [];
    if (tenantId) {
      parts.push(`tenants/${tenantId}`);
    }
    if (folder) {
      parts.push(folder);
    }
    parts.push(finalFilename);
    
    return parts.join('/');
  }

  /**
   * Upload file buffer to S3
   * 
   * ContentType metadata is critical for:
   * - Proper browser rendering (image/webp for WebP images)
   * - CDN caching behavior
   * - Signed URL generation
   * 
   * Frontend sends files via FormData (multipart/form-data), but backend
   * converts all images to WebP format and sets ContentType: "image/webp"
   * This ensures consistent metadata regardless of original file format.
   */
  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const key = this.generateKey(options.folder, options.filename, options.tenantId);
    // ContentType is explicitly set by backend (e.g., "image/webp" for vehicle images)
    // This ensures S3 stores correct metadata for proper browser/CDN handling
    const contentType = options.contentType || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType, // Critical: Ensures S3 metadata matches actual file content
      // Make public if requested (for public buckets)
      ...(options.makePublic ? { ACL: "public-read" } : {}),
    });

    await this.s3Client.send(command);

    // Generate URL (use CDN if public and baseUrl is configured)
    const url = await this.getUrl(key, options.makePublic || false);

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
   * If AWS_S3_BASE_URL (CDN) is configured, returns CDN URL instead of signed URL for public files
   * Signed URL expiration is configurable via AWS_S3_SIGNED_URL_EXPIRES env variable (in seconds)
   */
  async getUrl(key: string, isPublic: boolean = false): Promise<string> {
    // If custom base URL (CDN) is provided and file is public, use CDN URL
    // This optimizes performance by serving from CDN edge locations
    if (this.baseUrl && isPublic) {
      // Remove leading slash if present
      const cleanKey = key.startsWith('/') ? key.slice(1) : key;
      return `${this.baseUrl}/${cleanKey}`;
    }

    // For private files or when CDN is not configured, use signed URLs
    // Note: Custom base URLs should also use signed URLs for security
    if (this.baseUrl && !isPublic) {
      // Still generate signed URL for security, but use custom base if configured
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

  /**
   * Purge CDN cache for a file (CloudFront invalidation)
   * This is called asynchronously after file updates/deletes to clear CDN cache
   * 
   * Note: CloudFront invalidation has costs:
   * - First 1,000 paths per month: Free
   * - Additional paths: $0.005 per path
   * 
   * This method runs in background and doesn't block the main request
   */
  async purgeCache(key: string): Promise<boolean> {
    // Only purge if CloudFront is configured
    if (!this.cloudFrontClient || !this.cloudFrontDistributionId) {
      return true; // Not an error, just not configured
    }

    try {
      // Normalize key (remove leading slash)
      const cleanKey = key.startsWith('/') ? key.slice(1) : key;
      
      // Create invalidation path
      // CloudFront paths must start with /
      const invalidationPath = `/${cleanKey}`;

      const command = new CreateInvalidationCommand({
        DistributionId: this.cloudFrontDistributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: 1,
            Items: [invalidationPath],
          },
          CallerReference: `purge-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        },
      });

      // Execute asynchronously (fire and forget)
      // Don't await to avoid blocking the main request
      this.cloudFrontClient.send(command).catch((error) => {
        console.error(`[S3Storage] Failed to purge CDN cache for ${key}:`, error);
        // Don't throw - CDN purge failure shouldn't break the application
      });

      console.log(`[S3Storage] CDN cache purge initiated for: ${invalidationPath}`);
      return true;
    } catch (error) {
      console.error(`[S3Storage] Error initiating CDN cache purge for ${key}:`, error);
      // Return true to not break the main flow
      return true;
    }
  }
}


