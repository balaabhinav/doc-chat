import {
  findQueuesByStatus,
  updateQueueStatus,
} from '../../repositories/queue.repository';
import { getDocumentProcessingService } from '../ingestion/DocumentProcessingService';

/**
 * Queue worker that polls for queued items and processes them
 */
export class QueueWorker {
  private isRunning: boolean = false;
  private pollInterval: number;
  private processingService = getDocumentProcessingService();

  constructor(pollInterval: number = 5000) {
    this.pollInterval = pollInterval;
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[QueueWorker] Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log(`[QueueWorker] Starting worker with poll interval: ${this.pollInterval}ms`);

    // Start the polling loop
    this.poll();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    console.log('[QueueWorker] Stopping worker...');
    this.isRunning = false;
  }

  /**
   * Main polling loop
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processNextItem();
      } catch (error) {
        console.error('[QueueWorker] Error in polling loop:', error);
      }

      // Wait for the poll interval before checking again
      await this.sleep(this.pollInterval);
    }

    console.log('[QueueWorker] Worker stopped');
  }

  /**
   * Process the next queued item
   */
  private async processNextItem(): Promise<void> {
    try {
      // Find queued items
      const queuedItems = await findQueuesByStatus('queued');

      if (queuedItems.length === 0) {
        // No items to process
        return;
      }

      // Get the first item
      const item = queuedItems[0];
      console.log(`[QueueWorker] Found queued item: ${item.id} for file: ${item.file.name}`);

      // Update status to processing
      await updateQueueStatus(item.id, 'processing');
      console.log(`[QueueWorker] Updated status to 'processing' for item: ${item.id}`);

      try {
        // Process the document
        const result = await this.processingService.processDocument(item);
        
        console.log(
          `[QueueWorker] Successfully processed file: ${item.file.name} ` +
          `(${result.chunksCreated} chunks, ${result.vectorsInserted} vectors, ${result.processingTimeMs}ms)`
        );

        // Update status to success
        await updateQueueStatus(item.id, 'success', null);
        console.log(`[QueueWorker] Updated status to 'success' for item: ${item.id}`);
      } catch (processingError) {
        // Processing failed, update status to error
        const errorMessage =
          processingError instanceof Error
            ? processingError.message
            : 'Unknown error occurred';

        console.error(
          `[QueueWorker] Failed to process file: ${item.file.name}`,
          processingError
        );

        await updateQueueStatus(item.id, 'error', errorMessage);
        console.log(`[QueueWorker] Updated status to 'error' for item: ${item.id}`);
      }
    } catch (error) {
      console.error('[QueueWorker] Error processing queue item:', error);
    }
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; pollInterval: number } {
    return {
      isRunning: this.isRunning,
      pollInterval: this.pollInterval,
    };
  }
}

/**
 * Create a queue worker instance
 */
export const createQueueWorker = (pollInterval?: number): QueueWorker => {
  const interval = pollInterval || parseInt(process.env.WORKER_POLL_INTERVAL || '5000', 10);
  return new QueueWorker(interval);
};
