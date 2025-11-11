/**
 * Basic Worker Example - Worker Thread
 *
 * This example demonstrates the Bun worker runtime capabilities.
 */
import { bootstrap } from '@servicejs/runtime-bun-worker';
import { isOk } from '@servicejs/result';

// Bootstrap the worker runtime
const runtime = bootstrap();

console.log('👷 Worker started!');
console.log(`Platform: ${typeof runtime.env.platform === 'function' ? runtime.env.platform() : runtime.env.platform}`);

// Handle messages from main thread
runtime.self.onMessage(async (message: any) => {
  console.log('📬 Worker received:', message);

  switch (message.action) {
    case 'greet': {
      const greeting = `Hello ${message.name} from Bun worker thread!`;
      const uuidResult = runtime.crypto.randomUUID();
      const uuid = isOk(uuidResult) ? uuidResult.value : 'unknown';

      runtime.self.postMessage({
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

      runtime.self.postMessage({
        type: 'result',
        sum,
        average: avg,
        timestamp: runtime.time.now(),
      });
      break;
    }

    case 'shutdown': {
      console.log('🛑 Worker shutting down...');
      runtime.self.postMessage({
        type: 'goodbye',
        message: 'Worker shutting down gracefully',
      });

      // Close the worker
      setTimeout(() => {
        runtime.self.close();
      }, 100);
      break;
    }

    default:
      console.log('❓ Unknown action:', message.action);
  }
});

console.log('✅ Worker ready to receive messages\n');
