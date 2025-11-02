/**
 * Cloudflare AI translation example
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

  console.log('=== Translation ===');

  const translated = await adapter.translation('Hello world', 'en', 'fr');

  if (isOk(translated)) {
    console.log('Translated:', translated.value);
  }

  console.log('\n=== Summarization ===');

  const summary = await adapter.summarization(
    'This is a long article about artificial intelligence...'
  );

  if (isOk(summary)) {
    console.log('Summary:', summary.value);
  }

  await adapter.stop();
}

main().catch(console.error);
