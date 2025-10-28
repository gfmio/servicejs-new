import { describe, test, expect } from 'bun:test';
import {
  createPluginManager,
  createPlugin,
  validatePluginDependencies,
  type Plugin,
} from '../src/plugin';
import { ok, err, isOk, isErr } from '@servicejs/result';

describe('Plugin System', () => {
  describe('Plugin Manager', () => {
    test('registers plugin', () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {}
      );

      const result = manager.register(plugin);

      expect(isOk(result)).toBe(true);
    });

    test('prevents duplicate registration', () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {}
      );

      manager.register(plugin);
      const result = manager.register(plugin);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('already registered');
      }
    });

    test('gets registered plugin', () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {}
      );

      manager.register(plugin);

      const result = manager.get('test');

      expect(result.isSome()).toBe(true);
      if (result.isSome()) {
        expect(result.value.plugin.metadata.name).toBe('test');
      }
    });

    test('returns None for non-existent plugin', () => {
      const manager = createPluginManager();

      const result = manager.get('non-existent');

      expect(result.isNone()).toBe(true);
    });

    test('unregisters plugin', () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {}
      );

      manager.register(plugin);
      const result = manager.unregister('test');

      expect(isOk(result)).toBe(true);
      expect(manager.get('test').isNone()).toBe(true);
    });

    test('prevents unregistering plugin with dependents', () => {
      const manager = createPluginManager();

      const base = createPlugin(
        { name: 'base', version: '1.0.0' },
        {}
      );

      const dependent = createPlugin(
        {
          name: 'dependent',
          version: '1.0.0',
          dependencies: ['base']
        },
        {}
      );

      manager.register(base);
      manager.register(dependent);

      const result = manager.unregister('base');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('depends on it');
      }
    });

    test('lists all plugins', () => {
      const manager = createPluginManager();

      const plugin1 = createPlugin({ name: 'test1', version: '1.0.0' }, {});
      const plugin2 = createPlugin({ name: 'test2', version: '1.0.0' }, {});

      manager.register(plugin1);
      manager.register(plugin2);

      const all = manager.getAll();

      expect(all).toHaveLength(2);
    });
  });

  describe('Plugin Lifecycle', () => {
    test('initializes plugins', async () => {
      const manager = createPluginManager<{ initialized: string[] }>();
      const context = { initialized: [] };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async (ctx) => {
            ctx.initialized.push('test');
            return ok(undefined);
          }
        }
      );

      manager.register(plugin);
      const result = await manager.initAll(context);

      expect(isOk(result)).toBe(true);
      expect(context.initialized).toEqual(['test']);
    });

    test('initializes plugins in dependency order', async () => {
      const manager = createPluginManager<{ order: string[] }>();
      const context = { order: [] };

      const base = createPlugin(
        { name: 'base', version: '1.0.0' },
        {
          onInit: async (ctx) => {
            ctx.order.push('base');
            return ok(undefined);
          }
        }
      );

      const dependent = createPlugin(
        {
          name: 'dependent',
          version: '1.0.0',
          dependencies: ['base']
        },
        {
          onInit: async (ctx) => {
            ctx.order.push('dependent');
            return ok(undefined);
          }
        }
      );

      manager.register(base);
      manager.register(dependent);

      const result = await manager.initAll(context);

      expect(isOk(result)).toBe(true);
      expect(context.order).toEqual(['base', 'dependent']);
    });

    test('initializes plugins by priority', async () => {
      const manager = createPluginManager<{ order: string[] }>();
      const context = { order: [] };

      const low = createPlugin(
        { name: 'low', version: '1.0.0', priority: 1 },
        {
          onInit: async (ctx) => {
            ctx.order.push('low');
            return ok(undefined);
          }
        }
      );

      const high = createPlugin(
        { name: 'high', version: '1.0.0', priority: 10 },
        {
          onInit: async (ctx) => {
            ctx.order.push('high');
            return ok(undefined);
          }
        }
      );

      manager.register(low);
      manager.register(high);

      const result = await manager.initAll(context);

      expect(isOk(result)).toBe(true);
      // Higher priority initializes first
      expect(context.order).toEqual(['high', 'low']);
    });

    test('destroys plugins', async () => {
      const manager = createPluginManager<{ destroyed: string[] }>();
      const context = { destroyed: [] };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          onDestroy: async (ctx) => {
            ctx.destroyed.push('test');
            return ok(undefined);
          }
        }
      );

      manager.register(plugin);
      await manager.initAll(context);

      const result = await manager.destroyAll(context);

      expect(isOk(result)).toBe(true);
      expect(context.destroyed).toEqual(['test']);
    });

    test('destroys plugins in reverse order', async () => {
      const manager = createPluginManager<{ order: string[] }>();
      const context = { order: [] };

      const base = createPlugin(
        { name: 'base', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          onDestroy: async (ctx) => {
            ctx.order.push('base');
            return ok(undefined);
          }
        }
      );

      const dependent = createPlugin(
        {
          name: 'dependent',
          version: '1.0.0',
          dependencies: ['base']
        },
        {
          onInit: async () => ok(undefined),
          onDestroy: async (ctx) => {
            ctx.order.push('dependent');
            return ok(undefined);
          }
        }
      );

      manager.register(base);
      manager.register(dependent);
      await manager.initAll(context);

      const result = await manager.destroyAll(context);

      expect(isOk(result)).toBe(true);
      // Dependent destroyed before base
      expect(context.order).toEqual(['dependent', 'base']);
    });

    test('handles init failures', async () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => err(new Error('Init failed'))
        }
      );

      manager.register(plugin);
      const result = await manager.initAll({});

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Init failed');
      }
    });
  });

  describe('Plugin Hooks', () => {
    test('calls beforeSend hook', async () => {
      const manager = createPluginManager<{ calls: number }>();
      const context = { calls: 0 };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          beforeSend: async (ctx, msg) => {
            ctx.calls++;
            return ok(msg);
          }
        }
      );

      manager.register(plugin);
      await manager.initAll(context);

      const result = await manager.callBeforeSend(context, { type: 'test' });

      expect(isOk(result)).toBe(true);
      expect(context.calls).toBe(1);
    });

    test('transforms message in beforeSend', async () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          beforeSend: async (_ctx, msg: any) => {
            return ok({ ...msg, transformed: true });
          }
        }
      );

      manager.register(plugin);
      await manager.initAll({});

      const result = await manager.callBeforeSend({}, { type: 'test' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect((result.value as any).transformed).toBe(true);
      }
    });

    test('calls afterSend hook', async () => {
      const manager = createPluginManager<{ calls: number }>();
      const context = { calls: 0 };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          afterSend: async (ctx) => {
            ctx.calls++;
            return ok(undefined);
          }
        }
      );

      manager.register(plugin);
      await manager.initAll(context);

      const result = await manager.callAfterSend(context, { type: 'test' });

      expect(isOk(result)).toBe(true);
      expect(context.calls).toBe(1);
    });

    test('calls onError hook', async () => {
      const manager = createPluginManager<{ errors: Error[] }>();
      const context = { errors: [] };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          onError: async (ctx, error) => {
            ctx.errors.push(error);
            return ok(undefined);
          }
        }
      );

      manager.register(plugin);
      await manager.initAll(context);

      const testError = new Error('Test error');
      const result = await manager.callOnError(context, testError);

      expect(isOk(result)).toBe(true);
      expect(context.errors).toContain(testError);
    });

    test('calls beforeUpdate hook', async () => {
      const manager = createPluginManager<{ calls: number }>();
      const context = { calls: 0 };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          beforeUpdate: async (ctx, _old, newState) => {
            ctx.calls++;
            return ok(newState);
          }
        }
      );

      manager.register(plugin);
      await manager.initAll(context);

      const result = await manager.callBeforeUpdate(
        context,
        { count: 0 },
        { count: 1 }
      );

      expect(isOk(result)).toBe(true);
      expect(context.calls).toBe(1);
    });

    test('transforms state in beforeUpdate', async () => {
      const manager = createPluginManager();

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          beforeUpdate: async (_ctx, _old, newState: any) => {
            return ok({ ...newState, validated: true });
          }
        }
      );

      manager.register(plugin);
      await manager.initAll({});

      const result = await manager.callBeforeUpdate(
        {},
        { count: 0 },
        { count: 1 }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect((result.value as any).validated).toBe(true);
      }
    });

    test('calls afterUpdate hook', async () => {
      const manager = createPluginManager<{ calls: number }>();
      const context = { calls: 0 };

      const plugin = createPlugin(
        { name: 'test', version: '1.0.0' },
        {
          onInit: async () => ok(undefined),
          afterUpdate: async (ctx) => {
            ctx.calls++;
            return ok(undefined);
          }
        }
      );

      manager.register(plugin);
      await manager.initAll(context);

      const result = await manager.callAfterUpdate(
        context,
        { count: 0 },
        { count: 1 }
      );

      expect(isOk(result)).toBe(true);
      expect(context.calls).toBe(1);
    });

    test('calls hooks in priority order', async () => {
      const manager = createPluginManager<{ order: string[] }>();
      const context = { order: [] };

      const low = createPlugin(
        { name: 'low', version: '1.0.0', priority: 1 },
        {
          onInit: async () => ok(undefined),
          beforeSend: async (ctx, msg) => {
            ctx.order.push('low');
            return ok(msg);
          }
        }
      );

      const high = createPlugin(
        { name: 'high', version: '1.0.0', priority: 10 },
        {
          onInit: async () => ok(undefined),
          beforeSend: async (ctx, msg) => {
            ctx.order.push('high');
            return ok(msg);
          }
        }
      );

      manager.register(low);
      manager.register(high);
      await manager.initAll(context);

      await manager.callBeforeSend(context, {});

      // Higher priority called first
      expect(context.order).toEqual(['high', 'low']);
    });
  });

  describe('Plugin Dependencies', () => {
    test('enforces dependency registration order', () => {
      const manager = createPluginManager();

      const dependent = createPlugin(
        {
          name: 'dependent',
          version: '1.0.0',
          dependencies: ['base']
        },
        {}
      );

      // Try to register without dependency
      const result = manager.register(dependent);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not registered');
      }
    });

    test('allows registration after dependencies', () => {
      const manager = createPluginManager();

      const base = createPlugin(
        { name: 'base', version: '1.0.0' },
        {}
      );

      const dependent = createPlugin(
        {
          name: 'dependent',
          version: '1.0.0',
          dependencies: ['base']
        },
        {}
      );

      manager.register(base);
      const result = manager.register(dependent);

      expect(isOk(result)).toBe(true);
    });

    test('validates multiple dependencies', () => {
      const plugins: Plugin[] = [
        createPlugin({ name: 'a', version: '1.0.0' }, {}),
        createPlugin({ name: 'b', version: '1.0.0', dependencies: ['a'] }, {}),
        createPlugin({ name: 'c', version: '1.0.0', dependencies: ['a', 'b'] }, {}),
      ];

      const result = validatePluginDependencies(plugins);

      expect(isOk(result)).toBe(true);
    });

    test('detects missing dependencies', () => {
      const plugins: Plugin[] = [
        createPlugin({ name: 'a', version: '1.0.0' }, {}),
        createPlugin({ name: 'b', version: '1.0.0', dependencies: ['c'] }, {}),
      ];

      const result = validatePluginDependencies(plugins);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('unsatisfied dependency');
      }
    });

    test('prevents circular dependencies through registration', () => {
      const manager = createPluginManager();

      // Note: Circular dependencies are prevented at registration time
      // by requiring dependencies to be registered first.
      // This test verifies that behavior.

      const a = createPlugin(
        { name: 'a', version: '1.0.0', dependencies: ['b'] },
        {}
      );

      // Try to register 'a' which depends on 'b' (not yet registered)
      const result = manager.register(a);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('not registered');
      }

      // This registration-time check effectively prevents circular dependencies
      // because you can't create a cycle if dependencies must exist first
    });
  });

  describe('Real-World Example: Logger Plugin', () => {
    interface LogEntry {
      timestamp: number;
      level: 'info' | 'error';
      message: string;
    }

    interface AppContext {
      logs: LogEntry[];
    }

    test('logger plugin logs messages', async () => {
      const manager = createPluginManager<AppContext>();
      const context: AppContext = { logs: [] };

      const loggerPlugin = createPlugin(
        {
          name: 'logger',
          version: '1.0.0',
          description: 'Logs all messages and errors'
        },
        {
          onInit: async (ctx) => {
            ctx.logs.push({
              timestamp: Date.now(),
              level: 'info',
              message: 'Logger initialized'
            });
            return ok(undefined);
          },

          beforeSend: async (ctx, msg) => {
            ctx.logs.push({
              timestamp: Date.now(),
              level: 'info',
              message: `Sending message: ${JSON.stringify(msg)}`
            });
            return ok(msg);
          },

          onError: async (ctx, error) => {
            ctx.logs.push({
              timestamp: Date.now(),
              level: 'error',
              message: error.message
            });
            return ok(undefined);
          },

          onDestroy: async (ctx) => {
            ctx.logs.push({
              timestamp: Date.now(),
              level: 'info',
              message: 'Logger destroyed'
            });
            return ok(undefined);
          }
        }
      );

      manager.register(loggerPlugin);
      await manager.initAll(context);

      // Send a message
      await manager.callBeforeSend(context, { type: 'test', data: 'hello' });

      // Trigger an error
      await manager.callOnError(context, new Error('Test error'));

      // Destroy
      await manager.destroyAll(context);

      // Verify logs
      expect(context.logs.length).toBe(4);
      expect(context.logs[0]?.message).toContain('initialized');
      expect(context.logs[1]?.message).toContain('Sending message');
      expect(context.logs[2]?.level).toBe('error');
      expect(context.logs[2]?.message).toBe('Test error');
      expect(context.logs[3]?.message).toContain('destroyed');
    });
  });
});
