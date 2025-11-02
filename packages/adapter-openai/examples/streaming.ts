/**
 * OpenAI streaming chat completion example
 *
 * This example demonstrates:
 * - Streaming chat completions
 * - Processing stream chunks in real-time
 * - Cancelling streams
 * - Building complete responses from chunks
 */

import { createOpenAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOpenAIAdapter();

  await adapter.init({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
    defaultModel: 'gpt-4',
  });

  await adapter.start();

  // Basic streaming
  console.log('=== Streaming Chat Completion ===\n');

  const streamResult = await adapter.createChatCompletionStream([
    {
      role: 'system',
      content: 'You are a helpful assistant who writes concise responses.',
    },
    {
      role: 'user',
      content: 'Explain what streaming is in API responses.',
    },
  ]);

  if (isOk(streamResult)) {
    const stream = streamResult.value;
    let fullResponse = '';

    stream.on('data', (chunk) => {
      const content = chunk.choices[0].delta.content;
      if (content) {
        process.stdout.write(content);
        fullResponse += content;
      }
    });

    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        console.log('\n\nStream complete!');
        console.log(`Full response length: ${fullResponse.length} characters\n`);
        resolve();
      });
    });
  }

  // Streaming with different models
  console.log('=== Streaming with GPT-3.5-Turbo ===\n');

  const turboStreamResult = await adapter.createChatCompletionStream(
    [
      {
        role: 'user',
        content: 'Write a haiku about programming.',
      },
    ],
    {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
    }
  );

  if (isOk(turboStreamResult)) {
    const stream = turboStreamResult.value;

    stream.on('data', (chunk) => {
      const content = chunk.choices[0].delta.content;
      if (content) {
        process.stdout.write(content);
      }
    });

    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        console.log('\n\n');
        resolve();
      });
    });
  }

  // Cancelling a stream
  console.log('=== Cancelling Stream ===\n');

  const cancelStreamResult = await adapter.createChatCompletionStream([
    {
      role: 'user',
      content: 'Tell me a very long story about a dragon and a knight.',
    },
  ]);

  if (isOk(cancelStreamResult)) {
    const stream = cancelStreamResult.value;
    let chunkCount = 0;

    stream.on('data', (chunk) => {
      chunkCount++;
      const content = chunk.choices[0].delta.content;
      if (content) {
        process.stdout.write(content);
      }

      // Cancel after 5 chunks
      if (chunkCount === 5) {
        console.log('\n\n[Cancelling stream...]');
        stream.cancel();
      }
    });

    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        console.log(`Stream ended after ${chunkCount} chunks\n`);
        resolve();
      });
    });
  }

  // Streaming with metadata tracking
  console.log('=== Streaming with Metadata ===\n');

  const metadataStreamResult = await adapter.createChatCompletionStream([
    {
      role: 'user',
      content: 'What are the benefits of TypeScript?',
    },
  ]);

  if (isOk(metadataStreamResult)) {
    const stream = metadataStreamResult.value;
    const chunks: any[] = [];

    stream.on('data', (chunk) => {
      chunks.push(chunk);
      const content = chunk.choices[0].delta.content;
      if (content) {
        process.stdout.write(content);
      }
    });

    await new Promise<void>((resolve) => {
      stream.on('end', () => {
        console.log('\n\n--- Stream Metadata ---');
        console.log(`Total chunks: ${chunks.length}`);
        console.log(`Stream ID: ${chunks[0]?.id}`);
        console.log(`Model: ${chunks[0]?.model}`);
        const lastChunk = chunks[chunks.length - 1];
        console.log(`Finish reason: ${lastChunk?.choices[0]?.finishReason}\n`);
        resolve();
      });
    });
  }

  // Error handling
  console.log('=== Error Handling ===\n');

  const errorStreamResult = await adapter.createChatCompletionStream([
    {
      role: 'user',
      content: 'This is a test message.',
    },
  ]);

  if (isOk(errorStreamResult)) {
    const stream = errorStreamResult.value;

    stream.on('data', (chunk) => {
      // Process chunks normally
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error.message);
    });

    stream.on('end', () => {
      console.log('Stream processing complete\n');
    });

    await new Promise<void>((resolve) => {
      stream.on('end', resolve);
    });
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
