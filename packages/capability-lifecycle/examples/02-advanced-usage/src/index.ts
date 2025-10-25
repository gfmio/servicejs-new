/**
 * Cleanup temporary files and resources on exit
 */

import { createInMemoryLifecycle } from '@servicejs/capability-lifecycle';

console.log('Cleanup on Exit Example\n');

const lifecycle = createInMemoryLifecycle();

// Simulate temporary files and resources
const tempFiles: string[] = [];
const tempDirs: string[] = [];

// Create some temporary resources
console.log('Creating temporary resources...\n');

tempFiles.push('/tmp/app-12345.log');
tempFiles.push('/tmp/cache-67890.dat');
tempDirs.push('/tmp/upload-abc');

console.log('Temporary files:');
tempFiles.forEach(f => console.log(`  - ${f}`));
console.log('\nTemporary directories:');
tempDirs.forEach(d => console.log(`  - ${d}`));

// Register cleanup handlers (in LIFO order - last registered runs first)
lifecycle.onShutdown(async () => {
  console.log('\n[Step 1] Removing temporary files...');
  for (const file of tempFiles) {
    console.log(`  Removing ${file}`);
    // Simulate file deletion
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  tempFiles.length = 0;
});

lifecycle.onShutdown(async () => {
  console.log('[Step 2] Removing temporary directories...');
  for (const dir of tempDirs) {
    console.log(`  Removing ${dir}`);
    // Simulate directory deletion
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  tempDirs.length = 0;
});

lifecycle.onShutdown(async () => {
  console.log('[Step 3] Final cleanup verification...');
  console.log(`  Temp files remaining: ${tempFiles.length}`);
  console.log(`  Temp dirs remaining: ${tempDirs.length}`);
  console.log('  All cleanup complete!');
});

// Trigger exit cleanup
console.log('\nTriggering application exit...');
await lifecycle.shutdown('Application exit');

console.log('\nCleanup finished!');
