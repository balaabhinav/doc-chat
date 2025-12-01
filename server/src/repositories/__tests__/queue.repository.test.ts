import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueueStatus } from '@prisma/client';
import {
  countQueues,
  countQueuesByStatus,
  createQueue,
  deleteQueue,
  findAllQueues,
  findQueueByFileId,
  findQueueById,
  findQueuesByStatus,
  findQueuesWithPagination,
  updateQueue,
  updateQueueStatus,
} from '../queue.repository';

const mockPrisma = vi.hoisted(() => ({
  queue: {
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

const baseQueue = {
  id: 'queue-1',
  fileId: 'file-1',
  status: QueueStatus.queued,
  lastError: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const file = {
  id: 'file-1',
  name: 'example.txt',
  url: 'https://example.com/example.txt',
  size: 1234,
  mimeType: 'text/plain',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const queueWithFile = { ...baseQueue, file };

const resetQueueMocks = () => {
  mockPrisma.queue.create.mockReset();
  mockPrisma.queue.findUnique.mockReset();
  mockPrisma.queue.findMany.mockReset();
  mockPrisma.queue.update.mockReset();
  mockPrisma.queue.delete.mockReset();
  mockPrisma.queue.count.mockReset();
};

describe('queue.repository', () => {
  beforeEach(() => {
    resetQueueMocks();
  });

  it('creates a queue entry', async () => {
    const data = { status: QueueStatus.queued, file: { connect: { id: 'file-1' } } };
    mockPrisma.queue.create.mockResolvedValue(baseQueue);

    const result = await createQueue(data as never);

    expect(mockPrisma.queue.create).toHaveBeenCalledWith({ data });
    expect(result).toBe(baseQueue);
  });

  it('finds queue by id with related file', async () => {
    mockPrisma.queue.findUnique.mockResolvedValue(queueWithFile);

    const result = await findQueueById('queue-1');

    expect(mockPrisma.queue.findUnique).toHaveBeenCalledWith({
      where: { id: 'queue-1' },
      include: { file: true },
    });
    expect(result).toBe(queueWithFile);
  });

  it('finds queue by file id', async () => {
    mockPrisma.queue.findUnique.mockResolvedValue(baseQueue);

    const result = await findQueueByFileId('file-1');

    expect(mockPrisma.queue.findUnique).toHaveBeenCalledWith({
      where: { fileId: 'file-1' },
    });
    expect(result).toBe(baseQueue);
  });

  it('finds queues by status ordered by creation date', async () => {
    mockPrisma.queue.findMany.mockResolvedValue([queueWithFile]);

    const result = await findQueuesByStatus(QueueStatus.processing);

    expect(mockPrisma.queue.findMany).toHaveBeenCalledWith({
      where: { status: QueueStatus.processing },
      include: { file: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([queueWithFile]);
  });

  it('returns all queues ordered by newest first', async () => {
    mockPrisma.queue.findMany.mockResolvedValue([queueWithFile]);

    const result = await findAllQueues();

    expect(mockPrisma.queue.findMany).toHaveBeenCalledWith({
      include: { file: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([queueWithFile]);
  });

  it('updates a queue by id', async () => {
    const updateData = { status: QueueStatus.processing };
    const updatedQueue = { ...baseQueue, ...updateData };
    mockPrisma.queue.update.mockResolvedValue(updatedQueue);

    const result = await updateQueue('queue-1', updateData as never);

    expect(mockPrisma.queue.update).toHaveBeenCalledWith({
      where: { id: 'queue-1' },
      data: updateData,
    });
    expect(result).toEqual(updatedQueue);
  });

  it('updates queue status and tracks updatedAt', async () => {
    mockPrisma.queue.update.mockImplementation(async ({ data }) => ({
      ...baseQueue,
      ...data,
    }));

    const result = await updateQueueStatus('queue-1', QueueStatus.error, 'failed to process');
    const call = mockPrisma.queue.update.mock.calls[0][0];

    expect(call).toMatchObject({
      where: { id: 'queue-1' },
      data: { status: QueueStatus.error, lastError: 'failed to process' },
    });
    expect(call.data.updatedAt).toBeInstanceOf(Date);
    expect(result.status).toBe(QueueStatus.error);
    expect(result.lastError).toBe('failed to process');
  });

  it('deletes a queue entry', async () => {
    mockPrisma.queue.delete.mockResolvedValue(baseQueue);

    const result = await deleteQueue('queue-1');

    expect(mockPrisma.queue.delete).toHaveBeenCalledWith({
      where: { id: 'queue-1' },
    });
    expect(result).toBe(baseQueue);
  });

  it('counts queues by status', async () => {
    mockPrisma.queue.count.mockResolvedValue(2);

    const result = await countQueuesByStatus(QueueStatus.queued);

    expect(mockPrisma.queue.count).toHaveBeenCalledWith({
      where: { status: QueueStatus.queued },
    });
    expect(result).toBe(2);
  });

  it('counts all queues', async () => {
    mockPrisma.queue.count.mockResolvedValue(5);

    const result = await countQueues();

    expect(mockPrisma.queue.count).toHaveBeenCalledWith();
    expect(result).toBe(5);
  });

  it('paginates queues with status filter', async () => {
    mockPrisma.queue.findMany.mockResolvedValue([queueWithFile]);

    const result = await findQueuesWithPagination(0, 10, QueueStatus.success);

    expect(mockPrisma.queue.findMany).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      where: { status: QueueStatus.success },
      include: { file: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([queueWithFile]);
  });

  it('paginates queues without status filter', async () => {
    mockPrisma.queue.findMany.mockResolvedValue([queueWithFile]);

    const result = await findQueuesWithPagination(10, 5);

    expect(mockPrisma.queue.findMany).toHaveBeenCalledWith({
      skip: 10,
      take: 5,
      where: undefined,
      include: { file: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([queueWithFile]);
  });
});
