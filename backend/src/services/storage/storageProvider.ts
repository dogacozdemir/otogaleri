/**
 * StorageProvider Interface
 * 
 * Abstract interface for file storage operations.
 * Supports both local filesystem (development) and S3-compatible storage (production).
 */

export interface UploadResult {
  key: string; // File identifier (path/key in storage)
  url: string; // Public URL to access the file
  size: number; // File size in bytes
  mimeType: string; // MIME type of the file
}

export interface UploadOptions {
  folder?: string; // Folder/prefix in storage (e.g., "vehicles", "documents")
  filename?: string; // Custom filename (optional, will be generated if not provided)
  contentType?: string; // MIME type
  makePublic?: boolean; // Whether file should be publicly accessible
}

export interface DeleteOptions {
  key: string; // File key/path to delete
}

/**
 * StorageProvider - Interface for file storage operations
 */
export interface IStorageProvider {
  /**
   * Upload a file buffer to storage
   * @param buffer - File buffer
   * @param options - Upload options
   * @returns Upload result with key and URL
   */
  upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file from storage
   * @param key - File key/path
   * @returns True if deleted successfully
   */
  delete(key: string): Promise<boolean>;

  /**
   * Get public URL for a file
   * @param key - File key/path
   * @returns Public URL
   */
  getUrl(key: string): Promise<string>;

  /**
   * Check if file exists
   * @param key - File key/path
   * @returns True if file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get file metadata
   * @param key - File key/path
   * @returns File metadata (size, contentType, etc.)
   */
  getMetadata(key: string): Promise<{ size: number; contentType: string; lastModified?: Date } | null>;
}


