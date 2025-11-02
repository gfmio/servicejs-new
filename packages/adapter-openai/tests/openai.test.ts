/**
 * Tests for OpenAI adapter
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { createOpenAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('OpenAIAdapter', () => {
  let adapter: ReturnType<typeof createOpenAIAdapter>;

  beforeEach(() => {
    adapter = createOpenAIAdapter();
  });

  test('should initialize with config', async () => {
    const result = await adapter.init({
      apiKey: 'test-api-key',
      organization: 'test-org',
      defaultModel: 'gpt-4',
    });

    expect(isOk(result)).toBe(true);
  });

  test('should start and stop adapter', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const healthResult = await adapter.health();
    expect(isOk(healthResult)).toBe(true);
    if (isOk(healthResult)) {
      expect(healthResult.value).toBe(true);
    }

    const stopResult = await adapter.stop();
    expect(isOk(stopResult)).toBe(true);
  });

  test('should create chat completion', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
      defaultModel: 'gpt-4',
    });

    const result = await adapter.createChatCompletion([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const completion = result.value;
      expect(completion.id).toMatch(/^chatcmpl-/);
      expect(completion.object).toBe('chat.completion');
      expect(completion.model).toBe('gpt-4');
      expect(completion.choices).toHaveLength(1);
      expect(completion.choices[0].message.role).toBe('assistant');
      expect(completion.choices[0].message.content).toContain('Mock response');
      expect(completion.usage.promptTokens).toBeGreaterThan(0);
      expect(completion.usage.completionTokens).toBe(20);
      expect(completion.usage.totalTokens).toBeGreaterThan(20);
    }
  });

  test('should create streaming chat completion', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
      defaultModel: 'gpt-3.5-turbo',
    });

    const result = await adapter.createChatCompletionStream([
      { role: 'user', content: 'Tell me a story' },
    ]);

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const stream = result.value;
      const chunks: any[] = [];

      return new Promise<void>((resolve) => {
        stream.on('data', (chunk) => {
          chunks.push(chunk);
          expect(chunk.id).toMatch(/^chatcmpl-/);
          expect(chunk.object).toBe('chat.completion.chunk');
          expect(chunk.choices[0].delta.content).toBeDefined();
        });

        stream.on('end', () => {
          expect(chunks.length).toBeGreaterThan(0);
          resolve();
        });
      });
    }
  });

  test('should create embeddings for single input', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createEmbedding('The quick brown fox jumps over the lazy dog');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const response = result.value;
      expect(response.object).toBe('list');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].embedding).toHaveLength(1536);
      expect(response.model).toBe('text-embedding-ada-002');
      expect(response.usage.promptTokens).toBeGreaterThan(0);
    }
  });

  test('should create embeddings for multiple inputs', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createEmbedding(
      ['First text', 'Second text', 'Third text'],
      'text-embedding-ada-002'
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const response = result.value;
      expect(response.data).toHaveLength(3);
      response.data.forEach((embedding, index) => {
        expect(embedding.index).toBe(index);
        expect(embedding.embedding).toHaveLength(1536);
        expect(embedding.object).toBe('embedding');
      });
    }
  });

  test('should list available models', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.listModels();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const models = result.value;
      expect(models.length).toBeGreaterThan(0);

      const gpt4 = models.find((m) => m.id === 'gpt-4');
      expect(gpt4).toBeDefined();
      expect(gpt4?.object).toBe('model');
      expect(gpt4?.ownedBy).toBe('openai');

      const embedding = models.find((m) => m.id === 'text-embedding-ada-002');
      expect(embedding).toBeDefined();
    }
  });

  test('should get specific model', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.getModel('gpt-4');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const model = result.value;
      expect(model.id).toBe('gpt-4');
      expect(model.object).toBe('model');
      expect(model.ownedBy).toBe('openai');
    }
  });

  test('should return error for non-existent model', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.getModel('non-existent-model');

    expect(isOk(result)).toBe(false);
    if (!isOk(result)) {
      expect(result.error.message).toContain('Model not found');
    }
  });

  test('should handle chat completion with custom options', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createChatCompletion(
      [{ role: 'user', content: 'What is 2+2?' }],
      {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
      }
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.model).toBe('gpt-3.5-turbo');
    }
  });

  test('should cancel streaming completion', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createChatCompletionStream([
      { role: 'user', content: 'Tell me a long story' },
    ]);

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const stream = result.value;
      let chunkCount = 0;

      return new Promise<void>((resolve) => {
        stream.on('data', () => {
          chunkCount++;
          if (chunkCount === 2) {
            stream.cancel();
          }
        });

        stream.on('end', () => {
          expect(chunkCount).toBeGreaterThan(0);
          resolve();
        });
      });
    }
  });
});
