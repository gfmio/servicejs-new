import { describe, test, expect } from 'bun:test';
import {
  createCapability,
  mapCapability,
  filterCapability,
  composeCapabilities,
  interceptCapability,
  nullCapability,
  type Capability,
} from '../src/capability';
import { createMessage, type MessageOf } from '../src/message';

type TestMessage = MessageOf<'test', { value: number }>;
type AltMessage = MessageOf<'alt', { data: string }>;

describe('Capability', () => {
  describe('createCapability', () => {
    test('creates working capability', () => {
      let received: TestMessage | undefined;
      const cap = createCapability<TestMessage>((msg) => {
        received = msg;
      });

      cap.send(createMessage('test', { value: 42 }));

      expect(received).toEqual({ type: 'test', value: 42 });
    });

    test('send is fire-and-forget', () => {
      const cap = createCapability<TestMessage>(() => {});
      const result = cap.send(createMessage('test', { value: 1 }));
      expect(result).toBeUndefined();
    });
  });

  describe('mapCapability', () => {
    test('transforms messages', () => {
      let received: TestMessage | undefined;
      const targetCap = createCapability<TestMessage>((msg) => {
        received = msg;
      });

      const mappedCap = mapCapability(targetCap, (msg: AltMessage) =>
        createMessage('test', { value: parseInt(msg.data) })
      );

      mappedCap.send(createMessage('alt', { data: '42' }));
      expect(received).toEqual({ type: 'test', value: 42 });
    });
  });

  describe('filterCapability', () => {
    test('forwards matching messages', () => {
      let count = 0;
      const cap = createCapability<TestMessage>(() => {
        count++;
      });
      const filtered = filterCapability(cap, (msg) => msg.value > 10);

      filtered.send(createMessage('test', { value: 5 }));
      expect(count).toBe(0);

      filtered.send(createMessage('test', { value: 15 }));
      expect(count).toBe(1);
    });
  });

  describe('composeCapabilities', () => {
    test('sends to all capabilities', () => {
      const counts = [0, 0, 0];
      const caps = counts.map((_, i) =>
        createCapability<TestMessage>(() => {
          counts[i]++;
        })
      );

      const composed = composeCapabilities(caps);
      composed.send(createMessage('test', { value: 1 }));

      expect(counts).toEqual([1, 1, 1]);
    });
  });

  describe('interceptCapability', () => {
    test('calls interceptor before forwarding', () => {
      const calls: string[] = [];
      const cap = createCapability<TestMessage>(() => {
        calls.push('send');
      });
      const intercepted = interceptCapability(cap, () => {
        calls.push('intercept');
      });

      intercepted.send(createMessage('test', { value: 1 }));
      expect(calls).toEqual(['intercept', 'send']);
    });
  });

  describe('nullCapability', () => {
    test('discards all messages', () => {
      const cap = nullCapability<TestMessage>();
      // Should not throw
      cap.send(createMessage('test', { value: 1 }));
    });
  });
});
