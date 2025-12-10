# Document Ingestion Pipeline

This document describes the document ingestion and processing pipeline for the doc-chat application.

## Overview

The ingestion pipeline processes uploaded documents through the following stages:

1. **File Upload** - User uploads a file via the API
2. **Queue Creation** - File is added to processing queue
3. **Document Loading** - Worker loads and parses the document
4. **Text Chunking** - Document text is split into chunks
5. **Embedding Generation** - Chunks are converted to vector embeddings
6. **Storage** - Chunks and vectors are stored in databases

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/upload
       ▼
┌─────────────────────────────────────────────────────┐
│                   API Server                        │
│  ┌──────────────┐         ┌──────────────┐        │
│  │ Upload Route │────────▶│ Queue Table  │        │
│  └──────────────┘         └──────────────┘        │
└─────────────────────────────────────────────────────┘
                                   │
                                   │ Polls every 5s
                                   ▼
┌─────────────────────────────────────────────────────┐
│                  Worker Process                     │
│  ┌──────────────────────────────────────────────┐  │
│  │      DocumentProcessingService               │  │
│  │                                              │  │
│  │  1. DocumentLoader (PDF)                     │  │
│  │  2. ChunkingStrategy (Fixed-size)            │  │
│  │  3. EmbeddingService (OpenAI Ada)            │  │
│  │  4. Store chunks → Prisma DB                 │  │
│  │  5. Store vectors → Milvus                   │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
         ┌──────────────┐    ┌──────────────┐
         │  Chunk Table │    │    Milvus    │
         │  (Prisma)    │    │ (Vectors)    │
         └──────────────┘    └──────────────┘
```

## Components

### 1. Document Loaders (`server/src/services/ingestion/loader/`)

**Purpose**: Load and parse different document types

**Current Implementations**:
- `PDFDocumentLoader` - Extracts text from PDF files using pdf-parse

**Factory Pattern**: `DocumentLoaderFactory` selects the appropriate loader based on MIME type

**Extensibility**: Add new loaders by implementing `IDocumentLoader` interface

### 2. Chunking Strategies (`server/src/services/ingestion/chunker/`)

**Purpose**: Split document text into manageable chunks

**Current Implementations**:
- `FixedSizeChunkingStrategy` - Splits text into fixed-size chunks with overlap

**Configuration**:
- `CHUNK_SIZE` - Characters per chunk (default: 512)
- `CHUNK_OVERLAP` - Overlap between chunks (default: 50)

**Factory Pattern**: `ChunkingStrategyFactory` provides strategy by name

**Extensibility**: Add new strategies by implementing `IChunkingStrategy` interface

### 3. Embedding Service (`server/src/services/ingestion/embedder/`)

**Purpose**: Generate vector embeddings from text

**Current Implementation**:
- `OpenAIEmbeddingService` - Uses OpenAI's embedding API

**Supported Models**:
- `text-embedding-ada-002` (1536 dimensions) - Default
- `text-embedding-3-small` (1536 dimensions)
- `text-embedding-3-large` (3072 dimensions)

**Features**:
- Batch processing (up to 100 texts per request)
- Automatic batching for large datasets
- Token usage tracking

### 4. Document Processing Service (`server/src/services/ingestion/DocumentProcessingService.ts`)

**Purpose**: Orchestrates the entire pipeline

**Process Flow**:
1. Load document using appropriate loader
2. Chunk text using configured strategy
3. Generate embeddings in batch
4. Store chunks in Prisma database
5. Insert vectors into Milvus
6. Update queue status

### 5. Queue Worker (`server/src/services/worker/`)

**Purpose**: Background process that polls and processes queued documents

**Features**:
- Configurable poll interval
- Automatic status updates (queued → processing → success/error)
- Error handling and logging
- Graceful shutdown

## Database Schema

### Chunk Table (Prisma)
```prisma
model Chunk {
  id            String   @id @default(uuid())
  fileId        String
  chunkIndex    Int
  text          String
  pageNumber    Int?
  chunkStrategy String
  startChar     Int?
  endChar       Int?
  createdAt     DateTime @default(now())
  
  @@unique([fileId, chunkIndex])
}
```

### Vector Store (Milvus)
```typescript
{
  pk: number              // Auto-generated
  file_id: string         // Links to File.id
  chunk_index: number     // Links to Chunk.chunkIndex
  page_number?: number    // Optional page reference
  chunk_strategy: string  // Strategy used
  vector: number[]        // Embedding (1536 dims for Ada)
  created_at: number      // Timestamp
  embedding_version?: number
}
```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Chunking Configuration
CHUNK_SIZE=512
CHUNK_OVERLAP=50
DEFAULT_CHUNKING_STRATEGY=fixed-size

# Worker Configuration
WORKER_POLL_INTERVAL=5000  # milliseconds

# Vector Database
VECTOR_DB_ENDPOINT=your-milvus-endpoint
VECTOR_DB_TOKEN=your-milvus-token
VECTOR_COLLECTION_NAME=document_embeddings
VECTOR_DIMENSION=1536
```

