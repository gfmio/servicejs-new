/**
 * Tests for Hugging Face adapter
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { createHuggingFaceAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

describe('HuggingFaceAdapter', () => {
  let adapter: ReturnType<typeof createHuggingFaceAdapter>;

  beforeEach(() => {
    adapter = createHuggingFaceAdapter();
  });

  test('should initialize and start', async () => {
    const initResult = await adapter.init({ apiToken: 'test-token' });
    expect(isOk(initResult)).toBe(true);

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);

    const healthResult = await adapter.health();
    expect(isOk(healthResult)).toBe(true);
    if (isOk(healthResult)) {
      expect(healthResult.value).toBe(true);
    }
  });

  test('should generate text', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.textGeneration('Once upon a time');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].generatedText).toContain('Mock generated text');
    }
  });

  test('should generate multiple text sequences', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.textGeneration('Test prompt', { numReturnSequences: 3 });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(3);
    }
  });

  test('should classify text', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.textClassification('I love this product!');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].label).toBeDefined();
      expect(result.value[0].score).toBeGreaterThanOrEqual(0);
      expect(result.value[0].score).toBeLessThanOrEqual(1);
    }
  });

  test('should answer questions', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.questionAnswering({
      question: 'What is the capital?',
      context: 'The capital of France is Paris.',
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.answer).toBeDefined();
      expect(result.value.score).toBeGreaterThan(0);
      expect(result.value.start).toBeGreaterThanOrEqual(0);
      expect(result.value.end).toBeGreaterThan(result.value.start);
    }
  });

  test('should summarize text', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.summarization('Long article text here...');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain('Mock summary');
    }
  });

  test('should translate text', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.translation('Hello world', 'fr');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain('Mock translation');
      expect(result.value).toContain('fr');
    }
  });

  test('should generate image from text', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.textToImage('A beautiful sunset');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value instanceof Blob).toBe(true);
      expect(result.value.type).toBe('image/png');
    }
  });

  test('should classify images', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const mockImage = new Blob(['mock-image'], { type: 'image/jpeg' });
    const result = await adapter.imageClassification(mockImage);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].label).toBeDefined();
    }
  });

  test('should extract features (embeddings)', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.featureExtraction('Test text');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toHaveLength(768);
    }
  });

  test('should extract features for multiple inputs', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.featureExtraction(['Text 1', 'Text 2']);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toHaveLength(768);
      expect(result.value[1]).toHaveLength(768);
    }
  });

  test('should search models', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.searchModels();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBeGreaterThan(0);
      expect(result.value[0].modelId).toBeDefined();
      expect(result.value[0].task).toBeDefined();
    }
  });

  test('should search models by task', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.searchModels({ task: 'text-generation' });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      result.value.forEach(model => {
        expect(model.task).toBe('text-generation');
      });
    }
  });

  test('should get specific model', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.getModel('gpt2');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.modelId).toBe('gpt2');
      expect(result.value.task).toBe('text-generation');
    }
  });

  test('should return error for non-existent model', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.getModel('non-existent-model');

    expect(isOk(result)).toBe(false);
  });

  test('should perform generic inference', async () => {
    await adapter.init({ apiToken: 'test-token' });
    const result = await adapter.inference('custom-model', 'test input');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.modelId).toBe('custom-model');
      expect(result.value.output).toBeDefined();
    }
  });
});
