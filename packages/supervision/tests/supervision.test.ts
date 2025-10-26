/**
 * Tests for supervision pattern
 */

import { describe, test, expect } from 'bun:test';
import { createCapability } from '@servicejs/core';
import { isOk, isErr } from '@servicejs/result';
import {
  createSupervisor,
  type ErrorNotification,
  type ChildInfo,
} from '../src/supervision.js';

describe('createSupervisor', () => {
  test('creates empty supervisor', () => {
    const supervisor = createSupervisor();

    expect(supervisor.size()).toBe(0);
  });

  test('registers child', () => {
    const supervisor = createSupervisor();

    const childInfo: ChildInfo = {
      urn: 'urn:test:child',
      restart: () => ({}),
    };

    const result = supervisor.registerChild(childInfo);

    expect(isOk(result)).toBe(true);
    expect(supervisor.size()).toBe(1);
  });

  test('prevents duplicate registration', () => {
    const supervisor = createSupervisor();

    const childInfo: ChildInfo = {
      urn: 'urn:test:child',
      restart: () => ({}),
    };

    supervisor.registerChild(childInfo);
    const result = supervisor.registerChild(childInfo);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CHILD_ALREADY_REGISTERED');
    }
  });

  test('unregisters child', () => {
    const supervisor = createSupervisor();

    const childInfo: ChildInfo = {
      urn: 'urn:test:child',
      restart: () => ({}),
    };

    supervisor.registerChild(childInfo);
    const result = supervisor.unregisterChild('urn:test:child');

    expect(isOk(result)).toBe(true);
    expect(supervisor.size()).toBe(0);
  });

  test('unregister returns error for unknown child', () => {
    const supervisor = createSupervisor();

    const result = supervisor.unregisterChild('urn:test:unknown');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CHILD_NOT_FOUND');
    }
  });

  test('tracks retry count', () => {
    const supervisor = createSupervisor();

    const childInfo: ChildInfo = {
      urn: 'urn:test:child',
      restart: () => ({}),
    };

    supervisor.registerChild(childInfo);

    expect(supervisor.getRetryCount('urn:test:child')).toBe(0);
  });

  test('returns undefined for unknown child retry count', () => {
    const supervisor = createSupervisor();

    expect(supervisor.getRetryCount('urn:test:unknown')).toBeUndefined();
  });
});

describe('restart strategy', () => {
  test('restarts child on error', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 10,
    });

    let restartCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        restartCount++;
      },
    };

    supervisor.registerChild(childInfo);

    const result = await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(isOk(result)).toBe(true);
    expect(restartCount).toBe(1);
    expect(supervisor.getRetryCount('urn:test:worker')).toBe(0); // Reset after success
  });

  test('increments retry count on restart', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 0,
    });

    let failCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        failCount++;
        if (failCount < 2) {
          throw new Error('Still failing');
        }
      },
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(supervisor.getRetryCount('urn:test:worker')).toBe(0); // Success resets
    expect(failCount).toBe(2); // Failed once, succeeded on retry
  });

  test('stops after max retries', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 2,
      retryDelay: 0,
    });

    let restartCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        restartCount++;
        throw new Error('Always fails');
      },
    };

    supervisor.registerChild(childInfo);

    const result = await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('RESTART_FAILED');
    }
    expect(restartCount).toBe(2); // Tried max retries
    expect(supervisor.size()).toBe(0); // Child removed
  });

  test('respects retry delay', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 50,
    });

    let failCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        failCount++;
        if (failCount < 2) {
          throw new Error('Failing');
        }
      },
    };

    supervisor.registerChild(childInfo);

    const start = Date.now();
    await supervisor.notifyError('urn:test:worker', new Error('Failed'));
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(40); // At least one delay
    expect(supervisor.getRetryCount('urn:test:worker')).toBe(0);
  });

  test('child-specific strategy overrides default', async () => {
    const supervisor = createSupervisor({
      strategy: 'stop', // Default is stop
    });

    let restartCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        restartCount++;
      },
      strategy: 'restart', // Override to restart
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(restartCount).toBe(1);
    expect(supervisor.size()).toBe(1); // Still registered
  });

  test('tracks isRestarting status', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 100,
    });

    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    };

    supervisor.registerChild(childInfo);

    // Start restart
    const promise = supervisor.notifyError('urn:test:worker', new Error('Failed'));

    // Check during restart
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(supervisor.isRestarting('urn:test:worker')).toBe(true);

    await promise;

    expect(supervisor.isRestarting('urn:test:worker')).toBe(false);
  });

  test('prevents concurrent restarts', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 50,
    });

    let restartCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: async () => {
        restartCount++;
        await new Promise((resolve) => setTimeout(resolve, 30));
      },
    };

    supervisor.registerChild(childInfo);

    // Start first restart
    const promise1 = supervisor.notifyError('urn:test:worker', new Error('Failed 1'));

    // Try concurrent restart
    await new Promise((resolve) => setTimeout(resolve, 10));
    const promise2 = supervisor.notifyError('urn:test:worker', new Error('Failed 2'));

    await Promise.all([promise1, promise2]);

    // Should only restart once
    expect(restartCount).toBe(1);
  });
});

