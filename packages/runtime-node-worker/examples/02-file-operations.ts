/**
 * File Operations Example - Main Thread
 *
 * This example demonstrates file operations in a worker thread.
 */
import { Worker } from 'worker_threads';
import { join } from 'path';
import { tmpdir } from 'os';

async function main() {
  console.log('📁 File Operations Worker Example\n');

  const testDir = join(tmpdir(), 'servicejs-worker-test');

  // Create a worker
  const worker = new Worker(join(__dirname, '02-file-operations-thread.ts'), {
    workerData: {
      TEST_DIR: testDir,
    },
  });

  // Listen for messages from worker
  worker.on('message', (message) => {
    if (message.type === 'log') {
      console.log(`📝 [Worker]: ${message.message}`);
    } else if (message.type === 'error') {
      console.error(`❌ [Worker]: ${message.error}`);
    } else if (message.type === 'complete') {
      console.log(`\n✅ File operations complete!`);
      console.log(`Files created: ${message.filesCreated}`);
      console.log(`Files read: ${message.filesRead}`);
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

  // Start file operations
  worker.postMessage({ action: 'start' });
}

main().catch(console.error);
