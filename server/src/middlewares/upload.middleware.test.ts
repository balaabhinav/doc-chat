import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { handleUploadError, uploadSingle } from './upload.middleware';

describe('upload.middleware', () => {
  const createTestApp = () => {
    const app = express();
    app.post(
      '/upload',
      uploadSingle,
      handleUploadError,
      (req, res) => {
        return res.status(200).json({ originalName: req.file?.originalname });
      }
    );
    return app;
  };

  it('allows uploads with supported mime types', async () => {
    const res = await request(createTestApp())
      .post('/upload')
      .attach('file', Buffer.from('hello world'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(200);
    expect(res.body.originalName).toBe('test.txt');
  });

  it('blocks uploads with unsupported mime types', async () => {
    const res = await request(createTestApp())
      .post('/upload')
      .attach('file', Buffer.from('hello world'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Upload error');
    expect(res.body.message).toContain('File type application/x-msdownload is not allowed');
  });

  it('returns a friendly message when file size exceeds limit', () => {
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    const error = new multer.MulterError('LIMIT_FILE_SIZE');

    handleUploadError(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'File too large',
      message: 'Maximum file size is 10MB',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through to the next handler when there is no error', () => {
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    handleUploadError(null, req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('handles generic upload errors with a 400 response', () => {
    const req = {} as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    const error = new Error('Something went wrong');

    handleUploadError(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Upload error',
      message: 'Something went wrong',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
