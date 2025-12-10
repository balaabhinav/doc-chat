import { LoadedDocument } from '../../../types/ingestion.types';

/**
 * Interface for document loaders
 * Implementations should handle specific file types (PDF, DOCX, TXT, etc.)
 */
export interface IDocumentLoader {
  /**
   * Load and parse a document from a file path
   * @param filePath - Path to the file to load
   * @returns Promise<LoadedDocument> - The loaded document with text and metadata
   */
  load(filePath: string): Promise<LoadedDocument>;

  /**
   * Check if this loader supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns boolean - True if this loader can handle the MIME type
   */
  supports(mimeType: string): boolean;
}
