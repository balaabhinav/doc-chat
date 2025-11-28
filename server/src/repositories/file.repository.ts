import { prisma } from '../db/prisma.client';
import { Prisma, File, Queue } from '@prisma/client';

// Type for File with Queue relation
export type FileWithQueue = File & {
  queue: Queue | null;
};

/**
 * Create a new file
 */
export const createFile = async (
  data: Prisma.FileCreateInput
): Promise<File> => {
  return prisma.file.create({ data });
};

/**
 * Find file by ID
 */
export const findFileById = async (
  id: string
): Promise<FileWithQueue | null> => {
  return prisma.file.findUnique({
    where: { id },
    include: { queue: true },
  });
};

/**
 * Find all files
 */
export const findAllFiles = async (): Promise<FileWithQueue[]> => {
  return prisma.file.findMany({
    include: { queue: true },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Update file
 */
export const updateFile = async (
  id: string,
  data: Prisma.FileUpdateInput
): Promise<File> => {
  return prisma.file.update({
    where: { id },
    data,
  });
};

/**
 * Delete file (will cascade to queue)
 */
export const deleteFile = async (id: string): Promise<File> => {
  return prisma.file.delete({
    where: { id },
  });
};

/**
 * Find files by mime type
 */
export const findFilesByMimeType = async (
  mimeType: string
): Promise<File[]> => {
  return prisma.file.findMany({
    where: { mimeType },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Count total files
 */
export const countFiles = async (): Promise<number> => {
  return prisma.file.count();
};

/**
 * Find files with pagination
 */
export const findFilesWithPagination = async (
  skip: number,
  take: number
): Promise<FileWithQueue[]> => {
  return prisma.file.findMany({
    skip,
    take,
    include: { queue: true },
    orderBy: { createdAt: 'desc' },
  });
};
