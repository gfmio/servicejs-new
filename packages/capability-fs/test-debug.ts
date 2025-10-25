import { createInMemoryFS } from './src/in-memory.js';

const fs = createInMemoryFS();
await fs.mkdir('/data');
const writeResult = await fs.writeFile('/data/test.txt', 'Hello!', { encoding: 'utf8' });

console.log('writeResult:', writeResult);

if (!writeResult.ok) {
  console.log('Error:', writeResult.error);
}
