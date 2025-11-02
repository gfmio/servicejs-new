import { createAnthropicAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAnthropicAdapter();
  await adapter.init({ apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key' });
  await adapter.start();
  
  const result = await adapter.createMessageStream([
    { role: 'user', content: 'Explain streaming in simple terms' },
  ]);
  
  if (isOk(result)) {
    const stream = result.value;
    stream.on('data', (event) => {
      if (event.type === 'content_block_delta') {
        process.stdout.write(event.delta.text);
      }
    });
    await new Promise(resolve => stream.on('end', resolve));
  }
}

main().catch(console.error);
