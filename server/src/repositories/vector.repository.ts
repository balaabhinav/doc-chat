import { DataType, IndexType, MetricType } from '@zilliz/milvus2-sdk-node';
import getMilvusClient from '../db/milvus.client';
import {
  VectorData,
  SearchResult,
  SearchOptions,
  CollectionStats,
  InsertResult,
  DeleteResult,
} from './vector.types';

/**
 * Get collection name from environment
 */
const getCollectionName = (): string => {
  const collectionName = process.env.VECTOR_COLLECTION_NAME;
  if (!collectionName) {
    throw new Error('VECTOR_COLLECTION_NAME environment variable is not set');
  }
  return collectionName;
};

/**
 * Get vector dimension from environment
 */
const getVectorDimension = (): number => {
  const dimension = process.env.VECTOR_DIMENSION;
  if (!dimension) {
    throw new Error('VECTOR_DIMENSION environment variable is not set');
  }
  return parseInt(dimension, 10);
};

/**
 * Check if collection exists
 * @returns Promise<boolean>
 */
export const collectionExists = async (): Promise<boolean> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();
    const response = await client.hasCollection({
      collection_name: collectionName,
    });
    return response.value === true;
  } catch (error) {
    console.error('Error checking collection existence:', error);
    throw error;
  }
};

/**
 * Create collection with schema and index
 * @returns Promise<void>
 */
export const createCollection = async (): Promise<void> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();
    const dimension = getVectorDimension();

    // Check if collection already exists
    const exists = await collectionExists();
    if (exists) {
      console.log(`Collection ${collectionName} already exists`);
      return;
    }

    // Create collection with schema
    await client.createCollection({
      collection_name: collectionName,
      fields: [
        {
          name: 'pk',
          description: 'Primary key',
          data_type: DataType.Int64,
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'file_id',
          description: 'File ID from Prisma database',
          data_type: DataType.VarChar,
          max_length: 255,
        },
        {
          name: 'chunk_index',
          description: 'Position of chunk in document',
          data_type: DataType.Int32,
        },
        {
          name: 'page_number',
          description: 'Page number for PDFs',
          data_type: DataType.Int32,
          nullable: true,
        },
        {
          name: 'chunk_strategy',
          description: 'Chunking method used',
          data_type: DataType.VarChar,
          max_length: 100,
        },
        {
          name: 'vector',
          description: 'Embedding vector',
          data_type: DataType.FloatVector,
          dim: dimension,
        },
        {
          name: 'created_at',
          description: 'Creation timestamp',
          data_type: DataType.Int64,
        },
        {
          name: 'embedding_version',
          description: 'Embedding model version',
          data_type: DataType.Int32,
          nullable: true,
        },
      ],
    });

    // Create HNSW index on vector field for fast similarity search
    await client.createIndex({
      collection_name: collectionName,
      field_name: 'vector',
      index_type: IndexType.HNSW,
      metric_type: MetricType.COSINE,
      params: {
        M: 16, // Number of connections per layer
        efConstruction: 256, // Size of dynamic candidate list for construction
      },
    });

    // Load collection into memory
    await client.loadCollection({
      collection_name: collectionName,
    });

    console.log(`Collection ${collectionName} created successfully`);
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
};

/**
 * Drop collection
 * @returns Promise<void>
 */
export const dropCollection = async (): Promise<void> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    await client.dropCollection({
      collection_name: collectionName,
    });

    console.log(`Collection ${collectionName} dropped successfully`);
  } catch (error) {
    console.error('Error dropping collection:', error);
    throw error;
  }
};

/**
 * Get collection statistics
 * @returns Promise<CollectionStats>
 */
export const getCollectionInfo = async (): Promise<CollectionStats> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    const stats = await client.getCollectionStatistics({
      collection_name: collectionName,
    });

    const description = await client.describeCollection({
      collection_name: collectionName,
    });

    return {
      rowCount: parseInt(stats.data.row_count, 10),
      collectionName,
      dimension: getVectorDimension(),
      indexType: 'HNSW',
      metricType: 'COSINE',
    };
  } catch (error) {
    console.error('Error getting collection info:', error);
    throw error;
  }
};

/**
 * Insert vectors into collection
 * @param vectors - Array of vector data to insert
 * @returns Promise<InsertResult>
 */
