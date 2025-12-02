import { Readable } from 'stream';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fileRepository from '../../repositories/file.repository';
import { deleteFileById, fetchFileById, getAllFiles, getFileMetadata, uploadFile } from './FileUploadService';
import { IFileUploadStrategy } from './IFileUploadStrategy';
import { createLocalFileUploadStrategy } from './LocalFileUploadStrategy';
import { createS3FileUploadStrategy } from './S3FileUploadStrategy';

vi.mock('./LocalFileUploadStrategy', () => ({
  __esModule: true,
  createLocalFileUploadStrategy: vi.fn(),
}));

vi.mock('./S3FileUploadStrategy', () => ({
  __esModule: true,
  createS3FileUploadStrategy: vi.fn(),
}));

vi.mock('../../repositories/file.repository', () => ({
  __esModule: true,
  createFile: vi.fn(),
  findFileById: vi.fn(),
  deleteFile: vi.fn(),
  findAllFiles: vi.fn(),
}));

type MockFile = Express.Multer.File;

const buildMockFile = (): MockFile => ({
  fieldname: 'file',
  originalname: 'document.txt',
  encoding: '7bit',
  mimetype: 'text/plain',
  size: 12,
  destination: '',
  filename: 'document.txt',
  path: '',
  buffer: Buffer.from('hello world!'),
  stream: Readable.from('hello world!') as any,
});

