/**
 * OpenAI basic usage example
 *
 * This example demonstrates:
 * - Initializing the OpenAI adapter
 * - Creating chat completions
 * - Generating embeddings
 * - Listing available models
 */

import { createOpenAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOpenAIAdapter();

  // Initialize adapter with API key
  await adapter.init({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    defaultModel: 'gpt-4',
  });

  await adapter.start();

  console.log('OpenAI Adapter initialized\n');

  // Simple chat completion
  console.log('=== Chat Completion ===\n');

  const chatResult = await adapter.createChatCompletion([
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What are the three laws of robotics?' },
  ]);

  if (isOk(chatResult)) {
    const completion = chatResult.value;
    console.log(`Model: ${completion.model}`);
    console.log(`Response: ${completion.choices[0].message.content}`);
    console.log(`Tokens used: ${completion.usage.totalTokens}\n`);
  }

  // Chat with custom parameters
  console.log('=== Chat with Temperature ===\n');

  const creativeChatResult = await adapter.createChatCompletion(
    [
      {
        role: 'user',
        content: 'Write a creative one-sentence story about a robot.',
      },
    ],
    {
      model: 'gpt-3.5-turbo',
      temperature: 0.9,
      maxTokens: 50,
    }
  );

  if (isOk(creativeChatResult)) {
    console.log(`Response: ${creativeChatResult.value.choices[0].message.content}\n`);
  }

  // Generate embeddings
  console.log('=== Embeddings ===\n');

  const embeddingResult = await adapter.createEmbedding([
    'The quick brown fox jumps over the lazy dog',
    'Machine learning is fascinating',
    'OpenAI creates powerful AI models',
  ]);

  if (isOk(embeddingResult)) {
    const response = embeddingResult.value;
    console.log(`Model: ${response.model}`);
    console.log(`Embeddings generated: ${response.data.length}`);
    console.log(`Embedding dimensions: ${response.data[0].embedding.length}`);
    console.log(`Tokens used: ${response.usage.totalTokens}\n`);
  }

  // List available models
  console.log('=== Available Models ===\n');

  const modelsResult = await adapter.listModels();

  if (isOk(modelsResult)) {
    const models = modelsResult.value;
    console.log(`Total models: ${models.length}\n`);

    console.log('Chat models:');
    models
      .filter((m) => m.id.includes('gpt'))
      .forEach((model) => {
        console.log(`  - ${model.id} (${model.ownedBy})`);
      });

    console.log('\nEmbedding models:');
    models
      .filter((m) => m.id.includes('embedding'))
      .forEach((model) => {
        console.log(`  - ${model.id} (${model.ownedBy})`);
      });
  }

  // Get specific model info
  console.log('\n=== Model Information ===\n');

  const modelResult = await adapter.getModel('gpt-4');

  if (isOk(modelResult)) {
    const model = modelResult.value;
    console.log(`ID: ${model.id}`);
    console.log(`Owner: ${model.ownedBy}`);
    console.log(`Created: ${new Date(model.created * 1000).toISOString()}`);
  }

  // Health check
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log(`\nAdapter health: ${healthResult.value ? 'OK' : 'NOT OK'}`);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
