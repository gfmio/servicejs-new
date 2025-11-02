import { createHuggingFaceAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createHuggingFaceAdapter();
  await adapter.init({ apiToken: process.env.HF_TOKEN || 'your-token' });
  await adapter.start();

  // Search all models
  const allResult = await adapter.searchModels({ limit: 5 });
  if (isOk(allResult)) {
    console.log('Top models:', allResult.value.map(m => m.modelId));
  }

  // Search by task
  const genResult = await adapter.searchModels({ task: 'text-generation' });
  if (isOk(genResult)) {
    console.log('Text generation models:', genResult.value.length);
  }

  // Get specific model
  const modelResult = await adapter.getModel('gpt2');
  if (isOk(modelResult)) {
    console.log('Model info:', modelResult.value);
  }

  // Feature extraction (embeddings)
  const embResult = await adapter.featureExtraction(['Hello', 'World']);
  if (isOk(embResult)) {
    console.log('Embeddings dimensions:', embResult.value[0].length);
  }
}

main().catch(console.error);
