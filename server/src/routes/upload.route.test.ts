import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import uploadRoute from './upload.route';
import * as fileUploadService from '../services/upload/FileUploadService';

vi.mock('../services/upload/FileUploadService', () => ({
  __esModule: true,
  uploadFile: vi.fn(),
}));

describe('upload.route', () => {
  const uploadFileMock = vi.mocked(fileUploadService.uploadFile);
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createApp = () => {
    const app = express();
    app.use('/api/upload', uploadRoute);
    return app;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('rejects requests without a file', async () => {
    const res = await request(createApp())
      .post('/api/upload')
      .field('description', 'no file provided');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded');
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it('returns 201 with saved file details when upload succeeds', async () => {
    const savedFile = {
      id: 'file-123',
      name: 'hello.txt',
      url: '/uploads/hello.txt',
      size: 5,
      mimeType: 'text/plain',
      createdAt: new Date(),
    };

    uploadFileMock.mockResolvedValue(savedFile as any);

    const res = await request(createApp())
      .post('/api/upload')
      .attach('file', Buffer.from('hello'), {
        filename: 'hello.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(savedFile.id);
    expect(res.body.name).toBe(savedFile.name);
    expect(res.body.url).toBe(savedFile.url);
    expect(uploadFileMock).toHaveBeenCalledTimes(1);
    expect(uploadFileMock.mock.calls[0][0].originalname).toBe('hello.txt');
  });

  it('returns 500 when the upload service throws', async () => {
    uploadFileMock.mockRejectedValue(new Error('storage unavailable'));

    const res = await request(createApp())
      .post('/api/upload')
      .attach('file', Buffer.from('hello'), {
        filename: 'broken.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Upload failed');
    expect(res.body.message).toBe('storage unavailable');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Upload error:',
      expect.any(Error)
    );
  });
});
