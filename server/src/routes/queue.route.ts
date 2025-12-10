import { Router, Request, Response } from 'express';
import { getQueueService } from '../services/queue/QueueService';

const router = Router();
const queueService = getQueueService();

/**
 * GET /api/queue/:id
 * Get queue item by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const queueItem = await queueService.getQueueById(id);

    if (!queueItem) {
      return res.status(404).json({
        error: 'Queue item not found',
        message: `No queue item found with ID: ${id}`,
      });
    }

    return res.status(200).json(queueItem);
  } catch (error) {
    console.error('Error fetching queue item:', error);
    return res.status(500).json({
      error: 'Failed to fetch queue item',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/queue/file/:fileId
 * Get queue item by file ID
 */
router.get('/file/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const queueItem = await queueService.getQueueByFileId(fileId);

    if (!queueItem) {
      return res.status(404).json({
        error: 'Queue item not found',
        message: `No queue item found for file ID: ${fileId}`,
      });
    }

    return res.status(200).json(queueItem);
  } catch (error) {
    console.error('Error fetching queue item by file ID:', error);
    return res.status(500).json({
      error: 'Failed to fetch queue item',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/queue
 * Get all queue items
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await queueService.getAllQueues();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching queue items:', error);
    return res.status(500).json({
      error: 'Failed to fetch queue items',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/queue/stats/summary
 * Get queue statistics
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = await queueService.getQueueStats();
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch queue stats',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
