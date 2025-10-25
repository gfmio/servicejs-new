/**
 * File tree manipulation
 */

import { createInMemoryFS } from '@servicejs/capability-fs';
import { isOk } from '@servicejs/result';

console.log('File Tree Manipulation Example\n');

const fs = createInMemoryFS();

// Create a directory structure
console.log('Creating directory structure...');
await fs.mkdir('/project');
await fs.mkdir('/project/src');
await fs.mkdir('/project/tests');
await fs.mkdir('/project/docs');

// Create files
await fs.writeFile('/project/package.json', JSON.stringify({
  name: 'my-project',
  version: '1.0.0',
  main: 'src/index.js',
}, null, 2));

await fs.writeFile('/project/src/index.js', 'console.log("Hello, world!");');
await fs.writeFile('/project/src/utils.js', 'export const add = (a, b) => a + b;');
await fs.writeFile('/project/tests/index.test.js', 'test("example", () => {});');
await fs.writeFile('/project/docs/README.md', '# My Project\n\nA sample project.');

console.log('✓ Directory structure created\n');

// Walk the directory tree
async function walkDir(path: string, indent: string = '') {
  const result = await fs.readdir(path);
  if (!isOk(result)) return;

  for (const entry of result.value) {
    const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
    const icon = entry.isFile ? '📄' : '📁';
    console.log(`${indent}${icon} ${entry.name}`);

    if (entry.isDirectory) {
      await walkDir(fullPath, indent + '  ');
    }
  }
}

console.log('Project structure:');
console.log('📁 /project');
await walkDir('/project', '  ');

// Count files by extension
console.log('\n\nFile statistics:');
async function countFilesByExtension(path: string, counts: Map<string, number> = new Map()) {
  const result = await fs.readdir(path);
  if (!isOk(result)) return counts;

  for (const entry of result.value) {
    const fullPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;

    if (entry.isFile) {
      const ext = entry.name.includes('.')
        ? entry.name.split('.').pop() || 'no-ext'
        : 'no-ext';
      counts.set(ext, (counts.get(ext) || 0) + 1);
    } else if (entry.isDirectory) {
      await countFilesByExtension(fullPath, counts);
    }
  }

  return counts;
}

const counts = await countFilesByExtension('/project');
for (const [ext, count] of counts) {
  console.log(`  .${ext}: ${count} file(s)`);
}

// Copy a file (read + write)
console.log('\n\nCopying src/index.js to src/index.backup.js...');
const readResult = await fs.readFile('/project/src/index.js');
if (isOk(readResult)) {
  await fs.writeFile('/project/src/index.backup.js', readResult.value);
  console.log('✓ File copied');
}

// Remove directory recursively
console.log('\nRemoving /project/tests directory...');
const removeResult = await fs.remove('/project/tests', { recursive: true });
if (isOk(removeResult)) {
  console.log('✓ Directory removed');
}

console.log('\nFinal structure:');
console.log('📁 /project');
await walkDir('/project', '  ');
