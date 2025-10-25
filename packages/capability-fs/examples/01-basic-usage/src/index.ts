/**
 * In-memory file operations
 */

import { createInMemoryFS } from '@servicejs/capability-fs';
import { isOk } from '@servicejs/result';

console.log('In-Memory Filesystem Example\n');

// Create an in-memory filesystem with some initial files
const fs = createInMemoryFS({
  '/config.json': JSON.stringify({ app: 'myapp', version: '1.0.0' }),
  '/data/users.txt': 'alice\nbob\ncharlie',
  '/logs/app.log': 'Application started\n',
});

// Read a file
console.log('Reading /config.json...');
const configResult = await fs.readFile('/config.json', { encoding: 'utf8' });
if (isOk(configResult)) {
  const config = JSON.parse(configResult.value as string);
  console.log('Config:', config);
}

// Write a new file
console.log('\nWriting /data/products.txt...');
const writeResult = await fs.writeFile('/data/products.txt', 'laptop\nmouse\nkeyboard');
if (isOk(writeResult)) {
  console.log('✓ File written successfully');
}

// List directory contents
console.log('\nListing /data directory...');
const readdirResult = await fs.readdir('/data');
if (isOk(readdirResult)) {
  console.log('Files in /data:');
  for (const entry of readdirResult.value) {
    const type = entry.isFile ? 'file' : 'dir';
    console.log(`  - ${entry.name} (${type})`);
  }
}

// Get file stats
console.log('\nGetting stats for /data/users.txt...');
const statsResult = await fs.stat('/data/users.txt');
if (isOk(statsResult)) {
  const stats = statsResult.value;
  console.log(`  Size: ${stats.size} bytes`);
  console.log(`  Type: ${stats.isFile ? 'file' : 'directory'}`);
  console.log(`  Created: ${new Date(stats.createdAt).toISOString()}`);
}

// Create a directory
console.log('\nCreating /tmp directory...');
const mkdirResult = await fs.mkdir('/tmp');
if (isOk(mkdirResult)) {
  console.log('✓ Directory created');
}

// Remove a file
console.log('\nRemoving /logs/app.log...');
const removeResult = await fs.remove('/logs/app.log');
if (isOk(removeResult)) {
  console.log('✓ File removed');
}

console.log('\nFilesystem operations complete!');
