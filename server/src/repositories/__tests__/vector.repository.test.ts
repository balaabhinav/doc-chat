import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vectorRepository from '../vector.repository';
import * as milvusClient from '../../db/milvus.client';
import { VectorData } from '../vector.types';

// Mock the Milvus client
vi.mock('../../db/milvus.client');

describe('Vector Repository', () => {
  let mockClient: any;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      hasCollection: vi.fn(),
      createCollection: vi.fn(),
      createIndex: vi.fn(),
      loadCollection: vi.fn(),
      dropCollection: vi.fn(),
      getCollectionStatistics: vi.fn(),
      describeCollection: vi.fn(),
      insert: vi.fn(),
      search: vi.fn(),
      delete: vi.fn(),
      query: vi.fn(),
    };

    vi.mocked(milvusClient.getMilvusClient).mockReturnValue(mockClient);

    // Setup environment variables
    process.env.VECTOR_COLLECTION_NAME = 'test_collection';
    process.env.VECTOR_DIMENSION = '1536';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('collectionExists', () => {
    it('should return true when collection exists', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: true });

      const result = await vectorRepository.collectionExists();

      expect(result).toBe(true);
      expect(mockClient.hasCollection).toHaveBeenCalledWith({
        collection_name: 'test_collection',
      });
    });

    it('should return false when collection does not exist', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: false });

      const result = await vectorRepository.collectionExists();

      expect(result).toBe(false);
    });

    it('should throw error when check fails', async () => {
      mockClient.hasCollection.mockRejectedValue(new Error('Connection failed'));

      await expect(vectorRepository.collectionExists()).rejects.toThrow(
        'Connection failed'
      );
    });
  });

  describe('createCollection', () => {
    it('should create collection with correct schema', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: false });
      mockClient.createCollection.mockResolvedValue({});
      mockClient.createIndex.mockResolvedValue({});
      mockClient.loadCollection.mockResolvedValue({});

      await vectorRepository.createCollection();

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_name: 'test_collection',
          fields: expect.arrayContaining([
            expect.objectContaining({ name: 'pk' }),
            expect.objectContaining({ name: 'file_id' }),
            expect.objectContaining({ name: 'chunk_index' }),
            expect.objectContaining({ name: 'vector', dim: 1536 }),
          ]),
        })
      );

      expect(mockClient.createIndex).toHaveBeenCalled();
      expect(mockClient.loadCollection).toHaveBeenCalled();
    });

    it('should not create collection if it already exists', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: true });

      await vectorRepository.createCollection();

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });
  });

  describe('dropCollection', () => {
    it('should drop collection successfully', async () => {
      mockClient.dropCollection.mockResolvedValue({});

      await vectorRepository.dropCollection();

      expect(mockClient.dropCollection).toHaveBeenCalledWith({
        collection_name: 'test_collection',
      });
    });
  });

  describe('getCollectionInfo', () => {
    it('should return collection statistics', async () => {
      mockClient.getCollectionStatistics.mockResolvedValue({
        data: { row_count: '100' },
      });
      mockClient.describeCollection.mockResolvedValue({});

      const result = await vectorRepository.getCollectionInfo();

      expect(result).toEqual({
        rowCount: 100,
        collectionName: 'test_collection',
        dimension: 1536,
        indexType: 'HNSW',
        metricType: 'COSINE',
      });
    });
  });

  describe('insertVectors', () => {
    it('should insert vectors successfully', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: true });
      mockClient.insert.mockResolvedValue({
        insert_cnt: 2,
        IDs: { int_id: { data: [1, 2] } },
      });

      const vectors: VectorData[] = [
        {
          file_id: 'file-123',
          chunk_index: 0,
          chunk_strategy: 'fixed-size',
          vector: new Array(1536).fill(0.1),
          created_at: Date.now(),
        },
        {
          file_id: 'file-123',
          chunk_index: 1,
          chunk_strategy: 'fixed-size',
          vector: new Array(1536).fill(0.2),
          created_at: Date.now(),
        },
      ];

      const result = await vectorRepository.insertVectors(vectors);

      expect(result.insertedCount).toBe(2);
      expect(result.insertedIds).toEqual([1, 2]);
      expect(mockClient.insert).toHaveBeenCalled();
    });

    it('should throw error if collection does not exist', async () => {
      mockClient.hasCollection.mockResolvedValue({ value: false });

      const vectors: VectorData[] = [
        {
          file_id: 'file-123',
          chunk_index: 0,
          chunk_strategy: 'fixed-size',
          vector: new Array(1536).fill(0.1),
          created_at: Date.now(),
        },
      ];

      await expect(vectorRepository.insertVectors(vectors)).rejects.toThrow(
        'does not exist'
      );
    });
  });

  describe('searchVectors', () => {
    it('should search vectors and return results', async () => {
      const mockResults = [
        {
          id: 1,
          file_id: 'file-123',
          chunk_index: 0,
          page_number: 1,
          chunk_strategy: 'fixed-size',
          created_at: Date.now(),
          embedding_version: 1,
          score: 0.95,
        },
      ];

      mockClient.search.mockResolvedValue({
        results: mockResults,
      });

      const queryVector = new Array(1536).fill(0.1);
      const results = await vectorRepository.searchVectors(queryVector, {
        topK: 5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].file_id).toBe('file-123');
      expect(results[0].distance).toBe(0.95);
      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_name: 'test_collection',
          data: [queryVector],
          limit: 5,
        })
      );
    });

    it('should apply filter when provided', async () => {
      mockClient.search.mockResolvedValue({ results: [] });

      const queryVector = new Array(1536).fill(0.1);
      await vectorRepository.searchVectors(queryVector, {
        filter: 'file_id == "file-123"',
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'file_id == "file-123"',
        })
      );
    });
  });

  describe('searchVectorsByFileId', () => {
    it('should search vectors within specific file', async () => {
      mockClient.search.mockResolvedValue({ results: [] });

      const queryVector = new Array(1536).fill(0.1);
      await vectorRepository.searchVectorsByFileId(queryVector, 'file-123');

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'file_id == "file-123"',
        })
      );
    });
  });

  describe('deleteVectorsByFileId', () => {
    it('should delete vectors by file ID', async () => {
      mockClient.delete.mockResolvedValue({ delete_cnt: 5 });

      const result = await vectorRepository.deleteVectorsByFileId('file-123');

      expect(result.deletedCount).toBe(5);
      expect(mockClient.delete).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter: 'file_id == "file-123"',
      });
    });
  });

  describe('getVectorsByFileId', () => {
    it('should get all vectors for a file', async () => {
      const mockData = [
        {
          pk: 1,
          file_id: 'file-123',
          chunk_index: 0,
          page_number: 1,
          chunk_strategy: 'fixed-size',
          created_at: Date.now(),
          embedding_version: 1,
        },
      ];

      mockClient.query.mockResolvedValue({ data: mockData });

      const results = await vectorRepository.getVectorsByFileId('file-123');

      expect(results).toHaveLength(1);
      expect(results[0].file_id).toBe('file-123');
      expect(mockClient.query).toHaveBeenCalledWith({
        collection_name: 'test_collection',
        filter: 'file_id == "file-123"',
        output_fields: expect.any(Array),
      });
    });
  });

  describe('countVectors', () => {
    it('should count all vectors', async () => {
      mockClient.query.mockResolvedValue({
        data: [{ pk: 1 }, { pk: 2 }, { pk: 3 }],
      });

      const count = await vectorRepository.countVectors();

      expect(count).toBe(3);
    });

    it('should count vectors with filter', async () => {
      mockClient.query.mockResolvedValue({
        data: [{ pk: 1 }, { pk: 2 }],
      });

      const count = await vectorRepository.countVectors(
        'file_id == "file-123"'
      );

      expect(count).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: 'file_id == "file-123"',
        })
      );
    });
  });
});
