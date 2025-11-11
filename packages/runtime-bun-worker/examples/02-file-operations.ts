/**
 * File Operations Example
 * Demonstrates file system operations in a Bun worker
 */
import { join } from 'path';

const worker = new Worker(join(import.meta.dir, '02-file-operations-thread.ts'));

worker.onmessage = (event) => {
  if (event.data.type === 'log') {
    console.log(`📝 [Worker]: ${event.data.message}`);
  } else if (event.data.type === 'complete') {
    console.log(`\n✅ Complete! Files: ${event.data.filesCreated}`);
    setTimeout(() => worker.terminate(), 100);
  }
};

worker.postMessage({ action: 'start', dir: '/tmp/servicejs-bun-test' });
