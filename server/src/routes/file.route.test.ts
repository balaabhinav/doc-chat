import express from 'express';
import { Readable } from 'stream';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fileRoute from './file.route';
import * as fileUploadService from '../services/upload/FileUploadService';

vi.mock('../services/upload/FileUploadService', () => ({
  __esModule: true,
  getAllFiles: vi.fn(),
  fetchFileById: vi.fn(),
  deleteFileById: vi.fn(),
}));

describe('file.route', () => {
  const getAllFilesMock = vi.mocked(fileUploadService.getAllFiles);
  const fetchFileByIdMock = vi.mocked(fileUploadService.fetchFileById);
  const deleteFileByIdMock = vi.mocked(fileUploadService.deleteFileById);
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const createApp = () => {
    const app = express();
    app.use('/api/files', fileRoute);
    return app;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns all files', async () => {
    const files = [
      { id: '1', name: 'a.txt', url: '/uploads/a.txt', size: 1, mimeType: 'text/plain', createdAt: new Date(), queue: null },
      { id: '2', name: 'b.txt', url: '/uploads/b.txt', size: 2, mimeType: 'text/plain', createdAt: new Date(), queue: null },
    ];
    getAllFilesMock.mockResolvedValue(files as any);

    const res = await request(createApp()).get('/api/files');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      files.map((file) => ({
        ...file,
        createdAt: file.createdAt.toISOString(),
      }))
    );
    expect(getAllFilesMock).toHaveBeenCalled();
  });

  it('streams a file when found', async () => {
    const stream = Readable.from('file contents');
    fetchFileByIdMock.mockResolvedValue({
      stream,
      mimeType: 'text/plain',
      size: 13,
      filename: 'file.txt',
    } as any);

    const res = await request(createApp()).get('/api/files/file-123');

    expect(res.status).toBe(200);
    expect(res.text).toBe('file contents');
    expect(res.headers['content-type']).toBe('text/plain');
    expect(res.headers['content-length']).toBe('13');
    expect(res.headers['content-disposition']).toContain('file.txt');
    expect(fetchFileByIdMock).toHaveBeenCalledWith('file-123');
  });

  it('returns 404 when a file is missing', async () => {
    fetchFileByIdMock.mockRejectedValue(new Error('File not found'));

    const res = await request(createApp()).get('/api/files/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found');
    expect(res.body.message).toBe('The requested file does not exist');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching file:',
      expect.any(Error)
    );
  });

  it('returns 500 on unexpected fetch errors', async () => {
    fetchFileByIdMock.mockRejectedValue(new Error('db offline'));

    const res = await request(createApp()).get('/api/files/failure');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch file');
    expect(res.body.message).toBe('db offline');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching file:',
      expect.any(Error)
    );
  });

  it('deletes a file by id', async () => {
    deleteFileByIdMock.mockResolvedValue(undefined);

    const res = await request(createApp()).delete('/api/files/file-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File deleted successfully');
    expect(deleteFileByIdMock).toHaveBeenCalledWith('file-1');
  });

  it('returns 404 when deleting a missing file', async () => {
    deleteFileByIdMock.mockRejectedValue(new Error('File not found'));

    const res = await request(createApp()).delete('/api/files/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('File not found');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error deleting file:',
      expect.any(Error)
    );
  });

  it('returns 500 when deletion fails unexpectedly', async () => {
    deleteFileByIdMock.mockRejectedValue(new Error('unknown failure'));

    const res = await request(createApp()).delete('/api/files/error');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to delete file');
    expect(res.body.message).toBe('unknown failure');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error deleting file:',
      expect.any(Error)
    );
  });
});
