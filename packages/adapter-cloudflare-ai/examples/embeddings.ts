/**
 * Cloudflare AI embeddings example
 */

import { createCloudflareAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createCloudflareAIAdapter();
  await adapter.init({
    accountId: process.env.CF_ACCOUNT_ID || 'account-id',
    apiToken: process.env.CF_API_TOKEN || 'token',
  });
  await adapter.start();

  console.log('=== Generate Embeddings ===');

  const embeddings = await adapter.embeddings('Cloudflare Workers AI');

  if (isOk(embeddings)) {
    console.log(`Generated ${embeddings.value.length}-dimensional embedding`);
    console.log('First 5 values:', embeddings.value.slice(0, 5));
  }

  await adapter.stop();
}

main().catch(console.error);