export const insertVectors = async (
  vectors: VectorData[]
): Promise<InsertResult> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    // Ensure collection exists
    const exists = await collectionExists();
    if (!exists) {
      throw new Error(
        `Collection ${collectionName} does not exist. Please create it first.`
      );
    }

    // Transform data for Milvus format
    const data = vectors.map((v) => ({
      file_id: v.file_id,
      chunk_index: v.chunk_index,
      page_number: v.page_number ?? null,
      chunk_strategy: v.chunk_strategy,
      vector: v.vector,
      created_at: v.created_at,
      embedding_version: v.embedding_version ?? null,
    }));

    const response = await client.insert({
      collection_name: collectionName,
      data,
    });

    return {
      insertedCount: Number(response.insert_cnt),
      insertedIds: (response.IDs as any)?.int_id?.data || [],
    };
  } catch (error) {
    console.error('Error inserting vectors:', error);
    throw error;
  }
};

/**
 * Search for similar vectors
 * @param queryVector - Query vector to search for
 * @param options - Search options
 * @returns Promise<SearchResult[]>
 */
export const searchVectors = async (
  queryVector: number[],
  options?: SearchOptions
): Promise<SearchResult[]> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    const topK = options?.topK || 10;
    const outputFields = options?.outputFields || [
      'file_id',
      'chunk_index',
      'page_number',
      'chunk_strategy',
      'created_at',
      'embedding_version',
    ];

    const searchParams: any = {
      collection_name: collectionName,
      data: [queryVector],
      limit: topK,
      output_fields: outputFields,
      ...(options?.filter && { filter: options.filter }),
    };

    const response = await client.search(searchParams);

    // Transform results
    const results: SearchResult[] = [];
    if (response.results && response.results.length > 0) {
      for (const result of response.results) {
        const resultData = result as any;
        results.push({
          pk: Number(resultData.id),
          file_id: resultData.file_id,
          chunk_index: resultData.chunk_index,
          page_number: resultData.page_number,
          chunk_strategy: resultData.chunk_strategy,
          created_at: resultData.created_at,
          embedding_version: resultData.embedding_version,
          distance: resultData.score,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error searching vectors:', error);
    throw error;
  }
};

/**
 * Search for similar vectors within a specific file
 * @param queryVector - Query vector to search for
 * @param fileId - File ID to search within
 * @param options - Search options
 * @returns Promise<SearchResult[]>
 */
export const searchVectorsByFileId = async (
  queryVector: number[],
  fileId: string,
  options?: SearchOptions
): Promise<SearchResult[]> => {
  const filter = `file_id == "${fileId}"`;
  const mergedOptions = {
    ...options,
    filter: options?.filter ? `${options.filter} && ${filter}` : filter,
  };

  return searchVectors(queryVector, mergedOptions);
};

/**
 * Delete vectors by file ID
 * @param fileId - File ID to delete vectors for
 * @returns Promise<DeleteResult>
 */
export const deleteVectorsByFileId = async (
  fileId: string
): Promise<DeleteResult> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    const filter = `file_id == "${fileId}"`;

    const response = await client.delete({
      collection_name: collectionName,
      filter,
    });

    return {
      deletedCount: Number(response.delete_cnt) || 0,
    };
  } catch (error) {
    console.error('Error deleting vectors by file ID:', error);
    throw error;
  }
};

/**
 * Get all vectors for a specific file
 * @param fileId - File ID to get vectors for
 * @returns Promise<VectorData[]>
 */
export const getVectorsByFileId = async (
  fileId: string
): Promise<VectorData[]> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    const filter = `file_id == "${fileId}"`;

    const response = await client.query({
      collection_name: collectionName,
      filter,
      output_fields: [
        'pk',
        'file_id',
        'chunk_index',
        'page_number',
        'chunk_strategy',
        'created_at',
        'embedding_version',
      ],
    });

    return response.data.map((item: any) => ({
      pk: item.pk,
      file_id: item.file_id,
      chunk_index: item.chunk_index,
      page_number: item.page_number,
      chunk_strategy: item.chunk_strategy,
      vector: [], // Vector not returned in query
      created_at: item.created_at,
      embedding_version: item.embedding_version,
    }));
  } catch (error) {
    console.error('Error getting vectors by file ID:', error);
    throw error;
  }
};

/**
 * Count vectors with optional filter
 * @param filter - Optional Milvus filter expression
 * @returns Promise<number>
 */
export const countVectors = async (filter?: string): Promise<number> => {
  try {
    const client = getMilvusClient();
    const collectionName = getCollectionName();

    const response = await client.query({
      collection_name: collectionName,
      filter: filter || '',
      output_fields: ['pk'],
    });

    return response.data.length;
  } catch (error) {
    console.error('Error counting vectors:', error);
    throw error;
  }
};
