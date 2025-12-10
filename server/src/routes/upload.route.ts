import { Router, Request, Response } from 'express';
import { uploadSingle, handleUploadError } from '../middlewares/upload.middleware';
import * as fileUploadService from '../services/upload/FileUploadService';
import { getQueueService } from '../services/queue/QueueService';

const router = Router();
const queueService = getQueueService();

/**
 * POST /api/upload
 * Upload a file
 */
router.post(
  '/',
  uploadSingle,
  handleUploadError,
  async (req: Request, res: Response) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a file in the request',
        });
      }

      // Upload file and save to database
      const savedFile = await fileUploadService.uploadFile(req.file);

      // Create queue entry for processing
      const queueEntry = await queueService.createQueueEntry(savedFile.id);

      console.log(`[Upload] File uploaded and queued for processing: ${savedFile.id}`);

      // Return success response
      return res.status(201).json({
        id: savedFile.id,
        name: savedFile.name,
        url: savedFile.url,
        size: savedFile.size,
        mimeType: savedFile.mimeType,
        createdAt: savedFile.createdAt,
        queueId: queueEntry.id,
        queueStatus: queueEntry.status,
      });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
);

export default router;
