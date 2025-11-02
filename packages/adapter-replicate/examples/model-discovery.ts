/**
 * Replicate model discovery example
 */

import { createReplicateAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createReplicateAdapter();
  await adapter.init({ apiToken: process.env.REPLICATE_API_TOKEN || 'token' });
  await adapter.start();

  const models = await adapter.listModels();

  if (isOk(models)) {
    models.value.forEach(model => {
      console.log(`${model.owner}/${model.name}: ${model.run_count} runs`);
    });
  }

  const output = await adapter.runModel('owner', 'model', { prompt: 'test' });
  if (isOk(output)) {
    console.log('Output:', output.value);
  }

  await adapter.stop();
}

main().catch(console.error);
