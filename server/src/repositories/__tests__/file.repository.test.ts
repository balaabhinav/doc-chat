import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countFiles,
  createFile,
  deleteFile,
  findAllFiles,
  findFileById,
  findFilesByMimeType,
  findFilesWithPagination,
  updateFile,
} from '../file.repository';

const mockPrisma = vi.hoisted(() => ({
  file: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('../../db/prisma.client', () => ({
  prisma: mockPrisma,
}));

const file = {
  id: 'file-1',
  name: 'example.txt',
  url: 'https://example.com/example.txt',
  size: 1024,
  mimeType: 'text/plain',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const fileWithQueue = { ...file, queue: null };

const resetFileMocks = () => {
  mockPrisma.file.create.mockReset();
  mockPrisma.file.findUnique.mockReset();
  mockPrisma.file.findMany.mockReset();
  mockPrisma.file.update.mockReset();
  mockPrisma.file.delete.mockReset();
  mockPrisma.file.count.mockReset();
};

describe('file.repository', () => {
  beforeEach(() => {
    resetFileMocks();
  });

  it('creates a file record', async () => {
    const createData = {
      name: 'example.txt',
      url: 'https://example.com/example.txt',
      size: 1024,
      mimeType: 'text/plain',
    };
    mockPrisma.file.create.mockResolvedValue(file);

    const result = await createFile(createData as never);

    expect(mockPrisma.file.create).toHaveBeenCalledWith({ data: createData });
    expect(result).toBe(file);
  });

  it('finds file by id with queue relation', async () => {
    mockPrisma.file.findUnique.mockResolvedValue(fileWithQueue);

    const result = await findFileById('file-1');

    expect(mockPrisma.file.findUnique).toHaveBeenCalledWith({
      where: { id: 'file-1' },
      include: { queue: true },
    });
    expect(result).toBe(fileWithQueue);
  });

  it('returns all files ordered by creation date', async () => {
    mockPrisma.file.findMany.mockResolvedValue([fileWithQueue]);

    const result = await findAllFiles();

    expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
      include: { queue: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([fileWithQueue]);
  });

  it('updates a file record', async () => {
    const updateData = { name: 'renamed.txt' };
    const updatedFile = { ...file, ...updateData };
    mockPrisma.file.update.mockResolvedValue(updatedFile);

    const result = await updateFile('file-1', updateData as never);

    expect(mockPrisma.file.update).toHaveBeenCalledWith({
      where: { id: 'file-1' },
      data: updateData,
    });
    expect(result).toEqual(updatedFile);
  });

  it('deletes a file record', async () => {
    mockPrisma.file.delete.mockResolvedValue(file);

    const result = await deleteFile('file-1');

    expect(mockPrisma.file.delete).toHaveBeenCalledWith({
      where: { id: 'file-1' },
    });
    expect(result).toBe(file);
  });

  it('filters files by mime type', async () => {
    mockPrisma.file.findMany.mockResolvedValue([file]);

    const result = await findFilesByMimeType('text/plain');

    expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
      where: { mimeType: 'text/plain' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([file]);
  });

  it('counts all files', async () => {
    mockPrisma.file.count.mockResolvedValue(3);

    const result = await countFiles();

    expect(mockPrisma.file.count).toHaveBeenCalledWith();
    expect(result).toBe(3);
  });

  it('paginates files with queue relation', async () => {
    mockPrisma.file.findMany.mockResolvedValue([fileWithQueue]);

    const result = await findFilesWithPagination(5, 5);

    expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      include: { queue: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([fileWithQueue]);
  });
});
