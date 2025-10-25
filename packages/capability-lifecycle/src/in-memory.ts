import { ok, err, type Result } from '@servicejs/result';
import type { LifecycleCapability, LifecycleError, ShutdownHandler, ShutdownSignal, UnregisterFn } from './types.js';

export function createInMemoryLifecycle(): LifecycleCapability {
  const handlers: ShutdownHandler[] = [];
  let shuttingDown = false;
  let hasShutdown = false;

  return {
    onShutdown(handler: ShutdownHandler): Result<UnregisterFn, LifecycleError> {
      if (hasShutdown) {
        return err({ code: 'ALREADY_SHUTDOWN', message: 'Already shutdown' });
      }

      handlers.push(handler);

      const unregister = () => {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      };

      return ok(unregister);
    },

    async shutdown(reason = 'manual shutdown'): Promise<Result<void, LifecycleError>> {
      if (hasShutdown) {
        return err({ code: 'ALREADY_SHUTDOWN', message: 'Already shutdown' });
      }

      shuttingDown = true;

      const signal: ShutdownSignal = {
        reason,
        timestamp: Date.now(),
      };

      // Call handlers in reverse order
      for (let i = handlers.length - 1; i >= 0; i--) {
        const handler = handlers[i];
        if (handler) {
          try {
            await handler(signal);
          } catch (error) {
            console.error('Error in shutdown handler:', error);
          }
        }
      }

      hasShutdown = true;
      shuttingDown = false;

      return ok(undefined);
    },

    isShuttingDown(): boolean {
      return shuttingDown;
    },
  };
}
