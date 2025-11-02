/**
 * vLLM embeddings example
 */

import { createVLLMAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createVLLMAdapter();
  await adapter.init({
    baseURL: process.env.VLLM_URL || 'http://localhost:8000',
  });
  await adapter.start();

  console.log('=== Generate Embeddings ===');

  const embeddings = await adapter.embeddings('High-performance LLM inference with vLLM');

  if (isOk(embeddings)) {
    console.log(`Generated ${embeddings.value.length}-dimensional embedding`);
    console.log('First 5 values:', embeddings.value.slice(0, 5));
  }

  await adapter.stop();
}

main().catch(console.error);
