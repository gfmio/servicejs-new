/**
 * Tests for circuit breaker
 */

import { describe, test, expect } from 'bun:test';
import { createCapability } from '@servicejs/core';
import { createCircuitBreaker } from '../src/circuitBreaker.js';
import { isOk, isErr } from '@servicejs/result';

interface TestMessage {
  readonly type: 'test';
  readonly shouldFail?: boolean;
}

describe('createCircuitBreaker', () => {
  test('creates circuit breaker in closed state', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const breaker = createCircuitBreaker(capability);

    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailureCount()).toBe(0);
  });

  test('sends message successfully when closed', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const breaker = createCircuitBreaker(capability);

    const result = breaker.send({ type: 'test' });

    expect(isOk(result)).toBe(true);
    expect(messages).toHaveLength(1);
  });

  test('opens circuit after failure threshold', () => {
    const capability = createCapability<TestMessage>(() => {
      throw new Error('Send failed');
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 3,
    });

    // First failure
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailureCount()).toBe(1);

    // Second failure
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailureCount()).toBe(2);

    // Third failure - circuit opens
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('open');
    expect(breaker.getFailureCount()).toBe(3);
  });

  test('fails fast when circuit is open', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => {
      if (msg.shouldFail) {
        throw new Error('Send failed');
      }
      messages.push(msg);
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 2,
    });

    // Trigger failures to open circuit
    breaker.send({ type: 'test', shouldFail: true });
    breaker.send({ type: 'test', shouldFail: true });

    expect(breaker.getState()).toBe('open');

    // Attempt to send - should fail fast
    const result = breaker.send({ type: 'test' });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CIRCUIT_OPEN');
    }
    expect(messages).toHaveLength(0);
  });

  test('transitions to half-open after reset timeout', async () => {
    const capability = createCapability<TestMessage>(() => {
      throw new Error('Send failed');
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 1,
      resetTimeout: 50,
    });

    // Open the circuit
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('open');

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(breaker.getState()).toBe('half-open');
  });

  test('closes circuit on success in half-open state', async () => {
    let failCount = 0;
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => {
      if (failCount < 2) {
        failCount++;
        throw new Error('Send failed');
      }
      messages.push(msg);
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 2,
      resetTimeout: 50,
    });

    // Open the circuit
    breaker.send({ type: 'test' });
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('open');

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(breaker.getState()).toBe('half-open');

    // Success in half-open closes the circuit
    const result = breaker.send({ type: 'test' });

    expect(isOk(result)).toBe(true);
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailureCount()).toBe(0);
  });

  test('reopens circuit on failure in half-open state', async () => {
    const capability = createCapability<TestMessage>(() => {
      throw new Error('Send failed');
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 1,
      resetTimeout: 50,
    });

    // Open the circuit
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('open');

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(breaker.getState()).toBe('half-open');

    // Failure in half-open reopens the circuit
    breaker.send({ type: 'test' });

    expect(breaker.getState()).toBe('open');
  });

  test('manual reset closes circuit', () => {
    const capability = createCapability<TestMessage>(() => {
      throw new Error('Send failed');
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 1,
    });

    // Open the circuit
    breaker.send({ type: 'test' });
    expect(breaker.getState()).toBe('open');

    // Manual reset
    breaker.reset();

    expect(breaker.getState()).toBe('closed');
    expect(breaker.getFailureCount()).toBe(0);
  });

  test('calls onStateChange callback', () => {
    const capability = createCapability<TestMessage>(() => {
      throw new Error('Send failed');
    });

    const stateChanges: Array<[string, string]> = [];

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 1,
      onStateChange: (old, newState) => {
        stateChanges.push([old, newState]);
      },
    });

    // Open the circuit
    breaker.send({ type: 'test' });

    expect(stateChanges).toHaveLength(1);
    expect(stateChanges[0]).toEqual(['closed', 'open']);
  });

  test('custom shouldFail predicate', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const breaker = createCircuitBreaker(
      capability,
      (msg) => msg.shouldFail === true,
      { failureThreshold: 1 }
    );

    // Send succeeds but marked as failure
    const result = breaker.send({ type: 'test', shouldFail: true });

    expect(isErr(result)).toBe(true);
    expect(breaker.getState()).toBe('open');
  });

  test('resets failure count on success', () => {
    let shouldFail = true;
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => {
      if (shouldFail) {
        throw new Error('Send failed');
      }
      messages.push(msg);
    });

    const breaker = createCircuitBreaker(capability, undefined, {
      failureThreshold: 3,
    });

    // First failure
    breaker.send({ type: 'test' });
    expect(breaker.getFailureCount()).toBe(1);

    // Success resets count
    shouldFail = false;
    breaker.send({ type: 'test' });
    expect(breaker.getFailureCount()).toBe(0);
  });
});
