import { describe, test, expect } from 'bun:test';
import {
  createControllableTime,
  createObservabilityWithTime,
  createTestScenario,
  waitControlled,
  measureWithTime,
} from '../src/deterministic-time.js';
import { isSpanStartEvent, isSpanEndEvent } from '../src/types.js';

describe('Deterministic Time', () => {
  describe('ControllableTime', () => {
    test('starts at initial time', () => {
      const time = createControllableTime(1000);
      expect(time.now()).toBe(1000);
    });

    test('advances time', () => {
      const time = createControllableTime(1000);
      time.advance(500);
      expect(time.now()).toBe(1500);
    });

    test('sets absolute time', () => {
      const time = createControllableTime(1000);
      time.setTime(2000);
      expect(time.now()).toBe(2000);
    });

    test('resets to initial time', () => {
      const time = createControllableTime(1000);
      time.advance(500);
      time.setTime(3000);
      time.reset();
      expect(time.now()).toBe(1000);
    });

    test('returns initial time', () => {
      const time = createControllableTime(12345);
      time.advance(1000);
      expect(time.getInitialTime()).toBe(12345);
    });

    test('defaults to 0 if no initial time provided', () => {
      const time = createControllableTime();
      expect(time.now()).toBe(0);
    });
  });

  describe('ObservabilityWithTime', () => {
    test('uses controllable time for events', () => {
      const time = createControllableTime(1000);
      const obs = createObservabilityWithTime(time);

      obs.log('info', 'Test message');

      const events = obs.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]?.timestamp).toBe(1000);
    });

    test('timestamps advance with time', () => {
      const time = createControllableTime(1000);
      const obs = createObservabilityWithTime(time);

      obs.log('info', 'Message 1');
      time.advance(500);
      obs.log('info', 'Message 2');

      const events = obs.getEvents();
      expect(events[0]?.timestamp).toBe(1000);
      expect(events[1]?.timestamp).toBe(1500);
    });

    test('withSpan uses controllable time', () => {
      const time = createControllableTime(1000);
      const obs = createObservabilityWithTime(time);

      obs.withSpan('test.operation', () => {
        time.advance(100);
      });

      const events = obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);
      const spanEnds = events.filter(isSpanEndEvent);

      expect(spanStarts).toHaveLength(1);
      expect(spanEnds).toHaveLength(1);

      expect(spanStarts[0]?.timestamp).toBe(1000);
      expect(spanEnds[0]?.timestamp).toBe(1100);
      expect(spanEnds[0]?.duration).toBe(100);
    });

    test('clear removes all events', () => {
      const time = createControllableTime(1000);
      const obs = createObservabilityWithTime(time);

      obs.log('info', 'Message');
      expect(obs.getEvents()).toHaveLength(1);

      obs.clear();
      expect(obs.getEvents()).toHaveLength(0);
    });
  });

  describe('TestScenario', () => {
    test('provides time and observability', () => {
      const scenario = createTestScenario(1000);

      expect(scenario.time.now()).toBe(1000);
      expect(scenario.obs.getEvents()).toHaveLength(0);
    });

    test('tick advances time and returns new time', () => {
      const scenario = createTestScenario(1000);

      const newTime = scenario.tick(500);
      expect(newTime).toBe(1500);
      expect(scenario.time.now()).toBe(1500);
    });

    test('reset resets both time and events', () => {
      const scenario = createTestScenario(1000);

      scenario.tick(500);
      scenario.obs.log('info', 'Message');

      scenario.reset();

      expect(scenario.time.now()).toBe(1000);
      expect(scenario.obs.getEvents()).toHaveLength(0);
    });

    test('can be used for deterministic testing', () => {
      const scenario = createTestScenario(0);

      scenario.obs.withSpan('operation', () => {
        scenario.tick(50);
        scenario.obs.counter('requests', 1);
        scenario.tick(50);
      });

      const events = scenario.obs.getEvents();

      // Verify deterministic timestamps
      const spanStart = events.find(isSpanStartEvent);
      const spanEnd = events.find(isSpanEndEvent);

      expect(spanStart?.timestamp).toBe(0);
      expect(spanEnd?.timestamp).toBe(100);
      expect(spanEnd?.duration).toBe(100);
    });
  });

  describe('waitControlled', () => {
    test('advances time without actually waiting', async () => {
      const time = createControllableTime(1000);
      const startRealTime = Date.now();

      await waitControlled(time, 1000);

      const endRealTime = Date.now();
      const realElapsed = endRealTime - startRealTime;

      // Should complete almost instantly (< 100ms)
      expect(realElapsed).toBeLessThan(100);

      // But controlled time advanced by 1000ms
      expect(time.now()).toBe(2000);
    });

    test('works with observability', async () => {
      const scenario = createTestScenario(1000);

      await scenario.obs.withSpan('async-op', async () => {
        await waitControlled(scenario.time, 100);
        scenario.obs.log('info', 'After wait');
      });

      const events = scenario.obs.getEvents();
      const spanEnd = events.find(isSpanEndEvent);

      expect(spanEnd?.duration).toBe(100);
    });
  });

  describe('measureWithTime', () => {
    test('measures duration using controlled time', async () => {
      const time = createControllableTime(1000);

      const { result, duration } = await measureWithTime(time, () => {
        time.advance(50);
        return 42;
      });

      expect(result).toBe(42);
      expect(duration).toBe(50);
    });

    test('works with async functions', async () => {
      const time = createControllableTime(1000);

      const { result, duration } = await measureWithTime(time, async () => {
        time.advance(100);
        await Promise.resolve();
        time.advance(50);
        return 'done';
      });

      expect(result).toBe('done');
      expect(duration).toBe(150);
    });

    test('captures duration even if function throws', async () => {
      const time = createControllableTime(1000);

      try {
        await measureWithTime(time, () => {
          time.advance(75);
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }

      // Time still advanced
      expect(time.now()).toBe(1075);
    });
  });

  describe('Integration Tests', () => {
    test('complex scenario with nested spans', () => {
      const scenario = createTestScenario(0);

      scenario.obs.withSpan('parent', () => {
        scenario.tick(10);

        scenario.obs.withSpan('child1', () => {
          scenario.tick(20);
        });

        scenario.tick(10);

        scenario.obs.withSpan('child2', () => {
          scenario.tick(30);
        });

        scenario.tick(10);
      });

      const events = scenario.obs.getEvents();
      const spanStarts = events.filter(isSpanStartEvent);

      // Find parent and children
      const parent = spanStarts.find((s) => s.operation === 'parent');
      const child1 = spanStarts.find((s) => s.operation === 'child1');
      const child2 = spanStarts.find((s) => s.operation === 'child2');

      expect(parent?.timestamp).toBe(0);
      expect(child1?.timestamp).toBe(10);
      expect(child2?.timestamp).toBe(40);

      const spanEnds = events.filter(isSpanEndEvent);
      const parentEnd = spanEnds.find((e) => e.spanId === parent?.spanId);
      const child1End = spanEnds.find((e) => e.spanId === child1?.spanId);
      const child2End = spanEnds.find((e) => e.spanId === child2?.spanId);

      expect(child1End?.duration).toBe(20);
      expect(child2End?.duration).toBe(30);
      expect(parentEnd?.duration).toBe(80);
    });

    test('metrics with controlled timestamps', () => {
      const scenario = createTestScenario(1000);

      for (let i = 0; i < 5; i++) {
        scenario.obs.counter('requests', 1);
        scenario.tick(100);
      }

      const events = scenario.obs.getEvents();
      const metrics = events.filter((e) => e.type === 'metric');

      expect(metrics).toHaveLength(5);
      expect(metrics[0]?.timestamp).toBe(1000);
      expect(metrics[1]?.timestamp).toBe(1100);
      expect(metrics[2]?.timestamp).toBe(1200);
      expect(metrics[3]?.timestamp).toBe(1300);
      expect(metrics[4]?.timestamp).toBe(1400);
    });
  });
});
