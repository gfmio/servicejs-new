/**
 * Resource Management Example
 *
 * Demonstrates RAII pattern with automatic resource cleanup.
 */

import { createResourceOwner, withResource } from '../src/resources.js';

// Simulate file operations
interface FileHandle {
  readonly path: string;
  open: boolean;
  content: string;
}

const openFiles = new Map<string, FileHandle>();

async function openFile(path: string): Promise<FileHandle> {
  console.log(`Opening file: ${path}`);
  await new Promise((resolve) => setTimeout(resolve, 20));

  const handle: FileHandle = {
    path,
    open: true,
    content: `Contents of ${path}`,
  };

  openFiles.set(path, handle);
  console.log(`File opened: ${path}`);
  return handle;
}

async function closeFile(handle: FileHandle): Promise<void> {
  console.log(`Closing file: ${handle.path}`);
  await new Promise((resolve) => setTimeout(resolve, 10));

  handle.open = false;
  openFiles.delete(handle.path);
  console.log(`File closed: ${handle.path}`);
}

async function readFile(handle: FileHandle): Promise<string> {
  if (!handle.open) {
    throw new Error(`Cannot read from closed file: ${handle.path}`);
  }
  console.log(`Reading file: ${handle.path}`);
  return handle.content;
}

async function writeFile(handle: FileHandle, content: string): Promise<void> {
  if (!handle.open) {
    throw new Error(`Cannot write to closed file: ${handle.path}`);
  }
  console.log(`Writing to file: ${handle.path}`);
  handle.content = content;
}

// Example 1: Basic resource management with ResourceOwner
console.log('\n=== Example 1: Resource Owner ===\n');

const owner = createResourceOwner();

const fileResult = await owner.acquire(
  async () => await openFile('data.txt'),
  async (file) => await closeFile(file)
);

if (fileResult.isOk()) {
  const file = fileResult.value;
  const content = await readFile(file.value);
  console.log(`Read: ${content}`);
}

// Cleanup all resources
console.log('\nCleaning up resources...');
await owner.cleanup();

// Example 2: Multiple resources with LIFO cleanup
console.log('\n=== Example 2: Multiple Resources (LIFO) ===\n');

const owner2 = createResourceOwner();

await owner2.acquire(
  async () => await openFile('file1.txt'),
  async (file) => await closeFile(file)
);

await owner2.acquire(
  async () => await openFile('file2.txt'),
  async (file) => await closeFile(file)
);

await owner2.acquire(
  async () => await openFile('file3.txt'),
  async (file) => await closeFile(file)
);

console.log(`\nOpened ${owner2.size()} files`);
console.log('Cleaning up (LIFO order)...');
await owner2.cleanup();

// Example 3: withResource helper (RAII pattern)
console.log('\n=== Example 3: withResource (RAII) ===\n');

const result = await withResource(
  async () => await openFile('temp.txt'),
  async (file) => await closeFile(file),
  async (file) => {
    await writeFile(file, 'Hello, World!');
    const content = await readFile(file);
    return content.length;
  }
);

if (result.isOk()) {
  console.log(`\nOperation result: ${result.value} characters written`);
}

// Example 4: Error handling - acquire failure
console.log('\n=== Example 4: Acquire Error Handling ===\n');

const owner4 = createResourceOwner();

const errorResult = await owner4.acquire(
  async () => {
    console.log('Attempting to acquire resource...');
    throw new Error('Resource unavailable');
  },
  async () => {
    console.log('This cleanup should not be called');
  }
);

if (errorResult.isErr()) {
  console.log(`✗ Acquire failed: ${errorResult.error.type}`);
}

console.log(`Resources acquired: ${owner4.size()}`);

// Example 5: Error handling - cleanup failure
console.log('\n=== Example 5: Cleanup Error Handling ===\n');

const owner5 = createResourceOwner();

await owner5.acquire(
  async () => await openFile('good.txt'),
  async (file) => await closeFile(file)
);

await owner5.acquire(
  async () => await openFile('bad.txt'),
  async (file) => {
    console.log(`Attempting to close ${file.path}...`);
    throw new Error('Cleanup failed!');
  }
);

