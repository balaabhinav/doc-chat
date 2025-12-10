import dotenv from 'dotenv';
import { createQueueWorker } from './QueueWorker';

// Load environment variables
dotenv.config();

/**
 * Worker entry point
 * This script starts the queue worker that processes document ingestion jobs
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Document Processing Worker');
  console.log('='.repeat(60));
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Poll Interval: ${process.env.WORKER_POLL_INTERVAL || '5000'}ms`);
  console.log(`Chunk Size: ${process.env.CHUNK_SIZE || '512'} characters`);
  console.log(`Chunk Overlap: ${process.env.CHUNK_OVERLAP || '50'} characters`);
  console.log(`Chunking Strategy: ${process.env.DEFAULT_CHUNKING_STRATEGY || 'fixed-size'}`);
  console.log(`Embedding Model: ${process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002'}`);
  console.log('='.repeat(60));

  // Create and start the worker
  const worker = createQueueWorker();
  
  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n[Worker] Received shutdown signal');
    worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start the worker
  await worker.start();
}

// Run the worker
main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
