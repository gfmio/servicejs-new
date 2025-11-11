/**
 * HTTP Requests Example - Main Thread
 *
 * This example demonstrates making HTTP requests in a worker thread.
 */
import { Worker } from 'worker_threads';
import { join } from 'path';

async function main() {
  console.log('🌐 HTTP Requests Worker Example\n');

  // Create a worker
  const worker = new Worker(join(__dirname, '03-http-requests-thread.ts'), {
    workerData: {
      API_URL: 'https://jsonplaceholder.typicode.com',
    },
  });

  // Listen for messages from worker
  worker.on('message', (message) => {
    if (message.type === 'log') {
      console.log(`📝 [Worker]: ${message.message}`);
    } else if (message.type === 'error') {
      console.error(`❌ [Worker]: ${message.error}`);
    } else if (message.type === 'result') {
      console.log(`\n✅ Results:`);
      console.log(`  Successful requests: ${message.successCount}`);
      console.log(`  Failed requests: ${message.errorCount}`);
    } else if (message.type === 'done') {
      console.log('\n👋 Worker finished!');
      worker.terminate();
    }
  });

  // Listen for errors
  worker.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });

  // Listen for exit
  worker.on('exit', (code) => {
    console.log(`\n🏁 Worker exited with code ${code}`);
  });

  // Start HTTP operations
  worker.postMessage({ action: 'start' });
}

main().catch(console.error);
