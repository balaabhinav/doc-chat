import { prisma } from '../db/prisma.client';
import { Prisma, Queue, QueueStatus, File } from '@prisma/client';

// Type for Queue with File relation
export type QueueWithFile = Queue & {
  file: File;
};

/**
 * Create queue entry
 */
export const createQueue = async (
  data: Prisma.QueueCreateInput
): Promise<Queue> => {
  return prisma.queue.create({ data });
};

/**
 * Find queue by ID
 */
export const findQueueById = async (
  id: string
): Promise<QueueWithFile | null> => {
  return prisma.queue.findUnique({
    where: { id },
    include: { file: true },
  });
};

/**
 * Find queue by file ID
 */
export const findQueueByFileId = async (
  fileId: string
): Promise<Queue | null> => {
  return prisma.queue.findUnique({
    where: { fileId },
  });
};

/**
 * Find queues by status
 */
export const findQueuesByStatus = async (
  status: QueueStatus
): Promise<QueueWithFile[]> => {
  return prisma.queue.findMany({
    where: { status },
    include: { file: true },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Find all queues
 */
export const findAllQueues = async (): Promise<QueueWithFile[]> => {
  return prisma.queue.findMany({
    include: { file: true },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Update queue
 */
export const updateQueue = async (
  id: string,
  data: Prisma.QueueUpdateInput
): Promise<Queue> => {
  return prisma.queue.update({
    where: { id },
    data,
  });
};

/**
 * Update queue status
 */
export const updateQueueStatus = async (
  id: string,
  status: QueueStatus,
  lastError?: string | null
): Promise<Queue> => {
  return prisma.queue.update({
    where: { id },
    data: {
      status,
      lastError,
      updatedAt: new Date(),
    },
  });
};

/**
 * Delete queue
 */
export const deleteQueue = async (id: string): Promise<Queue> => {
  return prisma.queue.delete({
    where: { id },
  });
};

/**
 * Count queues by status
 */
export const countQueuesByStatus = async (
  status: QueueStatus
): Promise<number> => {
  return prisma.queue.count({
    where: { status },
  });
};

/**
 * Count total queues
 */
export const countQueues = async (): Promise<number> => {
  return prisma.queue.count();
};

/**
 * Find queues with pagination
 */
export const findQueuesWithPagination = async (
  skip: number,
  take: number,
  status?: QueueStatus
): Promise<QueueWithFile[]> => {
  return prisma.queue.findMany({
    skip,
    take,
    where: status ? { status } : undefined,
    include: { file: true },
    orderBy: { createdAt: 'desc' },
  });
};
