import {
  findQueueById,
  findQueueByFileId,
  findAllQueues,
  countQueuesByStatus,
  createQueue as createQueueRepo,
  updateQueueStatus as updateQueueStatusRepo,
  QueueWithFile,
} from '../../repositories/queue.repository';
import { QueueStatus } from '@prisma/client';

/**
 * Queue item response DTO
 */
export interface QueueItemResponse {
  id: string;
  fileId: string;
  status: QueueStatus;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  file?: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
  };
}

/**
 * Queue statistics response DTO
 */
export interface QueueStatsResponse {
  queued: number;
  processing: number;
  success: number;
  error: number;
  total: number;
}

/**
 * Queue list response DTO
 */
export interface QueueListResponse {
  items: QueueItemResponse[];
  total: number;
}

/**
 * Queue service
 * Handles business logic for queue operations
 */
export class QueueService {
  /**
   * Create a new queue entry for a file
   */
  async createQueueEntry(fileId: string): Promise<QueueItemResponse> {
    const queueEntry = await createQueueRepo({
      file: {
        connect: { id: fileId },
      },
      status: 'queued',
    });

    return this.mapToResponse(queueEntry);
  }

  /**
   * Get queue item by ID
   */
  async getQueueById(id: string): Promise<QueueItemResponse | null> {
    const queueItem = await findQueueById(id);

    if (!queueItem) {
      return null;
    }

    return this.mapToResponseWithFile(queueItem);
  }

  /**
   * Get queue item by file ID
   */
  async getQueueByFileId(fileId: string): Promise<QueueItemResponse | null> {
    const queueItem = await findQueueByFileId(fileId);

    if (!queueItem) {
      return null;
    }

    return this.mapToResponse(queueItem);
  }

  /**
   * Get all queue items
   */
  async getAllQueues(): Promise<QueueListResponse> {
    const queueItems = await findAllQueues();

    return {
      items: queueItems.map((item) => this.mapToResponseWithFile(item)),
      total: queueItems.length,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStatsResponse> {
    const [queued, processing, success, error] = await Promise.all([
      countQueuesByStatus('queued'),
      countQueuesByStatus('processing'),
      countQueuesByStatus('success'),
      countQueuesByStatus('error'),
    ]);

    return {
      queued,
      processing,
      success,
      error,
      total: queued + processing + success + error,
    };
  }

  /**
   * Update queue status
   */
  async updateStatus(
    id: string,
    status: QueueStatus,
    lastError?: string | null
  ): Promise<QueueItemResponse> {
    const updatedQueue = await updateQueueStatusRepo(id, status, lastError);
    return this.mapToResponse(updatedQueue);
  }

  /**
   * Map queue item to response DTO
   */
  private mapToResponse(queueItem: any): QueueItemResponse {
    return {
      id: queueItem.id,
      fileId: queueItem.fileId,
      status: queueItem.status,
      lastError: queueItem.lastError,
      createdAt: queueItem.createdAt,
      updatedAt: queueItem.updatedAt,
    };
  }

  /**
   * Map queue item with file to response DTO
   */
  private mapToResponseWithFile(queueItem: QueueWithFile): QueueItemResponse {
    return {
      id: queueItem.id,
      fileId: queueItem.fileId,
      status: queueItem.status,
      lastError: queueItem.lastError,
      createdAt: queueItem.createdAt,
      updatedAt: queueItem.updatedAt,
      file: {
        id: queueItem.file.id,
        name: queueItem.file.name,
        mimeType: queueItem.file.mimeType,
        size: queueItem.file.size,
      },
    };
  }
}

/**
 * Singleton instance of the queue service
 */
let serviceInstance: QueueService | null = null;

/**
 * Get the queue service instance
 */
export const getQueueService = (): QueueService => {
  if (!serviceInstance) {
    serviceInstance = new QueueService();
  }
  return serviceInstance;
};
