import { prisma } from '../db/prisma.client';
import { Prisma, Chunk } from '@prisma/client';

/**
 * Create a chunk
 */
export const createChunk = async (
  data: Prisma.ChunkCreateInput
): Promise<Chunk> => {
  return prisma.chunk.create({ data });
};

/**
 * Create multiple chunks in a transaction
 */
export const createManyChunks = async (
  data: Prisma.ChunkCreateManyInput[]
): Promise<number> => {
  const result = await prisma.chunk.createMany({
    data,
    skipDuplicates: true,
  });
  return result.count;
};

/**
 * Find chunk by ID
 */
export const findChunkById = async (id: string): Promise<Chunk | null> => {
  return prisma.chunk.findUnique({
    where: { id },
  });
};

/**
 * Find chunk by file ID and chunk index
 */
export const findChunkByFileIdAndIndex = async (
  fileId: string,
  chunkIndex: number
): Promise<Chunk | null> => {
  return prisma.chunk.findUnique({
    where: {
      fileId_chunkIndex: {
        fileId,
        chunkIndex,
      },
    },
  });
};

/**
 * Find all chunks for a file
 */
export const findChunksByFileId = async (fileId: string): Promise<Chunk[]> => {
  return prisma.chunk.findMany({
    where: { fileId },
    orderBy: { chunkIndex: 'asc' },
  });
};

/**
 * Find multiple chunks by file ID and chunk indices
 */
export const findChunksByFileIdAndIndices = async (
  fileId: string,
  chunkIndices: number[]
): Promise<Chunk[]> => {
  return prisma.chunk.findMany({
    where: {
      fileId,
      chunkIndex: {
        in: chunkIndices,
      },
    },
    orderBy: { chunkIndex: 'asc' },
  });
};

/**
 * Update chunk
 */
export const updateChunk = async (
  id: string,
  data: Prisma.ChunkUpdateInput
): Promise<Chunk> => {
  return prisma.chunk.update({
    where: { id },
    data,
  });
};

/**
 * Delete chunk
 */
export const deleteChunk = async (id: string): Promise<Chunk> => {
  return prisma.chunk.delete({
    where: { id },
  });
};

/**
 * Delete all chunks for a file
 */
export const deleteChunksByFileId = async (fileId: string): Promise<number> => {
  const result = await prisma.chunk.deleteMany({
    where: { fileId },
  });
  return result.count;
};

/**
 * Count chunks for a file
 */
export const countChunksByFileId = async (fileId: string): Promise<number> => {
  return prisma.chunk.count({
    where: { fileId },
  });
};

/**
 * Get chunk statistics for a file
 */
export const getChunkStats = async (
  fileId: string
): Promise<{
  totalChunks: number;
  strategies: { strategy: string; count: number }[];
}> => {
  const totalChunks = await countChunksByFileId(fileId);

  const strategies = await prisma.chunk.groupBy({
    by: ['chunkStrategy'],
    where: { fileId },
    _count: {
      chunkStrategy: true,
    },
  });

  return {
    totalChunks,
    strategies: strategies.map((s) => ({
      strategy: s.chunkStrategy,
      count: s._count.chunkStrategy,
    })),
  };
};
