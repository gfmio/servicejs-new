/**
 * Supervision Example
 *
 * Demonstrates supervision patterns for fault-tolerant components.
 */

import { createCapability } from '@servicejs/core';
import {
  createSupervisor,
  type ErrorNotification,
  type ChildInfo,
} from '../src/supervision.js';

// Simulate a worker that can fail
class Worker {
  constructor(
    public id: string,
    public failureRate: number = 0
  ) {}

  doWork(): void {
    if (Math.random() < this.failureRate) {
      throw new Error(`Worker ${this.id} failed during execution`);
    }
    console.log(`Worker ${this.id} completed work successfully`);
  }
}

// Example 1: Basic Restart Strategy
console.log('\n=== Example 1: Basic Restart Strategy ===\n');

const supervisor1 = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  retryDelay: 500,
});

let worker1: Worker | null = new Worker('worker-1', 0.7); // 70% failure rate

const childInfo1: ChildInfo<Worker> = {
  urn: 'urn:example:worker-1',
  restart: () => {
    console.log('  Restarting worker-1...');
    worker1 = new Worker('worker-1', 0.3); // Lower failure rate after restart
    return worker1;
  },
};

supervisor1.registerChild(childInfo1);

console.log(`Registered children: ${supervisor1.size()}`);

// Simulate work that fails
try {
  worker1?.doWork();
} catch (error) {
  console.log('Work failed, notifying supervisor...');
  const result = await supervisor1.notifyError('urn:example:worker-1', error);

  if (result.isOk()) {
    console.log('Worker restarted successfully');
    console.log(`Retry count: ${supervisor1.getRetryCount('urn:example:worker-1')}`);
  }
}

// Example 2: Max Retries Exceeded
console.log('\n=== Example 2: Max Retries Exceeded ===\n');

const supervisor2 = createSupervisor({
  strategy: 'restart',
  maxRetries: 2,
  retryDelay: 100,
});

let restartAttempts = 0;
const childInfo2: ChildInfo = {
  urn: 'urn:example:failing-worker',
  restart: () => {
    restartAttempts++;
    console.log(`  Restart attempt ${restartAttempts}`);
    throw new Error('Restart failed');
  },
};

supervisor2.registerChild(childInfo2);

const result2 = await supervisor2.notifyError(
  'urn:example:failing-worker',
  new Error('Initial failure')
);

if (result2.isErr()) {
  console.log(`\n✗ Supervisor gave up: ${result2.error.type}`);
  console.log(`  Total restart attempts: ${restartAttempts}`);
  console.log(`  Worker removed: ${supervisor2.size() === 0}`);
}

// Example 3: Stop Strategy
console.log('\n=== Example 3: Stop Strategy ===\n');

const supervisor3 = createSupervisor({
  strategy: 'stop',
});

const childInfo3: ChildInfo = {
  urn: 'urn:example:disposable-worker',
  restart: () => console.log('This should not be called'),
};

supervisor3.registerChild(childInfo3);
console.log(`Children before error: ${supervisor3.size()}`);

await supervisor3.notifyError('urn:example:disposable-worker', new Error('Failed'));

console.log(`Children after error: ${supervisor3.size()}`);
console.log('Worker was stopped and removed');

// Example 4: Escalate Strategy with Parent Supervisor
console.log('\n=== Example 4: Escalate Strategy ===\n');

const parentSupervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 1,
  retryDelay: 100,
});

const childSupervisor = createSupervisor({
  strategy: 'escalate',
  parentSupervisor,
});

// Register a child in the parent supervisor
parentSupervisor.registerChild({
  urn: 'urn:example:critical-worker',
  restart: () => {
    console.log('  Parent supervisor restarting critical worker');
    return new Worker('critical-worker', 0);
  },
});

// Register a child in the child supervisor
childSupervisor.registerChild({
  urn: 'urn:example:critical-worker',
  restart: () => console.log('This should not be called'),
});

console.log('Child supervisor escalating error to parent...');
await childSupervisor.notifyError(
  'urn:example:critical-worker',
  new Error('Critical failure')
);

console.log(`Child supervisor size: ${childSupervisor.size()}`);
console.log('Error was escalated to parent supervisor');

// Example 5: Error Notifications
console.log('\n=== Example 5: Error Notifications ===\n');

const notifications: ErrorNotification[] = [];
const errorCap = createCapability<ErrorNotification>((msg) => {
  notifications.push(msg);
  console.log(`  📧 Notification: ${msg.strategy} strategy for ${msg.childUrn}`);
  console.log(`     Retry count: ${msg.retryCount}`);
});

const supervisor5 = createSupervisor({
  strategy: 'restart',
  maxRetries: 2,
  retryDelay: 50,
  errorNotificationCapability: errorCap,
});

let failCount = 0;
supervisor5.registerChild({
  urn: 'urn:example:monitored-worker',
  restart: () => {
    failCount++;
    if (failCount < 3) {
      throw new Error('Still failing');
    }
    console.log('  Worker recovered!');
  },
});

