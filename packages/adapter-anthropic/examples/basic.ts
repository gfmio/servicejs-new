import { createAnthropicAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAnthropicAdapter();
  
  await adapter.init({
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
    defaultModel: 'claude-3-5-sonnet-20241022',
    defaultMaxTokens: 1024,
  });
  
  await adapter.start();
  
  const result = await adapter.createMessage([
    { role: 'user', content: 'What are the three laws of robotics?' },
  ]);
  
  if (isOk(result)) {
    console.log('Response:', result.value.content[0]);
    console.log('Tokens:', result.value.usage);
  }
  
  await adapter.stop();
}

main().catch(console.error);
