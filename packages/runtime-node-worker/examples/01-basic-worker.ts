/**
 * Basic Worker Example - Main Thread
 *
 * This example demonstrates how to spawn a worker thread and communicate with it.
 */
import { Worker } from 'worker_threads';
import { join } from 'path';

async function main() {
  console.log('🚀 Starting Worker Example\n');

  // Create a worker
  const worker = new Worker(join(__dirname, '01-basic-worker-thread.ts'), {
    workerData: {
      WORKER_NAME: 'example-worker',
      WORKER_ID: '12345',
    },
  });

  // Listen for messages from worker
  worker.on('message', (message) => {
    console.log('📨 Received from worker:', message);
  });

  // Listen for errors
  worker.on('error', (error) => {
    console.error('❌ Worker error:', error);
  });

  // Listen for exit
  worker.on('exit', (code) => {
    console.log(`\n👋 Worker exited with code ${code}`);
  });

  // Send some messages to the worker
  console.log('📤 Sending messages to worker...\n');

  worker.postMessage({ action: 'greet', name: 'ServiceJS' });

  setTimeout(() => {
    worker.postMessage({ action: 'compute', data: [1, 2, 3, 4, 5] });
  }, 100);

  setTimeout(() => {
    worker.postMessage({ action: 'shutdown' });
  }, 500);
}

main().catch(console.error);
