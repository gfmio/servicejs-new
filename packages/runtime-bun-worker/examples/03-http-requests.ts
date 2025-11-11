/**
 * HTTP Requests Example
 * Demonstrates making HTTP requests in a Bun worker
 */
import { join } from 'path';

const worker = new Worker(join(import.meta.dir, '03-http-requests-thread.ts'));

worker.onmessage = (event) => {
  if (event.data.type === 'log') {
    console.log(`📝 [Worker]: ${event.data.message}`);
  } else if (event.data.type === 'result') {
    console.log(`\n✅ Results: ${event.data.successCount} successful, ${event.data.errorCount} errors`);
    setTimeout(() => worker.terminate(), 100);
  }
};

worker.postMessage({ action: 'start', url: 'https://jsonplaceholder.typicode.com' });
