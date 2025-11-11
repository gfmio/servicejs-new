/**
 * File Operations Example - Worker Thread
 */
import { bootstrap } from '@servicejs/runtime-bun-worker';
import { isOk } from '@servicejs/result';
import { join } from 'path';

const runtime = bootstrap();

runtime.self.onMessage(async (message: any) => {
  if (message.action !== 'start') return;

  const testDir = message.dir;
  const log = (msg: string) => runtime.self.postMessage({ type: 'log', message: msg });

  // Create directory
  log('Creating directory...');
  await runtime.fs.mkdir(testDir, { recursive: true });

  // Write files
  let filesCreated = 0;
  for (const name of ['test1.txt', 'test2.txt', 'test3.txt']) {
    const path = join(testDir, name);
    const result = await runtime.fs.writeFile(path, `Content of ${name}`);
    if (isOk(result)) {
      filesCreated++;
      log(`✓ ${name} written`);
    }
  }

  // Read directory
  const readdirResult = await runtime.fs.readdir(testDir);
  if (isOk(readdirResult)) {
    log(`Found ${readdirResult.value.length} files`);
  }

  // Cleanup
  await runtime.fs.remove(testDir);
  log('✓ Cleaned up');

  runtime.self.postMessage({ type: 'complete', filesCreated });
});

runtime.self.postMessage({ type: 'log', message: 'Worker ready!' });
