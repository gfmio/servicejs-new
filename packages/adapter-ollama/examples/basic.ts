/**
 * Ollama basic usage example
 */

import { createOllamaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOllamaAdapter();

  await adapter.init({
    baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
  });

  await adapter.start();

  console.log('=== Text Generation ===');

  const response = await adapter.generate('llama2', 'Explain quantum computing');

  if (isOk(response)) {
    console.log('Response:', response.value);
  }

  console.log('\n=== List Models ===');

  const models = await adapter.listModels();
  if (isOk(models)) {
    models.value.forEach(m => {
      console.log(`- ${m.name} (${m.size} bytes)`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