await owner5.acquire(
  async () => await openFile('also-good.txt'),
  async (file) => await closeFile(file)
);

console.log('\nCleaning up with errors...');
const cleanupResult = await owner5.cleanup();
if (cleanupResult.isErr()) {
  console.log(`⚠ Cleanup completed with errors: ${cleanupResult.error.type}`);
  if (cleanupResult.error.type === 'PARTIAL_CLEANUP') {
    console.log(`  ${cleanupResult.error.errors.length} resource(s) failed to cleanup`);
  }
}

// Example 6: withResource error handling
console.log('\n=== Example 6: withResource Error Handling ===\n');

const useError = await withResource(
  async () => await openFile('error.txt'),
  async (file) => await closeFile(file),
  async (file) => {
    console.log('Using resource...');
    throw new Error('Operation failed!');
  }
);

if (useError.isErr()) {
  console.log(`✗ Operation failed: ${useError.error.type}`);
}
console.log('Note: File was still closed despite error');

// Example 7: Nested resources
console.log('\n=== Example 7: Nested Resources ===\n');

const nested = await withResource(
  async () => await openFile('outer.txt'),
  async (file) => await closeFile(file),
  async (outerFile) => {
    const outerContent = await readFile(outerFile);
    console.log(`Outer: ${outerContent}`);

    return await withResource(
      async () => await openFile('inner.txt'),
      async (file) => await closeFile(file),
      async (innerFile) => {
        const innerContent = await readFile(innerFile);
        console.log(`Inner: ${innerContent}`);
        return { outer: outerContent, inner: innerContent };
      }
    );
  }
);

if (nested.isOk() && nested.value.isOk()) {
  console.log('\n✓ Nested resources cleaned up successfully');
}

// Example 8: Resource reuse prevention
console.log('\n=== Example 8: Resource Owner Reuse Prevention ===\n');

const owner8 = createResourceOwner();

await owner8.acquire(
  async () => await openFile('test.txt'),
  async (file) => await closeFile(file)
);

await owner8.cleanup();
console.log('First cleanup complete');

const reuseResult = await owner8.acquire(
  async () => await openFile('test2.txt'),
  async (file) => await closeFile(file)
);

if (reuseResult.isErr()) {
  console.log(`✗ Acquire after cleanup failed: ${reuseResult.error.type}`);
}

// Example 9: Database transaction pattern
console.log('\n=== Example 9: Database Transaction Pattern ===\n');

interface Transaction {
  id: string;
  active: boolean;
}

async function beginTransaction(): Promise<Transaction> {
  const txn = { id: Math.random().toString(36).substr(2, 9), active: true };
  console.log(`BEGIN TRANSACTION ${txn.id}`);
  return txn;
}

async function commitTransaction(txn: Transaction): Promise<void> {
  console.log(`COMMIT TRANSACTION ${txn.id}`);
  txn.active = false;
}

async function rollbackTransaction(txn: Transaction): Promise<void> {
  console.log(`ROLLBACK TRANSACTION ${txn.id}`);
  txn.active = false;
}

// Successful transaction
const txnResult = await withResource(
  async () => await beginTransaction(),
  async (txn) => await commitTransaction(txn),
  async (txn) => {
    console.log(`  INSERT INTO users VALUES ('Alice')`);
    console.log(`  INSERT INTO users VALUES ('Bob')`);
    return 2;
  }
);

if (txnResult.isOk()) {
  console.log(`✓ Transaction committed: ${txnResult.value} rows inserted\n`);
}

// Failed transaction (should rollback)
const owner9 = createResourceOwner();
let txnRolledBack = false;

const txnResource = await owner9.acquire(
  async () => await beginTransaction(),
  async (txn) => {
    txnRolledBack = true;
    await rollbackTransaction(txn);
  }
);

if (txnResource.isOk()) {
  const txn = txnResource.value.value;
  try {
    console.log(`  INSERT INTO users VALUES ('Charlie')`);
    throw new Error('Constraint violation!');
  } catch (error) {
    console.log(`✗ Error: ${(error as Error).message}`);
    await owner9.cleanup();
  }
}

console.log(`Transaction rolled back: ${txnRolledBack}`);
