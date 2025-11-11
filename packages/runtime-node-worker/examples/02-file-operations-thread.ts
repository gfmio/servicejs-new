/**
 * File Operations Example - Worker Thread
 *
 * This demonstrates file system operations using the runtime's filesystem capability.
 */
import { bootstrap } from '@servicejs/runtime-node-worker';
import { isOk } from '@servicejs/result';
import { join } from 'path';

// Bootstrap the worker runtime
const runtime = bootstrap();

let filesCreated = 0;
let filesRead = 0;

function log(message: string) {
  runtime.parentPort.postMessage({ type: 'log', message });
}

function error(err: string) {
  runtime.parentPort.postMessage({ type: 'error', error: err });
}

// Handle messages from main thread
runtime.parentPort.onMessage(async (message: any) => {
  if (message.action === 'start') {
    await performFileOperations();
  }
});

async function performFileOperations() {
  // Get test directory from environment
  const testDirOption = runtime.env.get('TEST_DIR');
  if (!testDirOption.isSome()) {
    error('TEST_DIR not provided');
    return;
  }

  const testDir = testDirOption.value;
  log(`Using test directory: ${testDir}`);

  // 1. Create directory
  log('Creating test directory...');
  const mkdirResult = await runtime.fs.mkdir(testDir, { recursive: true });
  if (!isOk(mkdirResult)) {
    error(`Failed to create directory: ${mkdirResult.error.message}`);
    return;
  }
  log('✓ Directory created');

  // 2. Write some files
  const files = ['test1.txt', 'test2.txt', 'test3.txt'];

  for (const filename of files) {
    const filepath = join(testDir, filename);
    const content = `This is ${filename} created by worker at ${new Date().toISOString()}`;

    log(`Writing ${filename}...`);
    const writeResult = await runtime.fs.writeFile(filepath, content);

    if (isOk(writeResult)) {
      filesCreated++;
      log(`✓ ${filename} written`);
    } else {
      error(`Failed to write ${filename}: ${writeResult.error.message}`);
    }
  }

  // 3. Read files back
  for (const filename of files) {
    const filepath = join(testDir, filename);

    // Check if file exists
    const existsResult = await runtime.fs.exists(filepath);
    if (isOk(existsResult) && existsResult.value) {
      log(`Reading ${filename}...`);
      const readResult = await runtime.fs.readFile(filepath);

      if (isOk(readResult)) {
        filesRead++;
        const content = readResult.value;
        log(`✓ ${filename} content: ${content.substring(0, 50)}...`);

        // Get file stats
        const statResult = await runtime.fs.stat(filepath);
        if (isOk(statResult)) {
          log(`  Size: ${statResult.value.size} bytes`);
        }
      } else {
        error(`Failed to read ${filename}: ${readResult.error.message}`);
      }
    }
  }

  // 4. List directory contents
  log('Listing directory contents...');
  const readdirResult = await runtime.fs.readdir(testDir);
  if (isOk(readdirResult)) {
    const entries = readdirResult.value;
    log(`✓ Found ${entries.length} entries:`);
    for (const entry of entries) {
      const type = entry.isFile ? 'file' : entry.isDirectory ? 'dir' : 'other';
      log(`  - ${entry.name} (${type})`);
    }
  } else {
    error(`Failed to list directory: ${readdirResult.error.message}`);
  }

  // 5. Clean up
  log('Cleaning up...');
  for (const filename of files) {
    const filepath = join(testDir, filename);
    const removeResult = await runtime.fs.remove(filepath);
    if (isOk(removeResult)) {
      log(`✓ Removed ${filename}`);
    }
  }

  const removeDirResult = await runtime.fs.remove(testDir);
  if (isOk(removeDirResult)) {
    log('✓ Test directory removed');
  }

  // Send completion message
  runtime.parentPort.postMessage({
    type: 'complete',
    filesCreated,
    filesRead,
  });

  // Signal we're done
  setTimeout(() => {
    runtime.parentPort.postMessage({ type: 'done' });
  }, 100);
}

log('Worker ready!');
