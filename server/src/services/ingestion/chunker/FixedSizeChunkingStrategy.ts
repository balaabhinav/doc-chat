import { IChunkingStrategy } from './IChunkingStrategy';
import { TextChunk, ChunkingConfig } from '../../../types/ingestion.types';

/**
 * Fixed-size chunking strategy
 * Splits text into chunks of a fixed character size with optional overlap
 */
export class FixedSizeChunkingStrategy implements IChunkingStrategy {
  private readonly strategyName = 'fixed-size';

  /**
   * Split text into fixed-size chunks
   * @param text - The text to chunk
   * @param config - Configuration for chunking (chunkSize and chunkOverlap)
   * @returns TextChunk[] - Array of text chunks with metadata
   */
  chunk(text: string, config: ChunkingConfig): TextChunk[] {
    const { chunkSize, chunkOverlap } = config;
    const chunks: TextChunk[] = [];

    // Validate configuration
    if (chunkSize <= 0) {
      throw new Error('Chunk size must be greater than 0');
    }

    if (chunkOverlap < 0) {
      throw new Error('Chunk overlap must be non-negative');
    }

    if (chunkOverlap >= chunkSize) {
      throw new Error('Chunk overlap must be less than chunk size');
    }

    // Handle empty text
    if (!text || text.trim().length === 0) {
      return chunks;
    }

    // Calculate step size (how much to move forward for each chunk)
    const stepSize = chunkSize - chunkOverlap;

    let startChar = 0;
    let chunkIndex = 0;

    while (startChar < text.length) {
      // Calculate end position for this chunk
      const endChar = Math.min(startChar + chunkSize, text.length);

      // Extract chunk text
      const chunkText = text.substring(startChar, endChar);

      // Skip empty chunks
      if (chunkText.trim().length > 0) {
        chunks.push({
          text: chunkText,
          chunkIndex,
          metadata: {
            startChar,
            endChar,
            chunkStrategy: this.strategyName,
          },
        });
        chunkIndex++;
      }

      // Move to next chunk position
      startChar += stepSize;

      // Break if we've reached the end
      if (endChar >= text.length) {
        break;
      }
    }

    return chunks;
  }

  /**
   * Get the name of this chunking strategy
   * @returns string - The strategy name
   */
  getName(): string {
    return this.strategyName;
  }
}

/**
 * Factory function to create a fixed-size chunking strategy
 */
export const createFixedSizeChunkingStrategy = (): FixedSizeChunkingStrategy => {
  return new FixedSizeChunkingStrategy();
};
