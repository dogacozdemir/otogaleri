import { IStorageProvider, UploadResult, UploadOptions } from "./storageProvider";
import { S3StorageProvider } from "./s3StorageProvider";
import { LocalStorageProvider } from "./localStorageProvider";

/**
 * StorageService - Factory and wrapper for storage providers
 * 
 * Automatically selects the appropriate storage provider based on environment variables.
 * Falls back to local storage if S3 is not configured.
 */
export class StorageService {
  private static instance: IStorageProvider | null = null;

  /**
   * Get the storage provider instance (singleton)
   */
  static getInstance(): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    // Check if S3 is configured
    const useS3 = process.env.AWS_S3_BUCKET && 
                  process.env.STORAGE_PROVIDER !== "local";

    if (useS3) {
      try {
        this.instance = new S3StorageProvider();
        console.log("[StorageService] Using S3 storage provider");
        return this.instance;
      } catch (error) {
        console.warn("[StorageService] Failed to initialize S3, falling back to local storage:", error);
        this.instance = new LocalStorageProvider();
        return this.instance;
      }
    } else {
      this.instance = new LocalStorageProvider();
      console.log("[StorageService] Using local storage provider");
      return this.instance;
    }
  }

  /**
   * Upload a file
   */
  static async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const provider = this.getInstance();
    return provider.upload(buffer, options);
  }

  /**
   * Delete a file
   */
  static async delete(key: string): Promise<boolean> {
    const provider = this.getInstance();
    return provider.delete(key);
  }

  /**
   * Get file URL
   */
  static async getUrl(key: string): Promise<string> {
    const provider = this.getInstance();
    return provider.getUrl(key);
  }

  /**
   * Check if file exists
   */
  static async exists(key: string): Promise<boolean> {
    const provider = this.getInstance();
    return provider.exists(key);
  }

  /**
   * Get file metadata
   */
  static async getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified?: Date } | null> {
    const provider = this.getInstance();
    return provider.getMetadata(key);
  }
}


