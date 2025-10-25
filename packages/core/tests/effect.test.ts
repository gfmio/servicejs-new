import { describe, test, expect } from 'bun:test';
import {
  emitTo,
  batch,
  none,
  executeEffect,
  executeEffects,
  type Effect,
} from '../src/effect';
import { createCapability } from '../src/capability';
import { createMessage, type MessageOf } from '../src/message';

type TestMessage = MessageOf<'test', { value: number }>;

describe('Effect', () => {
  describe('emitTo', () => {
    test('creates emit effect', () => {
      const cap = createCapability<TestMessage>(() => {});
      const msg = createMessage('test', { value: 42 });

      const effect = emitTo(cap, msg);

      expect(effect.type).toBe('emit');
      expect(effect.capability).toBe(cap);
      expect(effect.message).toBe(msg);
    });
  });

  describe('batch', () => {
    test('creates batch effect with multiple effects', () => {
      const cap = createCapability<TestMessage>(() => {});
      const effect1 = emitTo(cap, createMessage('test', { value: 1 }));
      const effect2 = emitTo(cap, createMessage('test', { value: 2 }));

      const batchEffect = batch([effect1, effect2]);

      expect(batchEffect.type).toBe('batch');
      expect(batchEffect.effects).toEqual([effect1, effect2]);
    });

    test('creates empty batch', () => {
      const batchEffect = batch([]);

      expect(batchEffect.type).toBe('batch');
      expect(batchEffect.effects).toEqual([]);
    });

    test('can nest batches', () => {
      const cap = createCapability<TestMessage>(() => {});
      const effect1 = emitTo(cap, createMessage('test', { value: 1 }));
      const effect2 = emitTo(cap, createMessage('test', { value: 2 }));
      const batch1 = batch([effect1, effect2]);
      const batch2 = batch([batch1, effect1]);

      expect(batch2.type).toBe('batch');
      expect(batch2.effects).toHaveLength(2);
      expect(batch2.effects[0]).toBe(batch1);
    });
  });

  describe('none', () => {
    test('creates none effect', () => {
      const noneEffect = none();

      expect(noneEffect.type).toBe('none');
    });
  });

  describe('executeEffect', () => {
    test('executes emit effect', () => {
      let received: TestMessage | undefined;
      const cap = createCapability<TestMessage>((msg) => {
        received = msg;
      });

      const effect = emitTo(cap, createMessage('test', { value: 42 }));
      executeEffect(effect);

      expect(received).toEqual({ type: 'test', value: 42 });
    });

    test('executes batch effect', () => {
      const received: number[] = [];
      const cap = createCapability<TestMessage>((msg) => {
        received.push(msg.value);
      });

      const effect = batch([
        emitTo(cap, createMessage('test', { value: 1 })),
        emitTo(cap, createMessage('test', { value: 2 })),
        emitTo(cap, createMessage('test', { value: 3 })),
      ]);

      executeEffect(effect);

      expect(received).toEqual([1, 2, 3]);
    });

    test('executes nested batches', () => {
      const received: number[] = [];
      const cap = createCapability<TestMessage>((msg) => {
        received.push(msg.value);
      });

      const effect = batch([
        emitTo(cap, createMessage('test', { value: 1 })),
        batch([
          emitTo(cap, createMessage('test', { value: 2 })),
          emitTo(cap, createMessage('test', { value: 3 })),
        ]),
        emitTo(cap, createMessage('test', { value: 4 })),
      ]);

      executeEffect(effect);

      expect(received).toEqual([1, 2, 3, 4]);
    });

    test('executes none effect without error', () => {
      const noneEffect = none();

      // Should not throw
      expect(() => executeEffect(noneEffect)).not.toThrow();
    });

    test('executes effects in order', () => {
      const order: string[] = [];
      const cap1 = createCapability<TestMessage>(() => {
        order.push('cap1');
      });
      const cap2 = createCapability<TestMessage>(() => {
        order.push('cap2');
      });
      const cap3 = createCapability<TestMessage>(() => {
        order.push('cap3');
      });

      const effect = batch([
        emitTo(cap1, createMessage('test', { value: 1 })),
        emitTo(cap2, createMessage('test', { value: 2 })),
        emitTo(cap3, createMessage('test', { value: 3 })),
      ]);

      executeEffect(effect);

      expect(order).toEqual(['cap1', 'cap2', 'cap3']);
    });
  });

  describe('executeEffects', () => {
    test('executes multiple effects', () => {
      const received: number[] = [];
      const cap = createCapability<TestMessage>((msg) => {
        received.push(msg.value);
      });

      const effects = [
        emitTo(cap, createMessage('test', { value: 1 })),
        emitTo(cap, createMessage('test', { value: 2 })),
        emitTo(cap, createMessage('test', { value: 3 })),
      ];

      executeEffects(effects);

      expect(received).toEqual([1, 2, 3]);
    });

    test('executes empty array without error', () => {
      expect(() => executeEffects([])).not.toThrow();
    });

    test('executes mixed effect types', () => {
      const received: number[] = [];
      const cap = createCapability<TestMessage>((msg) => {
        received.push(msg.value);
      });

      const effects: Effect[] = [
        emitTo(cap, createMessage('test', { value: 1 })),
        none(),
        batch([
          emitTo(cap, createMessage('test', { value: 2 })),
          emitTo(cap, createMessage('test', { value: 3 })),
        ]),
        none(),
        emitTo(cap, createMessage('test', { value: 4 })),
      ];

      executeEffects(effects);

      expect(received).toEqual([1, 2, 3, 4]);
    });
  });

  describe('Effect integration', () => {
    test('supports fire-and-forget messaging', () => {
      let count = 0;
      const cap = createCapability<TestMessage>(() => {
        count++;
      });

      const effect = emitTo(cap, createMessage('test', { value: 1 }));

      // Execute returns void (fire-and-forget)
      const result = executeEffect(effect);
      expect(result).toBeUndefined();
      expect(count).toBe(1);
    });

    test('supports complex effect composition', () => {
      const log: string[] = [];

      const logCap = createCapability<MessageOf<'log', { text: string }>>((msg) => {
        log.push(`LOG: ${msg.text}`);
      });

      const metricsCap = createCapability<MessageOf<'metric', { name: string }>>((msg) => {
        log.push(`METRIC: ${msg.name}`);
      });

      const effects = batch([
        emitTo(logCap, createMessage('log', { text: 'Starting process' })),
        batch([
          emitTo(metricsCap, createMessage('metric', { name: 'process.start' })),
          emitTo(logCap, createMessage('log', { text: 'Process running' })),
        ]),
        emitTo(logCap, createMessage('log', { text: 'Process complete' })),
        emitTo(metricsCap, createMessage('metric', { name: 'process.complete' })),
      ]);

      executeEffect(effects);

      expect(log).toEqual([
        'LOG: Starting process',
        'METRIC: process.start',
        'LOG: Process running',
        'LOG: Process complete',
        'METRIC: process.complete',
      ]);
    });
  });
});
