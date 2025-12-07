import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Milvus client configuration
 */
const config = {
  address: process.env.VECTOR_DB_ENDPOINT || '',
  token: process.env.VECTOR_DB_TOKEN || '',
  timeout: 30000, // 30 seconds timeout
};

/**
 * Singleton Milvus client instance
 */
let milvusClient: MilvusClient | null = null;

/**
 * Get or create Milvus client instance
 * @returns MilvusClient instance
 */
export const getMilvusClient = (): MilvusClient => {
  if (!milvusClient) {
    if (!config.address || !config.token) {
      throw new Error(
        'Milvus configuration missing. Please set VECTOR_DB_ENDPOINT and VECTOR_DB_TOKEN environment variables.'
      );
    }

    milvusClient = new MilvusClient(config);
  }

  return milvusClient;
};

/**
 * Check if Milvus client is connected
 * @returns Promise<boolean>
 */
export const checkMilvusConnection = async (): Promise<boolean> => {
  try {
    const client = getMilvusClient();
    const response = await client.checkHealth();
    return response.isHealthy;
  } catch (error) {
    console.error('Milvus connection check failed:', error);
    return false;
  }
};

/**
 * Close Milvus client connection
 */
export const closeMilvusConnection = (): void => {
  if (milvusClient) {
    // Note: The SDK doesn't have an explicit close method
    // Setting to null will allow garbage collection
    milvusClient = null;
  }
};

// Export the client getter as default
export default getMilvusClient;