## Usage

### Starting the Services

1. **Start the API Server**:
```bash
cd server
npm run dev
```

2. **Start the Worker** (in a separate terminal):
```bash
cd server
npm run worker:dev
```

### Uploading a Document

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@document.pdf"
```

Response:
```json
{
  "id": "file-uuid",
  "name": "document.pdf",
  "queueId": "queue-uuid",
  "queueStatus": "queued"
}
```

### Checking Processing Status

```bash
# By queue ID
curl http://localhost:3000/api/queue/{queueId}

# By file ID
curl http://localhost:3000/api/queue/file/{fileId}

# Queue statistics
curl http://localhost:3000/api/queue/stats/summary
```

## API Endpoints

### Queue Management

- `GET /api/queue/:id` - Get queue item by ID
- `GET /api/queue/file/:fileId` - Get queue item by file ID
- `GET /api/queue` - Get all queue items
- `GET /api/queue/stats/summary` - Get queue statistics

## Extending the Pipeline

### Adding a New Document Type

1. Create a new loader implementing `IDocumentLoader`:
```typescript
export class DOCXDocumentLoader implements IDocumentLoader {
  async load(filePath: string): Promise<LoadedDocument> {
    // Implementation
  }
  
  supports(mimeType: string): boolean {
    return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
}
```

2. Register in `DocumentLoaderFactory`:
```typescript
this.loaders = [
  createPDFDocumentLoader(),
  createDOCXDocumentLoader(), // Add here
];
```

### Adding a New Chunking Strategy

1. Create a new strategy implementing `IChunkingStrategy`:
```typescript
export class SemanticChunkingStrategy implements IChunkingStrategy {
  chunk(text: string, config: ChunkingConfig): TextChunk[] {
    // Implementation
  }
  
  getName(): string {
    return 'semantic';
  }
}
```

2. Register in `ChunkingStrategyFactory`:
```typescript
const semanticStrategy = createSemanticChunkingStrategy();
this.strategies.set(semanticStrategy.getName(), semanticStrategy);
```

3. Update environment variable:
```bash
DEFAULT_CHUNKING_STRATEGY=semantic
```

## Monitoring and Debugging

### Worker Logs

The worker provides detailed logging:
```
[QueueWorker] Found queued item: {id} for file: {name}
[DocumentProcessing] Starting processing for file: {id}
[DocumentProcessing] Document loaded. Text length: {chars} characters
[DocumentProcessing] Created {count} chunks
[DocumentProcessing] Generated {count} embeddings
[DocumentProcessing] Token usage - Prompt: {tokens}, Total: {tokens}
[DocumentProcessing] Stored {count} chunks in database
[DocumentProcessing] Inserted {count} vectors
[DocumentProcessing] Processing completed in {ms}ms
```

### Queue Status Values

- `queued` - Waiting to be processed
- `processing` - Currently being processed
- `success` - Successfully processed
- `error` - Processing failed (check `lastError` field)

## Performance Considerations

### Batch Processing

- Embeddings are generated in batches of 100 (OpenAI limit)
- Chunks are inserted in bulk to database
- Vectors are inserted in batch to Milvus

### Token Usage

- Monitor OpenAI token usage in logs
- Adjust `CHUNK_SIZE` to control token consumption
- Larger chunks = fewer API calls but less granular retrieval

### Worker Scaling

- Run multiple worker instances for parallel processing
- Implement distributed locking for production (e.g., Redis)
- Current implementation processes one file at a time per worker

## Troubleshooting

### Common Issues

1. **Worker not processing files**
   - Check worker is running: `npm run worker:dev`
   - Verify `OPENAI_API_KEY` is set
   - Check Milvus connection

2. **Embedding errors**
   - Verify OpenAI API key is valid
   - Check token limits and rate limits
   - Ensure `VECTOR_DIMENSION` matches model

3. **PDF parsing errors**
   - Some PDFs may be scanned images (no text)
   - Consider adding OCR for image-based PDFs

## Future Enhancements

- [ ] Support for DOCX, TXT, Markdown files
- [ ] Semantic chunking strategy
- [ ] Recursive character text splitting
- [ ] OCR for scanned PDFs
- [ ] Retry logic for failed jobs
- [ ] Progress tracking for large files
- [ ] Webhook notifications on completion
- [ ] Distributed worker coordination
