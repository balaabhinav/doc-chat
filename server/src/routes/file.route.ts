import { Router, Request, Response } from 'express';
import * as fileUploadService from '../services/upload/FileUploadService';

const router = Router();

/**
 * GET /api/files
 * Get all files
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const files = await fileUploadService.getAllFiles();
    
    return res.status(200).json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return res.status(500).json({
      error: 'Failed to fetch files',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/files/:id
 * Download a file by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Fetch file and stream
    const result = await fileUploadService.fetchFileById(id);
    
    // Set response headers
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.size);
    
    // Pipe the stream to response
    result.stream.pipe(res);
    
    // Handle stream errors
    result.stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to stream file',
          message: error.message,
        });
      }
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    
    if (error instanceof Error && error.message === 'File not found') {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist',
      });
    }
    
    return res.status(500).json({
      error: 'Failed to fetch file',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * DELETE /api/files/:id
 * Delete a file by ID
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await fileUploadService.deleteFileById(id);
    
    return res.status(200).json({
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    
    if (error instanceof Error && error.message === 'File not found') {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist',
      });
    }
    
    return res.status(500).json({
      error: 'Failed to delete file',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
