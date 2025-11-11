/**
 * Tests for scheduled handler
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createScheduledHandler } from '../src/scheduled-handler';
import { isOk } from '@servicejs/result';

interface MockEnv {
  TEST_VAR: string;
}

// Mock ScheduledController
class MockScheduledController implements ScheduledController {
  constructor(
    public scheduledTime: number,
    public cron: string
  ) {}

  noRetry(): void {
    // Mock implementation
  }
}

describe('Scheduled Handler', () => {
  let handler: ReturnType<typeof createScheduledHandler<MockEnv>>;
  let env: MockEnv;
  let ctx: ExecutionContext;

  beforeEach(async () => {
    handler = createScheduledHandler<MockEnv>();
    await handler.init();

    env = { TEST_VAR: 'test-value' };
    ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };
  });

  test('initializes successfully', async () => {
    const result = await handler.init();
    expect(isOk(result)).toBe(true);
  });

  test('handles scheduled events', async () => {
    let eventReceived = false;
    let receivedCron = '';
    let receivedTime = 0;

    handler.onScheduled(async (event) => {
      eventReceived = true;
      receivedCron = event.cron;
      receivedTime = event.scheduledTime;
    });

    const scheduledTime = Date.now();
    const controller = new MockScheduledController(scheduledTime, '0 0 * * *');

    await handler.handleScheduled(controller, env, ctx);

    expect(eventReceived).toBe(true);
    expect(receivedCron).toBe('0 0 * * *');
    expect(receivedTime).toBe(scheduledTime);
  });

  test('provides access to environment', async () => {
    let receivedEnv: MockEnv | null = null;

    handler.onScheduled(async (event, env) => {
      receivedEnv = env;
    });

    const controller = new MockScheduledController(Date.now(), '0 * * * *');
    await handler.handleScheduled(controller, env, ctx);

    expect(receivedEnv).toBe(env);
    expect(receivedEnv?.TEST_VAR).toBe('test-value');
  });

  test('provides access to execution context', async () => {
    let receivedCtx: ExecutionContext | null = null;

    handler.onScheduled(async (event, env, ctx) => {
      receivedCtx = ctx;
    });

    const controller = new MockScheduledController(Date.now(), '0 0 * * *');
    await handler.handleScheduled(controller, env, ctx);

    expect(receivedCtx).toBe(ctx);
  });

  test('handles different cron patterns', async () => {
    const cronPatterns = [
      '0 0 * * *',      // Daily at midnight
      '0 * * * *',      // Every hour
      '*/5 * * * *',    // Every 5 minutes
      '0 8 * * 1',      // Mondays at 8 AM
      '0 0 1 * *',      // First day of month
    ];

    const receivedPatterns: string[] = [];

    handler.onScheduled(async (event) => {
      receivedPatterns.push(event.cron);
    });

    for (const cron of cronPatterns) {
      const controller = new MockScheduledController(Date.now(), cron);
      await handler.handleScheduled(controller, env, ctx);
    }

    expect(receivedPatterns).toEqual(cronPatterns);
  });

  test('handles scheduled time correctly', async () => {
    const scheduledTimes = [
      Date.now(),
      Date.now() + 1000,
      Date.now() + 60000,
    ];

    const receivedTimes: number[] = [];

    handler.onScheduled(async (event) => {
      receivedTimes.push(event.scheduledTime);
    });

    for (const time of scheduledTimes) {
      const controller = new MockScheduledController(time, '0 * * * *');
      await handler.handleScheduled(controller, env, ctx);
    }

    expect(receivedTimes).toEqual(scheduledTimes);
  });

  test('can perform async operations', async () => {
    let asyncCompleted = false;

    handler.onScheduled(async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      asyncCompleted = true;
    });

    const controller = new MockScheduledController(Date.now(), '0 0 * * *');
    await handler.handleScheduled(controller, env, ctx);

    expect(asyncCompleted).toBe(true);
  });

  test('handles errors with error handler', async () => {
    let errorCaught: Error | null = null;

    handler.onScheduled(async () => {
      throw new Error('Scheduled task error');
    });

    handler.onError((error) => {
      errorCaught = error;
    });

    const controller = new MockScheduledController(Date.now(), '0 0 * * *');

    // The error should still be thrown after calling error handler
    await expect(handler.handleScheduled(controller, env, ctx)).rejects.toThrow('Scheduled task error');

    // But the error handler should have been called first
    expect(errorCaught).toBeInstanceOf(Error);
    expect(errorCaught?.message).toBe('Scheduled task error');
  });

  test('can update handler registration', async () => {
    let firstHandlerCalled = false;
    let secondHandlerCalled = false;

    handler.onScheduled(async () => {
      firstHandlerCalled = true;
    });

    const controller1 = new MockScheduledController(Date.now(), '0 0 * * *');
    await handler.handleScheduled(controller1, env, ctx);

    expect(firstHandlerCalled).toBe(true);
    expect(secondHandlerCalled).toBe(false);

    // Update handler
    handler.onScheduled(async () => {
      secondHandlerCalled = true;
    });

    const controller2 = new MockScheduledController(Date.now(), '0 0 * * *');
    await handler.handleScheduled(controller2, env, ctx);

    expect(secondHandlerCalled).toBe(true);
  });

  test('handles multiple scheduled events sequentially', async () => {
    const events: string[] = [];

    handler.onScheduled(async (event) => {
      events.push(`${event.cron} at ${event.scheduledTime}`);
    });

    const controller1 = new MockScheduledController(1000, '0 0 * * *');
    const controller2 = new MockScheduledController(2000, '0 * * * *');
    const controller3 = new MockScheduledController(3000, '*/5 * * * *');

    await handler.handleScheduled(controller1, env, ctx);
    await handler.handleScheduled(controller2, env, ctx);
    await handler.handleScheduled(controller3, env, ctx);

    expect(events).toEqual([
      '0 0 * * * at 1000',
      '0 * * * * at 2000',
      '*/5 * * * * at 3000',
    ]);
  });

  test('supports complex scheduled logic', async () => {
    const executionLog: string[] = [];

    handler.onScheduled(async (event, env, ctx) => {
      // Simulate different tasks based on cron pattern
      if (event.cron === '0 0 * * *') {
        executionLog.push('Daily cleanup');
      } else if (event.cron === '0 * * * *') {
        executionLog.push('Hourly health check');
      } else if (event.cron === '0 8 * * 1') {
        executionLog.push('Weekly report');
      }
    });

    const dailyController = new MockScheduledController(Date.now(), '0 0 * * *');
    const hourlyController = new MockScheduledController(Date.now(), '0 * * * *');
    const weeklyController = new MockScheduledController(Date.now(), '0 8 * * 1');

    await handler.handleScheduled(dailyController, env, ctx);
    await handler.handleScheduled(hourlyController, env, ctx);
    await handler.handleScheduled(weeklyController, env, ctx);

    expect(executionLog).toEqual([
      'Daily cleanup',
      'Hourly health check',
      'Weekly report',
    ]);
  });

  test('throws error when no handler is registered', async () => {
    // Create a new handler without registering any handler
    const newHandler = createScheduledHandler<MockEnv>();
    await newHandler.init();

    const controller = new MockScheduledController(Date.now(), '0 0 * * *');

    // Should throw error
    await expect(newHandler.handleScheduled(controller, env, ctx)).rejects.toThrow('No scheduled handler registered');
  });
});
