/**
 * Tests for rate limiter
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createCapability } from '@servicejs/core';
import { createRateLimiter } from '../src/rateLimiter.js';
import { isOk, isErr } from '@servicejs/result';

interface TestMessage {
  readonly type: 'test';
  readonly value: number;
}

describe('createRateLimiter', () => {
  test('creates rate limiter', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 10,
      windowMs: 1000,
    });

    expect(limiter.getAvailableTokens()).toBe(10);
  });

  test('allows messages under limit', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 5,
      windowMs: 1000,
    });

    // Send 5 messages (under limit)
    for (let i = 0; i < 5; i++) {
      const result = limiter.send({ type: 'test', value: i });
      expect(isOk(result)).toBe(true);
    }

    expect(messages).toHaveLength(5);
    expect(limiter.getAvailableTokens()).toBe(0);
  });

  test('blocks messages over limit with error strategy', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 3,
      windowMs: 1000,
      overflowStrategy: 'error',
    });

    // Send 3 messages (at limit)
    for (let i = 0; i < 3; i++) {
      limiter.send({ type: 'test', value: i });
    }

    // Next message should be rate limited
    const result = limiter.send({ type: 'test', value: 999 });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('RATE_LIMITED');
      expect(result.error.retryAfter).toBeGreaterThan(0);
    }
    expect(messages).toHaveLength(3);
  });

  test('drops messages over limit with drop strategy', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 2,
      windowMs: 1000,
      overflowStrategy: 'drop',
    });

    // Send 2 messages (at limit)
    limiter.send({ type: 'test', value: 1 });
    limiter.send({ type: 'test', value: 2 });

    // Next message should be dropped silently
    const result = limiter.send({ type: 'test', value: 999 });

    expect(isOk(result)).toBe(true);
    expect(messages).toHaveLength(2);
  });

  test('refills tokens after window', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 2,
      windowMs: 100,
      overflowStrategy: 'error',
    });

    // Use up tokens
    limiter.send({ type: 'test', value: 1 });
    limiter.send({ type: 'test', value: 2 });
    expect(limiter.getAvailableTokens()).toBe(0);

    // Try to send - should fail
    const result1 = limiter.send({ type: 'test', value: 999 });
    expect(isErr(result1)).toBe(true);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 110));

    // Should have new tokens
    expect(limiter.getAvailableTokens()).toBe(2);

    // Can send again
    const result2 = limiter.send({ type: 'test', value: 3 });
    expect(isOk(result2)).toBe(true);
  });

  test('getTimeUntilRefill returns correct value', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 1,
      windowMs: 1000,
    });

    limiter.send({ type: 'test', value: 1 });

    const timeUntil = limiter.getTimeUntilRefill();
    expect(timeUntil).toBeGreaterThan(900);
    expect(timeUntil).toBeLessThanOrEqual(1000);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const timeUntil2 = limiter.getTimeUntilRefill();
    expect(timeUntil2).toBeLessThanOrEqual(500);
  });

  test('manual reset refills tokens immediately', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 2,
      windowMs: 10000,
    });

    // Use up tokens
    limiter.send({ type: 'test', value: 1 });
    limiter.send({ type: 'test', value: 2 });
    expect(limiter.getAvailableTokens()).toBe(0);

    // Manual reset
    limiter.reset();

    expect(limiter.getAvailableTokens()).toBe(2);
  });

  test('calls onRateLimited callback', () => {
    const messages: TestMessage[] = [];
    const rateLimited: TestMessage[] = [];

    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 1,
      windowMs: 1000,
      overflowStrategy: 'error',
      onRateLimited: (msg) => rateLimited.push(msg as TestMessage),
    });

    limiter.send({ type: 'test', value: 1 });
    limiter.send({ type: 'test', value: 2 });

    expect(rateLimited).toHaveLength(1);
    expect(rateLimited[0]?.value).toBe(2);
  });

  test('restores token on send failure', () => {
    let shouldFail = false;
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => {
      if (shouldFail) {
        throw new Error('Send failed');
      }
      messages.push(msg);
    });

    const limiter = createRateLimiter(capability, {
      maxMessages: 2,
      windowMs: 1000,
    });

    // Successful send
    limiter.send({ type: 'test', value: 1 });
    expect(limiter.getAvailableTokens()).toBe(1);

    // Failed send - token should be restored
    shouldFail = true;
    const result = limiter.send({ type: 'test', value: 2 });

    expect(isErr(result)).toBe(true);
    expect(limiter.getAvailableTokens()).toBe(1);
  });

  test('handles high throughput correctly', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 10,
      windowMs: 1000,
      overflowStrategy: 'drop',
    });

    // Send 20 messages rapidly
    for (let i = 0; i < 20; i++) {
      limiter.send({ type: 'test', value: i });
    }

    // Only 10 should have been sent
    expect(messages).toHaveLength(10);
  });

  test('getAvailableTokens never goes negative', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const limiter = createRateLimiter(capability, {
      maxMessages: 2,
      windowMs: 1000,
      overflowStrategy: 'drop',
    });

    limiter.send({ type: 'test', value: 1 });
    limiter.send({ type: 'test', value: 2 });
    limiter.send({ type: 'test', value: 3 });
    limiter.send({ type: 'test', value: 4 });

    expect(limiter.getAvailableTokens()).toBe(0);
    expect(limiter.getAvailableTokens()).toBeGreaterThanOrEqual(0);
  });
});
