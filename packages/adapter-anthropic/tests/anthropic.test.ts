/**
 * Tests for Anthropic adapter
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { createAnthropicAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('AnthropicAdapter', () => {
  let adapter: ReturnType<typeof createAnthropicAdapter>;

  beforeEach(() => {
    adapter = createAnthropicAdapter();
  });

  test('should initialize with config', async () => {
    const result = await adapter.init({
      apiKey: 'test-api-key',
      defaultModel: 'claude-3-5-sonnet-20241022',
      defaultMaxTokens: 2048,
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

  test('should create message completion', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
      defaultModel: 'claude-3-5-sonnet-20241022',
    });

    const result = await adapter.createMessage([
      { role: 'user', content: 'Hello, how are you?' },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const message = result.value;
      expect(message.id).toMatch(/^msg_/);
      expect(message.type).toBe('message');
      expect(message.role).toBe('assistant');
      expect(message.model).toBe('claude-3-5-sonnet-20241022');
      expect(message.content).toHaveLength(1);
      expect(message.content[0].type).toBe('text');
      expect((message.content[0] as any).text).toContain('Mock Claude response');
      expect(message.stopReason).toBe('end_turn');
      expect(message.usage.inputTokens).toBeGreaterThan(0);
      expect(message.usage.outputTokens).toBe(25);
    }
  });

  test('should create streaming message completion', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
      defaultModel: 'claude-3-opus-20240229',
    });

    const result = await adapter.createMessageStream([
      { role: 'user', content: 'Tell me a story' },
    ]);

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const stream = result.value;
      const events: any[] = [];

      return new Promise<void>((resolve) => {
        stream.on('data', (event) => {
          events.push(event);
        });

        stream.on('end', () => {
          expect(events.length).toBeGreaterThan(0);

          // Check for message_start event
          const messageStart = events.find((e) => e.type === 'message_start');
          expect(messageStart).toBeDefined();
          expect(messageStart.message.role).toBe('assistant');

          // Check for content_block_delta events
          const deltas = events.filter((e) => e.type === 'content_block_delta');
          expect(deltas.length).toBeGreaterThan(0);

          // Check for message_stop event
          const messageStop = events.find((e) => e.type === 'message_stop');
          expect(messageStop).toBeDefined();

          resolve();
        });
      });
    }
  });

  test('should handle multi-turn conversations', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createMessage([
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: '2+2 equals 4' },
      { role: 'user', content: 'What about 3+3?' },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const message = result.value;
      expect(message.role).toBe('assistant');
      expect(message.content[0].type).toBe('text');
    }
  });

  test('should handle content blocks', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

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
              data: 'base64-encoded-data-here',
            },
          },
        ],
      },
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const message = result.value;
      expect(message.content[0].type).toBe('text');
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

      const sonnet = models.find((m) => m.id === 'claude-3-5-sonnet-20241022');
      expect(sonnet).toBeDefined();
      expect(sonnet?.displayName).toBe('Claude 3.5 Sonnet');
      expect(sonnet?.maxTokens).toBe(8192);

      const opus = models.find((m) => m.id === 'claude-3-opus-20240229');
      expect(opus).toBeDefined();
    }
  });

  test('should get specific model', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.getModel('claude-3-haiku-20240307');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      const model = result.value;
      expect(model.id).toBe('claude-3-haiku-20240307');
      expect(model.displayName).toBe('Claude 3 Haiku');
      expect(model.maxTokens).toBe(4096);
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

  test('should handle custom options', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createMessage(
      [{ role: 'user', content: 'Write a haiku' }],
      {
        model: 'claude-3-haiku-20240307',
        maxTokens: 100,
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        system: 'You are a poetry expert',
      }
    );

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.model).toBe('claude-3-haiku-20240307');
    }
  });

  test('should cancel streaming', async () => {
    await adapter.init({
      apiKey: 'test-api-key',
    });

    const result = await adapter.createMessageStream([
      { role: 'user', content: 'Tell me a very long story' },
    ]);

    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const stream = result.value;
      let eventCount = 0;

      return new Promise<void>((resolve) => {
        stream.on('data', () => {
          eventCount++;
          if (eventCount === 3) {
            stream.cancel();
          }
        });

        stream.on('end', () => {
          expect(eventCount).toBeGreaterThan(0);
          resolve();
        });
      });
    }
  });
});
