/**
 * Cloudflare AI basic usage example
 */

import { createCloudflareAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createCloudflareAIAdapter();

  await adapter.init({
    accountId: process.env.CF_ACCOUNT_ID || 'your-account-id',
    apiToken: process.env.CF_API_TOKEN || 'your-api-token',
  });

  await adapter.start();

  console.log('=== Text Generation ===');

  const response = await adapter.textGeneration(
    '@cf/meta/llama-2-7b-chat-int8',
    'Explain edge computing'
  );

  if (isOk(response)) {
    console.log('Response:', response.value);
  }

  console.log('\n=== Text Classification ===');

  const sentiment = await adapter.textClassification('I love Cloudflare Workers!');

  if (isOk(sentiment)) {
    console.log('Sentiment:', sentiment.value);
  }

  await adapter.stop();
}

main().catch(console.error);
