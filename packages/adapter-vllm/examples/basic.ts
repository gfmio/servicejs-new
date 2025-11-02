/**
 * vLLM basic usage example
 */

import { createVLLMAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createVLLMAdapter();

  await adapter.init({
    baseURL: process.env.VLLM_URL || 'http://localhost:8000',
    apiKey: process.env.VLLM_API_KEY,
  });

  await adapter.start();

  console.log('=== Text Completion ===');

  const response = await adapter.complete('Explain machine learning', {
    temperature: 0.8,
    max_tokens: 100,
  });

  if (isOk(response)) {
    console.log('Response:', response.value);
  }

  await adapter.stop();
}

main().catch(console.error);
