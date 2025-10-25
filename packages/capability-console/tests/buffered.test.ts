import { describe, test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createBufferedConsole, createNoOpConsole } from '../src/buffered.js';

describe('createBufferedConsole', () => {
  test('stores log entries', () => {
    const console = createBufferedConsole();
    console.log('test message', 42);
    const logs = console.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('log');
    expect(logs[0].message).toBe('test message');
    expect(logs[0].args).toEqual([42]);
  });

  test('clear empties buffer', () => {
    const console = createBufferedConsole();
    console.log('test');
    console.clear();
    expect(console.getLogs().length).toBe(0);
  });
});

describe('createNoOpConsole', () => {
  test('all methods return ok', () => {
    const console = createNoOpConsole();
    expect(isOk(console.log('test'))).toBe(true);
    expect(isOk(console.info('test'))).toBe(true);
    expect(isOk(console.warn('test'))).toBe(true);
  });
});
