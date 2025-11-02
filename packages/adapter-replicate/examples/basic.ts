/**
 * Replicate basic usage example
 */

import { createReplicateAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createReplicateAdapter();

  await adapter.init({
    apiToken: process.env.REPLICATE_API_TOKEN || 'your-token',
  });

  await adapter.start();

  console.log('=== Creating Prediction ===');

  const prediction = await adapter.createPrediction(
    'stability-ai/stable-diffusion:version',
    { prompt: 'A beautiful sunset' }
  );

  if (isOk(prediction)) {
    console.log('Prediction ID:', prediction.value.id);
    console.log('Status:', prediction.value.status);
    console.log('Output:', prediction.value.output);
  }

  const model = await adapter.getModel('stability-ai', 'stable-diffusion');
  if (isOk(model)) {
    console.log('Model runs:', model.value.run_count);
  }

  await adapter.stop();
}

main().catch(console.error);