describe('stop strategy', () => {
  test('stops and unregisters child on error', async () => {
    const supervisor = createSupervisor({
      strategy: 'stop',
    });

    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => ({}),
    };

    supervisor.registerChild(childInfo);

    const result = await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(isOk(result)).toBe(true);
    expect(supervisor.size()).toBe(0);
  });

  test('sends error notification on stop', async () => {
    const notifications: ErrorNotification[] = [];
    const errorCap = createCapability<ErrorNotification>((msg) => notifications.push(msg));

    const supervisor = createSupervisor({
      strategy: 'stop',
      errorNotificationCapability: errorCap,
    });

    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => ({}),
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe('error-notification');
    expect(notifications[0]?.childUrn).toBe('urn:test:worker');
    expect(notifications[0]?.strategy).toBe('stop');
  });
});

describe('escalate strategy', () => {
  test('escalates to parent supervisor', async () => {
    let parentNotified = false;
    let parentError: unknown;
    let parentUrn: string | undefined;

    const parentSupervisor = createSupervisor({
      strategy: 'stop',
    });

    // Override parent's notifyError to track calls
    const originalNotifyError = parentSupervisor.notifyError.bind(parentSupervisor);
    parentSupervisor.notifyError = async (urn, error) => {
      parentNotified = true;
      parentUrn = urn;
      parentError = error;
      return originalNotifyError(urn, error);
    };

    const childSupervisor = createSupervisor({
      strategy: 'escalate',
      parentSupervisor,
    });

    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => ({}),
    };

    childSupervisor.registerChild(childInfo);

    const testError = new Error('Worker failed');
    const result = await childSupervisor.notifyError('urn:test:worker', testError);

    expect(isOk(result)).toBe(true);
    expect(parentNotified).toBe(true);
    expect(parentUrn).toBe('urn:test:worker');
    expect(parentError).toBe(testError);
    expect(childSupervisor.size()).toBe(0); // Child removed
  });

  test('returns error when no parent supervisor', async () => {
    const supervisor = createSupervisor({
      strategy: 'escalate',
      // No parent supervisor
    });

    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => ({}),
    };

    supervisor.registerChild(childInfo);

    const result = await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('NO_PARENT_SUPERVISOR');
    }
  });
});

describe('error notifications', () => {
  test('sends notification on restart', async () => {
    const notifications: ErrorNotification[] = [];
    const errorCap = createCapability<ErrorNotification>((msg) => notifications.push(msg));

    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 1,
      retryDelay: 0,
      errorNotificationCapability: errorCap,
    });

    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        throw new Error('Always fails');
      },
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Initial error'));

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.type).toBe('error-notification');
    expect(notifications[0]?.childUrn).toBe('urn:test:worker');
    expect(notifications[0]?.strategy).toBe('restart');
  });

  test('includes retry count in notification', async () => {
    const notifications: ErrorNotification[] = [];
    const errorCap = createCapability<ErrorNotification>((msg) => notifications.push(msg));

    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 2,
      retryDelay: 0,
      errorNotificationCapability: errorCap,
    });

    let attempts = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        attempts++;
        throw new Error('Failing');
      },
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    // Should have notifications with increasing retry counts
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[notifications.length - 1]?.retryCount).toBeGreaterThan(0);
  });
});

describe('notifyError edge cases', () => {
  test('returns error for unknown child', async () => {
    const supervisor = createSupervisor();

    const result = await supervisor.notifyError('urn:test:unknown', new Error('Error'));

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.type).toBe('CHILD_NOT_FOUND');
    }
  });

  test('handles async restart functions', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 0,
    });

    let restartCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        restartCount++;
      },
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(restartCount).toBe(1);
  });

  test('handles sync restart functions', async () => {
    const supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 0,
    });

    let restartCount = 0;
    const childInfo: ChildInfo = {
      urn: 'urn:test:worker',
      restart: () => {
        restartCount++;
      },
    };

    supervisor.registerChild(childInfo);

    await supervisor.notifyError('urn:test:worker', new Error('Failed'));

    expect(restartCount).toBe(1);
  });
});
