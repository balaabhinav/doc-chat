import { IFileUploadStrategy, UploadResult, FetchResult } from './IFileUploadStrategy';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';

/**
 * MIME type mappings for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

/**
 * Get MIME type from file extension
 */
const getMimeType = (ext: string): string => {
  return MIME_TYPES[ext] || 'application/octet-stream';
};

/**
 * Generate a unique filename while preserving the original extension
 */
const generateFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const uuid = randomUUID();
  return `${uuid}${ext}`;
};

/**
 * Ensure upload directory exists
 */
const ensureUploadDir = async (uploadDir: string): Promise<void> => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

/**
 * Validate file path to prevent path traversal attacks
 */
const validateFilePath = (filePath: string, uploadDir: string): void => {
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(uploadDir)) {
    throw new Error('Invalid file path');
  }
};

/**
 * Upload a file to local file system
 */
const uploadFile = (uploadDir: string) => async (
  file: Express.Multer.File
): Promise<UploadResult> => {
  await ensureUploadDir(uploadDir);

  const filename = generateFilename(file.originalname);
  const filePath = path.join(uploadDir, filename);

  // Write file to disk
  await fs.writeFile(filePath, file.buffer);

  // Get file stats for size verification
  const stats = await fs.stat(filePath);

  return {
    url: `/uploads/${filename}`,
    size: stats.size,
    mimeType: file.mimetype,
    originalName: file.originalname,
  };
};

/**
 * Fetch a file from local file system
 */
const fetchFile = (uploadDir: string) => async (
  fileUrl: string
): Promise<FetchResult> => {
  // Extract filename from URL (e.g., /uploads/uuid-file.pdf -> uuid-file.pdf)
  const filename = path.basename(fileUrl);
  const filePath = path.join(uploadDir, filename);

  // Security: Prevent path traversal attacks
  validateFilePath(filePath, uploadDir);

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    throw new Error('File not found');
  }

  // Get file stats
  const stats = await fs.stat(filePath);

  // Determine MIME type from extension
  const ext = path.extname(filename).toLowerCase();
  const mimeType = getMimeType(ext);

  return {
    stream: createReadStream(filePath),
    mimeType,
    size: stats.size,
    filename,
  };
};

/**
 * Delete a file from local file system
 */
const deleteFile = (uploadDir: string) => async (
  fileUrl: string
): Promise<void> => {
  const filename = path.basename(fileUrl);
  const filePath = path.join(uploadDir, filename);

  // Security: Prevent path traversal attacks
  validateFilePath(filePath, uploadDir);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, which is okay for delete operation
    console.warn(`Failed to delete file ${filePath}:`, error);
  }
};

/**
 * Create a local file upload strategy
 * Factory function that returns an implementation of IFileUploadStrategy
 */
export const createLocalFileUploadStrategy = (
  uploadDir: string = 'uploaded_files'
): IFileUploadStrategy => {
  // Use absolute path relative to project root
  const absoluteUploadDir = path.resolve(process.cwd(), uploadDir);

  return {
    upload: uploadFile(absoluteUploadDir),
    fetch: fetchFile(absoluteUploadDir),
    delete: deleteFile(absoluteUploadDir),
  };
};
