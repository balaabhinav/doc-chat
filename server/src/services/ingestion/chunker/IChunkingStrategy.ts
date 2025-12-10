import { TextChunk, ChunkingConfig } from '../../../types/ingestion.types';

/**
 * Interface for chunking strategies
 * Implementations should handle different ways of splitting text into chunks
 */
export interface IChunkingStrategy {
  /**
   * Split text into chunks
   * @param text - The text to chunk
   * @param config - Configuration for chunking
   * @returns TextChunk[] - Array of text chunks with metadata
   */
  chunk(text: string, config: ChunkingConfig): TextChunk[];

  /**
   * Get the name of this chunking strategy
   * @returns string - The strategy name
   */
  getName(): string;
}
