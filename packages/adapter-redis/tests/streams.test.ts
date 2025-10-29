import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createRedisStreams } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Redis Streams Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createRedisStreams>;

  beforeEach(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withStartupTimeout(120000)
      .start();

    adapter = createRedisStreams();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('init and start', async () => {
      const initResult = await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });

      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Stream Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('xadd adds message to stream', async () => {
      const result = await adapter.xadd('mystream', {
        type: 'user.created',
        userId: '123',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeTruthy();
        expect(result.value).toContain('-');
      }
    });

    test('xread reads from stream', async () => {
      await adapter.xadd('events', { type: 'test', data: 'value1' });
      await adapter.xadd('events', { type: 'test', data: 'value2' });

      const result = await adapter.xread([{ stream: 'events', id: '0' }]);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(1);
        expect(result.value[0].stream).toBe('events');
        expect(result.value[0].messages.length).toBe(2);
      }
    });

    test('xlen returns stream length', async () => {
      await adapter.xadd('mystream', { msg: '1' });
      await adapter.xadd('mystream', { msg: '2' });
      await adapter.xadd('mystream', { msg: '3' });

      const result = await adapter.xlen('mystream');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(3);
      }
    });

    test('xrange returns messages in range', async () => {
      const id1 = await adapter.xadd('mystream', { msg: 'first' });
      const id2 = await adapter.xadd('mystream', { msg: 'second' });
      const id3 = await adapter.xadd('mystream', { msg: 'third' });

      const result = await adapter.xrange('mystream', '-', '+');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(3);
        expect(result.value[0].data.msg).toBe('first');
        expect(result.value[2].data.msg).toBe('third');
      }
    });

    test('xrevrange returns messages in reverse', async () => {
      await adapter.xadd('mystream', { msg: '1' });
      await adapter.xadd('mystream', { msg: '2' });
      await adapter.xadd('mystream', { msg: '3' });

      const result = await adapter.xrevrange('mystream', '+', '-');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(3);
        expect(result.value[0].data.msg).toBe('3');
        expect(result.value[2].data.msg).toBe('1');
      }
    });

    test('xdel deletes messages', async () => {
      const id = await adapter.xadd('mystream', { msg: 'delete-me' });

      if (isOk(id)) {
        const delResult = await adapter.xdel('mystream', [id.value]);
        expect(isOk(delResult)).toBe(true);
        if (isOk(delResult)) {
          expect(delResult.value).toBe(1);
        }
      }
    });

    test('xtrim trims stream to max length', async () => {
      await adapter.xadd('mystream', { msg: '1' });
      await adapter.xadd('mystream', { msg: '2' });
      await adapter.xadd('mystream', { msg: '3' });
      await adapter.xadd('mystream', { msg: '4' });

      const trimResult = await adapter.xtrim('mystream', 2);
      expect(isOk(trimResult)).toBe(true);

      const lenResult = await adapter.xlen('mystream');
      if (isOk(lenResult)) {
        expect(lenResult.value).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Consumer Groups', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('xgroupCreate creates consumer group', async () => {
      const result = await adapter.xgroupCreate('mystream', 'mygroup', '$', true);
      expect(isOk(result)).toBe(true);
    });

    test('xgroupDestroy deletes consumer group', async () => {
      await adapter.xgroupCreate('mystream', 'mygroup', '$', true);

      const result = await adapter.xgroupDestroy('mystream', 'mygroup');
      expect(isOk(result)).toBe(true);
    });

    test('xreadgroup reads from consumer group', async () => {
      await adapter.xadd('events', { type: 'test' });
      await adapter.xgroupCreate('events', 'processors', '0', false);

      const result = await adapter.xreadgroup('processors', 'worker1', [{ stream: 'events', id: '>' }]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    test('xack acknowledges message', async () => {
      const addResult = await adapter.xadd('events', { type: 'test' });
      await adapter.xgroupCreate('events', 'processors', '0', false);

      const readResult = await adapter.xreadgroup('processors', 'worker1', [{ stream: 'events', id: '>' }]);

      if (isOk(readResult) && readResult.value.length > 0) {
        const messageId = readResult.value[0].messages[0].id;

        const ackResult = await adapter.xack('events', 'processors', [messageId]);
        expect(isOk(ackResult)).toBe(true);
        if (isOk(ackResult)) {
          expect(ackResult.value).toBe(1);
        }
      }
    });

    test('xpending shows pending messages', async () => {
      await adapter.xadd('events', { type: 'test' });
      await adapter.xgroupCreate('events', 'processors', '0', false);
      await adapter.xreadgroup('processors', 'worker1', [{ stream: 'events', id: '>' }]);

      const result = await adapter.xpending('events', 'processors');
      expect(isOk(result)).toBe(true);
    });

    test('xinfoGroups returns group info', async () => {
      await adapter.xadd('events', { type: 'test' });
      await adapter.xgroupCreate('events', 'group1', '$', false);
      await adapter.xgroupCreate('events', 'group2', '$', false);

      const result = await adapter.xinfoGroups('events');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBe(2);
        expect(result.value[0].name).toBeDefined();
      }
    });
  });

  describe('Stream with MaxLen', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('xadd with maxLen limits stream size', async () => {
      await adapter.xadd('limited', { msg: '1' }, undefined, 2);
      await adapter.xadd('limited', { msg: '2' }, undefined, 2);
      await adapter.xadd('limited', { msg: '3' }, undefined, 2);

      const lenResult = await adapter.xlen('limited');
      if (isOk(lenResult)) {
        expect(lenResult.value).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('Event Sourcing Pattern', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('event sourcing workflow', async () => {
      // Add events
      await adapter.xadd('user-events', { type: 'user.created', userId: '1', name: 'Alice' });
      await adapter.xadd('user-events', { type: 'user.updated', userId: '1', email: 'alice@example.com' });
      await adapter.xadd('user-events', { type: 'user.deleted', userId: '1' });

      // Create consumer group for event processing
      await adapter.xgroupCreate('user-events', 'event-processors', '0', false);

      // Read all events
      const result = await adapter.xreadgroup('event-processors', 'processor1', [{ stream: 'user-events', id: '>' }], 10);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const events = result.value[0]?.messages || [];
        expect(events.length).toBe(3);
        expect(events[0].data.type).toBe('user.created');
        expect(events[1].data.type).toBe('user.updated');
        expect(events[2].data.type).toBe('user.deleted');

        // Acknowledge processed events
        for (const event of events) {
          await adapter.xack('user-events', 'event-processors', [event.id]);
        }
      }
    });
  });
});
