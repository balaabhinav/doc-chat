import OpenAI from 'openai';
import { IEmbeddingService } from './IEmbeddingService';
import { EmbeddingResult, BatchEmbeddingResult } from '../../../types/ingestion.types';

/**
 * OpenAI embedding service
 * Uses OpenAI's embedding API to generate embeddings
 */
export class OpenAIEmbeddingService implements IEmbeddingService {
  private client: OpenAI;
  private model: string;
  private dimension: number;

  constructor(apiKey: string, model: string = 'text-embedding-ada-002') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    
    // Set dimension based on model
    // text-embedding-ada-002: 1536 dimensions
    // text-embedding-3-small: 1536 dimensions
    // text-embedding-3-large: 3072 dimensions
    this.dimension = this.getModelDimension(model);
  }

  /**
   * Get the dimension for a given model
   */
  private getModelDimension(model: string): number {
    const dimensionMap: Record<string, number> = {
      'text-embedding-ada-002': 1536,
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
    };

    return dimensionMap[model] || 1536; // Default to 1536
  }

  /**
   * Generate embedding for a single text
   * @param text - The text to embed
   * @returns Promise<EmbeddingResult> - The embedding result
   */
  async embed(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        model: this.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Promise<BatchEmbeddingResult> - The batch embedding result
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    try {
      // OpenAI API has a limit on batch size, so we may need to chunk the requests
      const batchSize = 100; // OpenAI's recommended batch size
      const allEmbeddings: number[][] = [];
      let totalPromptTokens = 0;
      let totalTokens = 0;

      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        // Collect embeddings in order
        const batchEmbeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);
        
        allEmbeddings.push(...batchEmbeddings);

        // Accumulate usage stats
        totalPromptTokens += response.usage.prompt_tokens;
        totalTokens += response.usage.total_tokens;
      }

      return {
        embeddings: allEmbeddings,
        model: this.model,
        totalUsage: {
          promptTokens: totalPromptTokens,
          totalTokens: totalTokens,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the dimension of embeddings produced by this service
   * @returns number - The embedding dimension
   */
  getDimension(): number {
    return this.dimension;
  }

  /**
   * Get the model name used by this service
   * @returns string - The model name
   */
  getModelName(): string {
    return this.model;
  }
}

/**
 * Factory function to create an OpenAI embedding service
 */
export const createOpenAIEmbeddingService = (
  apiKey?: string,
  model?: string
): OpenAIEmbeddingService => {
  const key = apiKey || process.env.OPENAI_API_KEY;
  const modelName = model || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002';

  if (!key) {
    throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  return new OpenAIEmbeddingService(key, modelName);
};
