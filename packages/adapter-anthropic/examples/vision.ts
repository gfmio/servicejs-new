import { createAnthropicAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAnthropicAdapter();
  await adapter.init({ apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key' });
  await adapter.start();
  
  const result = await adapter.createMessage([
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image:' },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: 'base64-image-data-here',
          },
        },
      ],
    },
  ]);
  
  if (isOk(result)) {
    console.log('Vision response:', result.value.content[0]);
  }
}

main().catch(console.error);
