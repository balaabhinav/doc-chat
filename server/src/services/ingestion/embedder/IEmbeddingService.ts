import { EmbeddingResult, BatchEmbeddingResult } from '../../../types/ingestion.types';

/**
 * Interface for embedding services
 * Implementations should handle generating embeddings from text
 */
export interface IEmbeddingService {
  /**
   * Generate embedding for a single text
   * @param text - The text to embed
   * @returns Promise<EmbeddingResult> - The embedding result
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Promise<BatchEmbeddingResult> - The batch embedding result
   */
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;

  /**
   * Get the dimension of embeddings produced by this service
   * @returns number - The embedding dimension
   */
  getDimension(): number;

  /**
   * Get the model name used by this service
   * @returns string - The model name
   */
  getModelName(): string;
}
