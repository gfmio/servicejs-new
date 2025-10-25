// Hello World E2E app for runtime-node
import { bootstrap } from '../../../../src/index';

async function main() {
  const runtime = bootstrap({
    captureShutdownSignals: false, // Don't capture signals in test
  });

  // Test console capability
  runtime.console.log('Hello, World!');

  // Test env capability
  const nodeEnv = runtime.env.get('NODE_ENV');
  if (nodeEnv.some) {
    runtime.console.info(`Running in ${nodeEnv.value} mode`);
  }

  // Test time capability
  const now = runtime.time.now();
  runtime.console.log(`Current timestamp: ${now}`);

  // Test process capability
  runtime.console.log(`Process ID: ${runtime.process.pid}`);
  runtime.console.log(`Platform: ${runtime.process.platform}`);
  runtime.console.log(`Bun version: ${runtime.process.version}`);

  // Test crypto capability
  const uuid = runtime.crypto.randomUUID();
  runtime.console.log(`Generated UUID: ${uuid}`);

  // Clean exit
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
