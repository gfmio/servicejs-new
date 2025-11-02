/**
 * Ollama embeddings example
 */

import { createOllamaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOllamaAdapter();
  await adapter.init({ baseURL: 'http://localhost:11434' });
  await adapter.start();

  console.log('=== Generate Embeddings ===');

  const embeddings = await adapter.embeddings('llama2', 'Machine learning is fascinating');

  if (isOk(embeddings)) {
    console.log(`Generated ${embeddings.value.length}-dimensional embedding`);
    console.log('First 5 values:', embeddings.value.slice(0, 5));
  }

  await adapter.stop();
}

main().catch(console.error);
