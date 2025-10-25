/**
 * Hello World Example for Web Worker
 */
import { bootstrap } from '@servicejs/runtime-web-worker';

async function main() {
  const runtime = bootstrap();

  runtime.console.log('🚀 Hello from ServiceJS on Web Worker!');

  // Show environment
  const platform = runtime.env.platform();
  runtime.console.log(`Platform: ${platform}`);

  // Show current time
  const now = runtime.time.now();
  runtime.console.log(`Timestamp: ${now}`);

  // Generate UUID
  const uuid = runtime.crypto.randomUUID();
  runtime.console.log(`UUID: ${uuid}`);

  runtime.console.log('✨ Example complete!');
}

main().catch(console.error);
