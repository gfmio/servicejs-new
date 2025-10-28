import { describe, test, expect } from 'bun:test';
import { createIntegration } from '../src/base';
import { ok, err, isOk, isErr } from '@servicejs/result';

describe('Integration Framework', () => {
  describe('Base Integration', () => {
    test('creates integration with metadata', () => {
      const integration = createIntegration(
        {
          name: 'test-integration',
          version: '1.0.0',
          type: 'other',
        },
        {}
      );

      expect(integration.metadata.name).toBe('test-integration');
      expect(integration.metadata.version).toBe('1.0.0');
      expect(integration.metadata.type).toBe('other');
    });

    test('initial state is uninitialized', () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {}
      );

      expect(integration.state.type).toBe('uninitialized');
    });

    test('initializes successfully', async () => {
      let initialized = false;

      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => {
            initialized = true;
            return ok(undefined);
          },
        }
      );

      const result = await integration.init({});

      expect(isOk(result)).toBe(true);
      expect(initialized).toBe(true);
      expect(integration.state.type).toBe('initialized');
    });

    test('starts after initialization', async () => {
      let started = false;

      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
          onStart: async () => {
            started = true;
            return ok(undefined);
          },
        }
      );

      await integration.init({});
      const result = await integration.start();

      expect(isOk(result)).toBe(true);
      expect(started).toBe(true);
      expect(integration.state.type).toBe('started');
    });

    test('stops after starting', async () => {
      let stopped = false;

      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
          onStart: async () => ok(undefined),
          onStop: async () => {
            stopped = true;
            return ok(undefined);
          },
        }
      );

      await integration.init({});
      await integration.start();
      const result = await integration.stop();

      expect(isOk(result)).toBe(true);
      expect(stopped).toBe(true);
      expect(integration.state.type).toBe('stopped');
    });

    test('destroys and cleans up', async () => {
      let destroyed = false;

      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
          onStart: async () => ok(undefined),
          onStop: async () => ok(undefined),
          onDestroy: async () => {
            destroyed = true;
            return ok(undefined);
          },
        }
      );

      await integration.init({});
      await integration.start();
      const result = await integration.destroy();

      expect(isOk(result)).toBe(true);
      expect(destroyed).toBe(true);
      expect(integration.state.type).toBe('uninitialized');
    });

    test('health check returns healthy when started', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
          onStart: async () => ok(undefined),
        }
      );

      await integration.init({});
      await integration.start();

      const result = await integration.health();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('health check returns degraded when not started', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
        }
      );

      await integration.init({});

      const result = await integration.health();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('degraded');
      }
    });

    test('health check returns unhealthy on error', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => err(new Error('Init failed')),
        }
      );

      await integration.init({});

      const result = await integration.health();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });

    test('custom health check', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
          onStart: async () => ok(undefined),
          onHealth: async () => ok({ status: 'degraded', reason: 'High load' }),
        }
      );

      await integration.init({});
      await integration.start();

      const result = await integration.health();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('degraded');
        if (result.value.status === 'degraded') {
          expect(result.value.reason).toBe('High load');
        }
      }
    });

    test('cannot initialize twice', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
        }
      );

      await integration.init({});
      const result = await integration.init({});

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Cannot initialize');
      }
    });

    test('cannot start before initialization', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onStart: async () => ok(undefined),
        }
      );

      const result = await integration.start();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Cannot start');
      }
    });

    test('cannot stop before starting', async () => {
      const integration = createIntegration(
        {
          name: 'test',
          version: '1.0.0',
          type: 'other',
        },
        {
          onInit: async () => ok(undefined),
          onStop: async () => ok(undefined),
        }
      );

      await integration.init({});
      const result = await integration.stop();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Cannot stop');
      }
    });
  });
});
