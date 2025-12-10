import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import { IDocumentLoader } from './IDocumentLoader';
import { LoadedDocument } from '../../../types/ingestion.types';

/**
 * Document loader for PDF files
 * Uses pdf-parse library to extract text from PDFs
 */
export class PDFDocumentLoader implements IDocumentLoader {
  private readonly supportedMimeTypes = [
    'application/pdf',
  ];

  /**
   * Load and parse a PDF document
   * @param filePath - Path to the PDF file
   * @returns Promise<LoadedDocument> - The loaded document with text and metadata
   */
  async load(filePath: string): Promise<LoadedDocument> {
    try {
      // Read the PDF file
      const dataBuffer = fs.readFileSync(filePath);

      // Parse the PDF
      const pdfData = await pdfParse(dataBuffer);

      // Extract text and metadata
      return {
        text: pdfData.text,
        metadata: {
          fileName: filePath.split('/').pop() || 'unknown',
          mimeType: 'application/pdf',
          pageCount: pdfData.numpages,
          info: pdfData.info,
          version: pdfData.version,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to load PDF document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if this loader supports the given MIME type
   * @param mimeType - MIME type to check
   * @returns boolean - True if this loader can handle the MIME type
   */
  supports(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }
}

/**
 * Factory function to create a PDF document loader
 */
export const createPDFDocumentLoader = (): PDFDocumentLoader => {
  return new PDFDocumentLoader();
};
