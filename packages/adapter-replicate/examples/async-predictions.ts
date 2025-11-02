/**
 * Replicate async predictions example
 */

import { createReplicateAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createReplicateAdapter();
  await adapter.init({ apiToken: process.env.REPLICATE_API_TOKEN || 'token' });
  await adapter.start();

  const prediction = await adapter.createPrediction('model:v1', { prompt: 'test' });

  if (isOk(prediction)) {
    console.log('Created:', prediction.value.id);

    // Poll for status
    const check = await adapter.getPrediction(prediction.value.id);
    if (isOk(check)) {
      console.log('Status:', check.value.status);
    }
  }

  await adapter.stop();
}

main().catch(console.error);
