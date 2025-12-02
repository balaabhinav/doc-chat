import { Readable } from 'stream';

/**
 * Result of a file upload operation
 */
export interface UploadResult {
  url: string;
  size: number;
  mimeType: string;
  originalName: string;
}

/**
 * Result of a file fetch operation
 */
export interface FetchResult {
  stream: Readable;
  mimeType: string;
  size: number;
  filename: string;
}

/**
 * Strategy interface for file upload operations
 * Implementations handle different storage backends (local FS, S3, etc.)
 */
export interface IFileUploadStrategy {
  /**
   * Upload a file to the storage backend
   * @param file - The file to upload (from multer)
   * @returns Upload result with file URL and metadata
   */
  upload(file: Express.Multer.File): Promise<UploadResult>;

  /**
   * Fetch a file from the storage backend
   * @param fileUrl - The URL/path of the file to fetch
   * @returns Readable stream and file metadata
   */
  fetch(fileUrl: string): Promise<FetchResult>;

  /**
   * Delete a file from the storage backend
   * @param fileUrl - The URL/path of the file to delete
   */
  delete?(fileUrl: string): Promise<void>;
}
