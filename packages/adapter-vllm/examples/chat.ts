/**
 * vLLM chat example
 */

import { createVLLMAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createVLLMAdapter();
  await adapter.init({
    baseURL: process.env.VLLM_URL || 'http://localhost:8000',
  });
  await adapter.start();

  console.log('=== Chat Completion ===');

  const response = await adapter.chat([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is vLLM?' },
  ], {
    temperature: 0.7,
    max_tokens: 150,
  });

  if (isOk(response)) {
    console.log('Assistant:', response.value);
  }

  await adapter.stop();
}

main().catch(console.error);
