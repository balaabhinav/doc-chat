import { IDocumentLoader } from './IDocumentLoader';
import { createPDFDocumentLoader } from './PDFDocumentLoader';

/**
 * Factory for creating document loaders based on MIME type
 */
export class DocumentLoaderFactory {
  private loaders: IDocumentLoader[];

  constructor() {
    // Register all available loaders
    this.loaders = [
      createPDFDocumentLoader(),
      // Add more loaders here as they are implemented
      // createDOCXDocumentLoader(),
      // createTXTDocumentLoader(),
    ];
  }

  /**
   * Get the appropriate loader for a given MIME type
   * @param mimeType - MIME type of the document
   * @returns IDocumentLoader - The loader that supports the MIME type
   * @throws Error if no loader supports the MIME type
   */
  getLoader(mimeType: string): IDocumentLoader {
    const loader = this.loaders.find((l) => l.supports(mimeType));

    if (!loader) {
      throw new Error(
        `No document loader found for MIME type: ${mimeType}. Supported types: ${this.getSupportedMimeTypes().join(', ')}`
      );
    }

    return loader;
  }

  /**
   * Get all supported MIME types
   * @returns string[] - Array of supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    const mimeTypes: string[] = [];
    
    // Common MIME types to check
    const commonMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    for (const mimeType of commonMimeTypes) {
      if (this.loaders.some((l) => l.supports(mimeType))) {
        mimeTypes.push(mimeType);
      }
    }

    return mimeTypes;
  }

  /**
   * Check if a MIME type is supported
   * @param mimeType - MIME type to check
   * @returns boolean - True if the MIME type is supported
   */
  isSupported(mimeType: string): boolean {
    return this.loaders.some((l) => l.supports(mimeType));
  }
}

/**
 * Singleton instance of the document loader factory
 */
let factoryInstance: DocumentLoaderFactory | null = null;

/**
 * Get the document loader factory instance
 * @returns DocumentLoaderFactory - The factory instance
 */
export const getDocumentLoaderFactory = (): DocumentLoaderFactory => {
  if (!factoryInstance) {
    factoryInstance = new DocumentLoaderFactory();
  }
  return factoryInstance;
};
