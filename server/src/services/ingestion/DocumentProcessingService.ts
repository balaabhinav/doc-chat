import * as path from 'path';
import { QueueWithFile } from '../../repositories/queue.repository';
import { getDocumentLoaderFactory } from './loader/DocumentLoaderFactory';
import { getChunkingStrategyFactory } from './chunker/ChunkingStrategyFactory';
import { createOpenAIEmbeddingService } from './embedder/OpenAIEmbeddingService';
import { createManyChunks } from '../../repositories/chunk.repository';
import { insertVectors } from '../../repositories/vector.repository';
import { ProcessingResult } from '../../types/ingestion.types';
import { VectorData } from '../../repositories/vector.types';

/**
 * Document processing service
 * Orchestrates the entire document ingestion pipeline:
 * 1. Load document
 * 2. Chunk text
 * 3. Generate embeddings
 * 4. Store chunks in database
 * 5. Insert vectors into vector store
 */
export class DocumentProcessingService {
  /**
   * Process a document from the queue
   * @param queueItem - Queue item with file information
   * @returns Promise<ProcessingResult> - Result of processing
   */
  async processDocument(queueItem: QueueWithFile): Promise<ProcessingResult> {
    const startTime = Date.now();
    const { file } = queueItem;

    try {
      console.log(`[DocumentProcessing] Starting processing for file: ${file.id} (${file.name})`);

      // Step 1: Load the document
      console.log(`[DocumentProcessing] Loading document...`);
      const loaderFactory = getDocumentLoaderFactory();
      const loader = loaderFactory.getLoader(file.mimeType);
      const document = await loader.load(file.url);
      console.log(`[DocumentProcessing] Document loaded. Text length: ${document.text.length} characters`);

      // Step 2: Chunk the document
      console.log(`[DocumentProcessing] Chunking document...`);
      const chunkingFactory = getChunkingStrategyFactory();
      const strategyName = process.env.DEFAULT_CHUNKING_STRATEGY || 'fixed-size';
      const strategy = chunkingFactory.getStrategy(strategyName);
      
      const chunkSize = parseInt(process.env.CHUNK_SIZE || '512', 10);
      const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '50', 10);
      
      const textChunks = strategy.chunk(document.text, {
        chunkSize,
        chunkOverlap,
      });
      console.log(`[DocumentProcessing] Created ${textChunks.length} chunks`);

      if (textChunks.length === 0) {
        throw new Error('No chunks created from document. Document may be empty.');
      }

      // Step 3: Generate embeddings
      console.log(`[DocumentProcessing] Generating embeddings...`);
      const embeddingService = createOpenAIEmbeddingService();
      const texts = textChunks.map((chunk) => chunk.text);
      const batchResult = await embeddingService.embedBatch(texts);
      console.log(`[DocumentProcessing] Generated ${batchResult.embeddings.length} embeddings`);
      console.log(`[DocumentProcessing] Token usage - Prompt: ${batchResult.totalUsage?.promptTokens}, Total: ${batchResult.totalUsage?.totalTokens}`);

      // Step 4: Store chunks in database
      console.log(`[DocumentProcessing] Storing chunks in database...`);
      const chunksToCreate = textChunks.map((chunk, index) => ({
        fileId: file.id,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        pageNumber: chunk.metadata.pageNumber || null,
        chunkStrategy: chunk.metadata.chunkStrategy,
        startChar: chunk.metadata.startChar || null,
        endChar: chunk.metadata.endChar || null,
      }));

      const chunksCreated = await createManyChunks(chunksToCreate);
      console.log(`[DocumentProcessing] Stored ${chunksCreated} chunks in database`);

      // Step 5: Insert vectors into vector store
      console.log(`[DocumentProcessing] Inserting vectors into vector store...`);
      const vectorsToInsert: VectorData[] = textChunks.map((chunk, index) => ({
        file_id: file.id,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.metadata.pageNumber || undefined,
        chunk_strategy: chunk.metadata.chunkStrategy,
        vector: batchResult.embeddings[index],
        created_at: Date.now(),
        embedding_version: 1, // Version tracking for embeddings
      }));

      const insertResult = await insertVectors(vectorsToInsert);
      console.log(`[DocumentProcessing] Inserted ${insertResult.insertedCount} vectors`);

      const processingTimeMs = Date.now() - startTime;
      console.log(`[DocumentProcessing] Processing completed in ${processingTimeMs}ms`);

      return {
        fileId: file.id,
        chunksCreated,
        vectorsInserted: insertResult.insertedCount,
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error(`[DocumentProcessing] Error processing file ${file.id}:`, error);
      throw error;
    }
  }

  /**
   * Validate that a file can be processed
   * @param mimeType - MIME type of the file
   * @returns boolean - True if the file can be processed
   */
  canProcess(mimeType: string): boolean {
    const loaderFactory = getDocumentLoaderFactory();
    return loaderFactory.isSupported(mimeType);
  }

  /**
   * Get supported MIME types
   * @returns string[] - Array of supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    const loaderFactory = getDocumentLoaderFactory();
    return loaderFactory.getSupportedMimeTypes();
  }
}

/**
 * Singleton instance of the document processing service
 */
let serviceInstance: DocumentProcessingService | null = null;

/**
 * Get the document processing service instance
 * @returns DocumentProcessingService - The service instance
 */
export const getDocumentProcessingService = (): DocumentProcessingService => {
  if (!serviceInstance) {
    serviceInstance = new DocumentProcessingService();
  }
  return serviceInstance;
};
