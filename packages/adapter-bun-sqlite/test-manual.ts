import { createSqliteAdapter } from './src/sqlite.js';

const adapter = createSqliteAdapter();
const result = await adapter.init({ filename: ':memory:' });

console.log('Result:', result);
if ('error' in result) {
  console.log('Error:', result.error);
}
