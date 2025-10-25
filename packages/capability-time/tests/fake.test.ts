import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createFakeTime, createNoOpTime } from '../src/fake.js';

describe('createFakeTime', () => {
  test('now() returns current time', () => {
    const time = createFakeTime(1000);
    expect(time.now()).toBe(1000);
  });

  test('time does not auto-advance', () => {
    const time = createFakeTime(0);
    const start = time.now();

    // Wait a bit (in real time)
    const wait = () => new Promise(resolve => setTimeout(resolve, 10));
    wait();

    expect(time.now()).toBe(start); // Still the same
  });

  test('setTimeout schedules callback', () => {
    const time = createFakeTime(0);
    let fired = false;

    const result = time.setTimeout(() => { fired = true; }, 1000);

    expect(isOk(result)).toBe(true);
    expect(fired).toBe(false);

    time.advance(999);
    expect(fired).toBe(false);

    time.advance(1);
    expect(fired).toBe(true);
  });

  test('setTimeout returns cancel function', () => {
    const time = createFakeTime(0);
    let fired = false;

    const result = time.setTimeout(() => { fired = true; }, 1000);

    if (isOk(result)) {
      const cancel = result.value;
      cancel();
    }

    time.advance(1000);
    expect(fired).toBe(false); // Cancelled, so never fired
  });

  test('setTimeout rejects negative delay', () => {
    const time = createFakeTime(0);

    const result = time.setTimeout(() => {}, -100);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_DELAY');
    }
  });

  test('setInterval fires repeatedly', () => {
    const time = createFakeTime(0);
    let count = 0;

    const result = time.setInterval(() => { count++; }, 100);

    expect(isOk(result)).toBe(true);

    time.advance(50);
    expect(count).toBe(0);

    time.advance(50);
    expect(count).toBe(1);

    time.advance(100);
    expect(count).toBe(2);

    time.advance(100);
    expect(count).toBe(3);
  });

  test('setInterval can be cancelled', () => {
    const time = createFakeTime(0);
    let count = 0;

    const result = time.setInterval(() => { count++; }, 100);

    if (isOk(result)) {
      time.advance(250); // Should fire twice
      expect(count).toBe(2);

      result.value(); // Cancel

      time.advance(1000); // Should not fire anymore
      expect(count).toBe(2);
    }
  });

  test('tick() fires all pending timers', () => {
    const time = createFakeTime(0);
    const fired: number[] = [];

    time.setTimeout(() => fired.push(1), 100);
    time.setTimeout(() => fired.push(2), 200);
    time.setTimeout(() => fired.push(3), 300);

    expect(fired).toEqual([]);

    time.tick();

    expect(fired).toEqual([1, 2, 3]);
    expect(time.now()).toBe(300); // Advanced to last timer
  });

  test('timers fire in chronological order', () => {
    const time = createFakeTime(0);
    const fired: number[] = [];

    time.setTimeout(() => fired.push(3), 300);
    time.setTimeout(() => fired.push(1), 100);
    time.setTimeout(() => fired.push(2), 200);

    time.tick();

    expect(fired).toEqual([1, 2, 3]); // Sorted by time
  });

  test('pendingTimers() returns count of active timers', () => {
    const time = createFakeTime(0);

    expect(time.pendingTimers()).toBe(0);

    const r1 = time.setTimeout(() => {}, 100);
    expect(time.pendingTimers()).toBe(1);

    const r2 = time.setTimeout(() => {}, 200);
    expect(time.pendingTimers()).toBe(2);

    // Cancel one
    if (isOk(r1)) r1.value();
    expect(time.pendingTimers()).toBe(1);

    // Fire one
    time.advance(200);
    expect(time.pendingTimers()).toBe(0);
  });

  test('reset() clears all timers and resets time', () => {
    const time = createFakeTime(1000);
    let fired = false;

    time.setTimeout(() => { fired = true; }, 100);
    time.advance(50);

    expect(time.now()).toBe(1050);

    time.reset();

    expect(time.now()).toBe(1000); // Back to start
    expect(time.pendingTimers()).toBe(0);

    time.advance(100);
    expect(fired).toBe(false); // Timer was cleared
  });
});

describe('createNoOpTime', () => {
  test('now() increments', () => {
    const time = createNoOpTime(1000);

    const t1 = time.now();
    const t2 = time.now();

    expect(t2).toBeGreaterThan(t1);
  });

  test('setTimeout returns ok but never fires', () => {
    const time = createNoOpTime(0);
    let fired = false;

    const result = time.setTimeout(() => { fired = true; }, 100);

    expect(isOk(result)).toBe(true);

    // Even after "waiting", callback never fires
    for (let i = 0; i < 1000; i++) {
      time.now();
    }

    expect(fired).toBe(false);
  });

  test('setInterval returns ok but never fires', () => {
    const time = createNoOpTime(0);
    let count = 0;

    const result = time.setInterval(() => { count++; }, 100);

    expect(isOk(result)).toBe(true);

    for (let i = 0; i < 1000; i++) {
      time.now();
    }

    expect(count).toBe(0);
  });

  test('rejects negative delays', () => {
    const time = createNoOpTime(0);

    expect(isErr(time.setTimeout(() => {}, -1))).toBe(true);
    expect(isErr(time.setInterval(() => {}, -1))).toBe(true);
  });
});
