import { IFileUploadStrategy } from './IFileUploadStrategy';
import { createLocalFileUploadStrategy } from './LocalFileUploadStrategy';
import { createS3FileUploadStrategy } from './S3FileUploadStrategy';
import * as fileRepository from '../../repositories/file.repository';
import { File } from '@prisma/client';

/**
 * Get the appropriate upload strategy based on environment
 */
const getUploadStrategy = (): IFileUploadStrategy => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return createS3FileUploadStrategy();
  }
  
  return createLocalFileUploadStrategy();
};

/**
 * Upload a file and save metadata to database
 * This is the main orchestration function that combines upload strategy with database persistence
 */
export const uploadFile = async (file: Express.Multer.File): Promise<File> => {
  const strategy = getUploadStrategy();
  
  try {
    // Upload file using the appropriate strategy
    const uploadResult = await strategy.upload(file);
    
    // Save file metadata to database
    const savedFile = await fileRepository.createFile({
      name: uploadResult.originalName,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
    });
    
    return savedFile;
  } catch (error) {
    // If database save fails, attempt to clean up the uploaded file
    console.error('Failed to save file metadata to database:', error);
    throw error;
  }
};

/**
 * Fetch a file by ID from database and retrieve the file stream
 */
export const fetchFileById = async (fileId: string) => {
  const strategy = getUploadStrategy();
  
  // Get file metadata from database
  const file = await fileRepository.findFileById(fileId);
  
  if (!file) {
    throw new Error('File not found');
  }
  
  // Fetch the actual file using the appropriate strategy
  const fetchResult = await strategy.fetch(file.url);
  
  return {
    file,
    stream: fetchResult.stream,
    mimeType: fetchResult.mimeType,
    size: fetchResult.size,
    filename: fetchResult.filename,
  };
};

/**
 * Delete a file by ID from both storage and database
 */
export const deleteFileById = async (fileId: string): Promise<void> => {
  const strategy = getUploadStrategy();
  
  // Get file metadata from database
  const file = await fileRepository.findFileById(fileId);
  
  if (!file) {
    throw new Error('File not found');
  }
  
  try {
    // Delete from storage first
    if (strategy.delete) {
      await strategy.delete(file.url);
    }
  } catch (error) {
    console.warn('Failed to delete file from storage:', error);
    // Continue with database deletion even if storage deletion fails
  }
  
  // Delete from database
  await fileRepository.deleteFile(fileId);
};

/**
 * Get all files from database
 */
export const getAllFiles = async () => {
  return fileRepository.findAllFiles();
};

/**
 * Get file metadata by ID (without fetching the actual file)
 */
export const getFileMetadata = async (fileId: string) => {
  return fileRepository.findFileById(fileId);
};