describe('FileUploadService', () => {
  const originalEnv = process.env.NODE_ENV;
  let mockStrategy: IFileUploadStrategy;

  const createLocalStrategyMock = vi.mocked(createLocalFileUploadStrategy);
  const createS3StrategyMock = vi.mocked(createS3FileUploadStrategy);
  const createFileRepoMock = vi.mocked(fileRepository.createFile);
  const findFileByIdMock = vi.mocked(fileRepository.findFileById);
  const deleteFileRepoMock = vi.mocked(fileRepository.deleteFile);
  const findAllFilesMock = vi.mocked(fileRepository.findAllFiles);
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockStrategy = {
      upload: vi.fn(),
      fetch: vi.fn(),
      delete: vi.fn(),
    };

    createLocalStrategyMock.mockReturnValue(mockStrategy);
    createS3StrategyMock.mockReturnValue(mockStrategy);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('uses the local strategy outside production and persists metadata', async () => {
    const mockFile = buildMockFile();
    const uploadResult = {
      url: '/uploads/generated-file.txt',
      size: 12,
      mimeType: 'text/plain',
      originalName: 'document.txt',
    };
    const savedFile = {
      id: 'file-1',
      name: uploadResult.originalName,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      createdAt: new Date(),
      queue: null,
    };

    vi.mocked(mockStrategy.upload).mockResolvedValue(uploadResult);
    createFileRepoMock.mockResolvedValue(savedFile as any);

    const result = await uploadFile(mockFile);

    expect(createLocalStrategyMock).toHaveBeenCalled();
    expect(mockStrategy.upload).toHaveBeenCalledWith(mockFile);
    expect(createFileRepoMock).toHaveBeenCalledWith({
      name: uploadResult.originalName,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
    });
    expect(result).toBe(savedFile);
  });

  it('uses the S3 strategy in production', async () => {
    process.env.NODE_ENV = 'production';
    const mockFile = buildMockFile();
    const uploadResult = {
      url: 'https://bucket.s3.region.amazonaws.com/file.txt',
      size: mockFile.size,
      mimeType: mockFile.mimetype,
      originalName: mockFile.originalname,
    };
    const savedFile = {
      id: 'file-2',
      name: uploadResult.originalName,
      url: uploadResult.url,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      createdAt: new Date(),
      queue: null,
    };

    vi.mocked(mockStrategy.upload).mockResolvedValue(uploadResult);
    createFileRepoMock.mockResolvedValue(savedFile as any);

    const result = await uploadFile(mockFile);

    expect(createS3StrategyMock).toHaveBeenCalled();
    expect(createLocalStrategyMock).not.toHaveBeenCalled();
    expect(mockStrategy.upload).toHaveBeenCalledWith(mockFile);
    expect(result).toBe(savedFile);
  });

  it('throws when upload metadata persistence fails', async () => {
    const mockFile = buildMockFile();
    vi.mocked(mockStrategy.upload).mockResolvedValue({
      url: '/uploads/generated-file.txt',
      size: mockFile.size,
      mimeType: mockFile.mimetype,
      originalName: mockFile.originalname,
    });
    createFileRepoMock.mockRejectedValue(new Error('db down'));

    await expect(uploadFile(mockFile)).rejects.toThrow('db down');
    expect(createFileRepoMock).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save file metadata to database:',
      expect.any(Error)
    );
  });

  it('returns the file stream when fetching by id', async () => {
    const fileId = 'file-123';
    const storedFile = {
      id: fileId,
      name: 'document.txt',
      url: '/uploads/generated-file.txt',
      size: 12,
      mimeType: 'text/plain',
      createdAt: new Date(),
      queue: null,
    };
    const stream = Readable.from('file contents');

    findFileByIdMock.mockResolvedValue(storedFile as any);
    vi.mocked(mockStrategy.fetch).mockResolvedValue({
      stream,
      mimeType: 'text/plain',
      size: storedFile.size,
      filename: storedFile.name,
    });

    const result = await fetchFileById(fileId);

    expect(findFileByIdMock).toHaveBeenCalledWith(fileId);
    expect(mockStrategy.fetch).toHaveBeenCalledWith(storedFile.url);
    expect(result.file).toEqual(storedFile);
    expect(result.stream).toBe(stream);
    expect(result.filename).toBe(storedFile.name);
  });

  it('throws a not found error when file metadata is missing', async () => {
    findFileByIdMock.mockResolvedValue(null);

    await expect(fetchFileById('missing-id')).rejects.toThrow('File not found');
    expect(mockStrategy.fetch).not.toHaveBeenCalled();
  });

  it('deletes the file from storage and database', async () => {
    const fileId = 'file-789';
    const storedFile = {
      id: fileId,
      name: 'deletable.txt',
      url: '/uploads/deletable.txt',
      size: 5,
      mimeType: 'text/plain',
      createdAt: new Date(),
      queue: null,
    };

    findFileByIdMock.mockResolvedValue(storedFile as any);
    deleteFileRepoMock.mockResolvedValue(storedFile as any);

    await deleteFileById(fileId);

    expect(mockStrategy.delete).toHaveBeenCalledWith(storedFile.url);
    expect(deleteFileRepoMock).toHaveBeenCalledWith(fileId);
  });

  it('still removes the database record when storage deletion fails', async () => {
    const fileId = 'file-999';
    const storedFile = {
      id: fileId,
      name: 'orphan.txt',
      url: '/uploads/orphan.txt',
      size: 5,
      mimeType: 'text/plain',
      createdAt: new Date(),
      queue: null,
    };

    findFileByIdMock.mockResolvedValue(storedFile as any);
    vi.mocked(mockStrategy.delete).mockRejectedValue(new Error('storage down'));
    deleteFileRepoMock.mockResolvedValue(storedFile as any);

    await deleteFileById(fileId);

    expect(deleteFileRepoMock).toHaveBeenCalledWith(fileId);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to delete file from storage:',
      expect.any(Error)
    );
  });

  it('throws when deleting a missing file', async () => {
    findFileByIdMock.mockResolvedValue(null);

    await expect(deleteFileById('missing')).rejects.toThrow('File not found');
    expect(deleteFileRepoMock).not.toHaveBeenCalled();
  });

  it('returns all files from the repository', async () => {
    const files = [
      { id: '1', name: 'a', url: '/a', size: 1, mimeType: 'text/plain', createdAt: new Date(), queue: null },
      { id: '2', name: 'b', url: '/b', size: 2, mimeType: 'text/plain', createdAt: new Date(), queue: null },
    ];
    findAllFilesMock.mockResolvedValue(files as any);

    const result = await getAllFiles();

    expect(result).toEqual(files);
    expect(findAllFilesMock).toHaveBeenCalled();
  });

  it('returns metadata for a single file', async () => {
    const file = {
      id: 'meta-1',
      name: 'meta.txt',
      url: '/meta.txt',
      size: 3,
      mimeType: 'text/plain',
      createdAt: new Date(),
      queue: null,
    };
    findFileByIdMock.mockResolvedValue(file as any);

    const result = await getFileMetadata(file.id);

    expect(result).toBe(file);
    expect(findFileByIdMock).toHaveBeenCalledWith(file.id);
  });
});