await supervisor5.notifyError('urn:example:monitored-worker', new Error('Failed'));

console.log(`\nTotal notifications sent: ${notifications.length}`);

// Example 6: Per-Child Strategy Override
console.log('\n=== Example 6: Per-Child Strategy Override ===\n');

const supervisor6 = createSupervisor({
  strategy: 'stop', // Default strategy
  maxRetries: 2,
  retryDelay: 50,
});

// Worker 1: Uses default (stop)
supervisor6.registerChild({
  urn: 'urn:example:worker-stop',
  restart: () => console.log('Should not restart'),
});

// Worker 2: Overrides to restart
supervisor6.registerChild({
  urn: 'urn:example:worker-restart',
  restart: () => {
    console.log('  Worker restarted (override strategy)');
    return new Worker('worker-restart', 0);
  },
  strategy: 'restart', // Override
});

console.log('Failing worker with default strategy (stop)...');
await supervisor6.notifyError('urn:example:worker-stop', new Error('Failed'));
console.log(`  Workers remaining: ${supervisor6.size()}`);

console.log('\nFailing worker with override strategy (restart)...');
await supervisor6.notifyError('urn:example:worker-restart', new Error('Failed'));
console.log(`  Workers remaining: ${supervisor6.size()}`);

// Example 7: Hierarchical Supervision
console.log('\n=== Example 7: Hierarchical Supervision ===\n');

const topSupervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 1,
  retryDelay: 100,
});

const middleSupervisor = createSupervisor({
  strategy: 'escalate',
  parentSupervisor: topSupervisor,
});

const bottomSupervisor = createSupervisor({
  strategy: 'escalate',
  parentSupervisor: middleSupervisor,
});

// Register worker at top level
topSupervisor.registerChild({
  urn: 'urn:example:leaf-worker',
  restart: () => {
    console.log('  Top supervisor restarted leaf worker');
    return new Worker('leaf-worker', 0);
  },
});

// Register same URN at middle and bottom for escalation chain
middleSupervisor.registerChild({
  urn: 'urn:example:leaf-worker',
  restart: () => ({}),
});

bottomSupervisor.registerChild({
  urn: 'urn:example:leaf-worker',
  restart: () => ({}),
});

console.log('Bottom supervisor encountering error...');
console.log('  → Escalating to middle supervisor...');
console.log('  → Escalating to top supervisor...');
console.log('  → Top supervisor restarting worker...\n');

await bottomSupervisor.notifyError('urn:example:leaf-worker', new Error('Leaf failed'));

// Example 8: Monitoring Restart Status
console.log('\n=== Example 8: Monitoring Restart Status ===\n');

const supervisor8 = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  retryDelay: 200,
});

supervisor8.registerChild({
  urn: 'urn:example:slow-restart',
  restart: async () => {
    console.log('  Starting slow restart...');
    await new Promise((resolve) => setTimeout(resolve, 150));
    console.log('  Restart complete');
  },
});

console.log('Initiating restart...');
const restartPromise = supervisor8.notifyError(
  'urn:example:slow-restart',
  new Error('Failed')
);

// Check status during restart
await new Promise((resolve) => setTimeout(resolve, 50));
console.log(`Restarting: ${supervisor8.isRestarting('urn:example:slow-restart')}`);

await restartPromise;
console.log(`Restarting: ${supervisor8.isRestarting('urn:example:slow-restart')}`);

// Example 9: Real-World Database Connection Pool
console.log('\n=== Example 9: Database Connection Pool ===\n');

class DatabaseConnection {
  constructor(
    public id: string,
    public isHealthy: boolean = true
  ) {}

  query(sql: string): string {
    if (!this.isHealthy) {
      throw new Error(`Connection ${this.id} is unhealthy`);
    }
    return `Result from connection ${this.id}`;
  }
}

const dbSupervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  retryDelay: 1000,
});

const connections = new Map<string, DatabaseConnection>();

// Register multiple database connections
for (let i = 1; i <= 3; i++) {
  const urn = `urn:db:connection-${i}`;
  const conn = new DatabaseConnection(`conn-${i}`);
  connections.set(urn, conn);

  dbSupervisor.registerChild({
    urn,
    restart: () => {
      console.log(`  Recreating database connection ${i}...`);
      const newConn = new DatabaseConnection(`conn-${i}`);
      connections.set(urn, newConn);
      return newConn;
    },
  });
}

console.log(`Database pool initialized with ${dbSupervisor.size()} connections`);

// Simulate connection failure
const failedUrn = 'urn:db:connection-2';
const failedConn = connections.get(failedUrn);
if (failedConn) {
  failedConn.isHealthy = false;

  try {
    failedConn.query('SELECT * FROM users');
  } catch (error) {
    console.log('\nConnection failure detected, notifying supervisor...');
    await dbSupervisor.notifyError(failedUrn, error);
    console.log('Connection restored by supervisor');
  }
}

console.log(`\nActive connections: ${dbSupervisor.size()}`);

console.log('\n✓ All supervision examples completed');
