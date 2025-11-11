/**
 * Basic Worker Example - Worker Thread
 *
 * This example demonstrates the worker runtime capabilities.
 */
import { bootstrap } from '@servicejs/runtime-node-worker';
import { isOk } from '@servicejs/result';

// Bootstrap the worker runtime
const runtime = bootstrap();

console.log('👷 Worker started!');
console.log(`Platform: ${typeof runtime.env.platform === 'function' ? runtime.env.platform() : runtime.env.platform}`);

// Get worker data
const workerName = runtime.env.get('WORKER_NAME');
const workerId = runtime.env.get('WORKER_ID');

if (workerName.isSome()) {
  console.log(`Worker name: ${workerName.value}`);
}
if (workerId.isSome()) {
  console.log(`Worker ID: ${workerId.value}`);
}

// Handle messages from main thread
runtime.parentPort.onMessage(async (message: any) => {
  console.log('📬 Worker received:', message);

  switch (message.action) {
    case 'greet': {
      const greeting = `Hello ${message.name} from worker thread!`;
      const uuidResult = runtime.crypto.randomUUID();
      const uuid = isOk(uuidResult) ? uuidResult.value : 'unknown';

      runtime.parentPort.postMessage({
        type: 'greeting',
        message: greeting,
        uuid,
        timestamp: runtime.time.now(),
      });
      break;
    }

    case 'compute': {
      // Simulate computation
      const sum = message.data.reduce((a: number, b: number) => a + b, 0);
      const avg = sum / message.data.length;

      runtime.parentPort.postMessage({
        type: 'result',
        sum,
        average: avg,
        timestamp: runtime.time.now(),
      });
      break;
    }

    case 'shutdown': {
      console.log('🛑 Worker shutting down...');
      runtime.parentPort.postMessage({
        type: 'goodbye',
        message: 'Worker shutting down gracefully',
      });

      // Close the worker
      setTimeout(() => {
        runtime.parentPort.close();
      }, 100);
      break;
    }

    default:
      console.log('❓ Unknown action:', message.action);
  }
});

console.log('✅ Worker ready to receive messages\n');
