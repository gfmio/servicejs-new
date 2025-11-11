/**
 * Basic Worker Example - Main Thread
 *
 * This example demonstrates how to spawn a Bun worker and communicate with it.
 */
import { join } from 'path';

async function main() {
  console.log('🚀 Starting Bun Worker Example\n');

  // Create a worker
  const worker = new Worker(join(import.meta.dir, '01-basic-worker-thread.ts'));

  // Listen for messages from worker
  worker.onmessage = (event) => {
    console.log('📨 Received from worker:', event.data);
  };

  // Listen for errors
  worker.onerror = (error) => {
    console.error('❌ Worker error:', error);
  };

  // Send some messages to the worker
  console.log('📤 Sending messages to worker...\n');

  worker.postMessage({ action: 'greet', name: 'ServiceJS' });

  setTimeout(() => {
    worker.postMessage({ action: 'compute', data: [1, 2, 3, 4, 5] });
  }, 100);

  setTimeout(() => {
    worker.postMessage({ action: 'shutdown' });
    setTimeout(() => {
      worker.terminate();
      console.log('\n👋 Example complete!');
    }, 200);
  }, 500);
}

main().catch(console.error);
