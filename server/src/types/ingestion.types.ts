/**
 * Represents a document loaded from a file
 */
export interface LoadedDocument {
  text: string;
  metadata: DocumentMetadata;
}

/**
 * Metadata about the loaded document
 */
export interface DocumentMetadata {
  fileName: string;
  mimeType: string;
  pageCount?: number;
  [key: string]: any;
}

/**
 * Represents a chunk of text from a document
 */
export interface TextChunk {
  text: string;
  chunkIndex: number;
  metadata: ChunkMetadata;
}

/**
 * Metadata about a chunk
 */
export interface ChunkMetadata {
  pageNumber?: number;
  startChar?: number;
  endChar?: number;
  chunkStrategy: string;
  [key: string]: any;
}

/**
 * Configuration for chunking strategies
 */
export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * Result of embedding operation
 */
export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalUsage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Processed chunk ready for storage
 */
export interface ProcessedChunk {
  text: string;
  chunkIndex: number;
  embedding: number[];
  metadata: ChunkMetadata;
}

/**
 * Result of document processing
 */
export interface ProcessingResult {
  fileId: string;
  chunksCreated: number;
  vectorsInserted: number;
  processingTimeMs: number;
}
