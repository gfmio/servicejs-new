/**
 * Ollama chat example
 */

import { createOllamaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOllamaAdapter();
  await adapter.init({ baseURL: 'http://localhost:11434' });
  await adapter.start();

  console.log('=== Chat Conversation ===');

  const response = await adapter.chat('llama2', [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' },
  ]);

  if (isOk(response)) {
    console.log('Assistant:', response.value);
  }

  await adapter.stop();
}

main().catch(console.error);
