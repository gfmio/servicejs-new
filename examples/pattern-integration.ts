/**
 * Pattern Integration Examples
 *
 * Demonstrates how to combine multiple ServiceJS patterns:
 * - Request/Reply for RPC-style communication
 * - Pub/Sub for event distribution
 * - Supervision for error recovery
 *
 * Scenario: A task processing system with workers, a coordinator, and monitoring.
 */

import {
  createComponent,
  createMessage,
  stay,
  emitTo,
  batch,
  type Reducer,
  type Capability,
  type MessageOf,
} from '@servicejs/core';
import { Ok, Err, isOk } from '@servicejs/result';
import { createRequestReply, waitForResponse, createReply } from '@servicejs/request-reply';
import { createPubSub } from '@servicejs/pub-sub';
import { createSupervisor } from '@servicejs/supervision';

console.log('\n=== Pattern Integration: Task Processing System ===\n');

// === Example 1: Request/Reply + Pub/Sub ===
// Worker processes tasks and publishes results to subscribers

console.log('=== Example 1: Request/Reply with Pub/Sub ===\n');

// Define messages
const ProcessTaskMsg = createMessage<
  'processTask',
  { taskId: string; data: any; replyTo: Capability<any> }
>('processTask');

const TaskCompletedEvent = createMessage<'taskCompleted', { taskId: string; result: any }>(
  'taskCompleted'
);

const TaskFailedEvent = createMessage<'taskFailed', { taskId: string; error: string }>(
  'taskFailed'
);

type WorkerMessage = MessageOf<typeof ProcessTaskMsg>;

// Create pub/sub for events
const eventBus = createPubSub<any>();

// Worker reducer
const workerReducer: Reducer<{}, WorkerMessage> = (state, message) => {
  switch (message.type) {
    case 'processTask': {
      console.log(`  Worker processing task: ${message.taskId}`);

      // Simulate task processing
      const success = Math.random() > 0.2; // 80% success rate
      const result = success
        ? Ok({ taskId: message.taskId, result: `Processed ${message.taskId}` })
        : Err(new Error('Task processing failed'));

      // Reply to requester AND publish event
      const reply = createReply(message, result);

      const event = success
        ? TaskCompletedEvent({ taskId: message.taskId, result: result.value })
        : TaskFailedEvent({ taskId: message.taskId, error: 'Processing failed' });

      // Publish to all subscribers
      eventBus.publish('task-events', event);

      return stay(state, workerReducer, [emitTo(message.replyTo, reply)]);
    }
  }
};

// Create worker
const { capability: workerCap } = createComponent('urn:worker:1' as any, {}, workerReducer);

// Create subscribers
const analyticsReducer: Reducer<{ completed: number; failed: number }, any> = (
  state,
  message
) => {
  switch (message.type) {
    case 'taskCompleted':
      console.log(`  📊 Analytics: Task ${message.taskId} completed`);
      return stay({ ...state, completed: state.completed + 1 }, analyticsReducer, []);

    case 'taskFailed':
      console.log(`  📊 Analytics: Task ${message.taskId} failed`);
      return stay({ ...state, failed: state.failed + 1 }, analyticsReducer, []);

    default:
      return stay(state, analyticsReducer, []);
  }
};

const loggingReducer: Reducer<{}, any> = (state, message) => {
  console.log(`  📝 Logger: ${message.type} - ${JSON.stringify(message)}`);
  return stay(state, loggingReducer, []);
};

const { capability: analyticsCap, component: analyticsComp } = createComponent(
  'urn:analytics:1' as any,
  { completed: 0, failed: 0 },
  analyticsReducer
);

const { capability: loggerCap } = createComponent('urn:logger:1' as any, {}, loggingReducer);

// Subscribe to events
eventBus.subscribe('task-events', analyticsCap);
eventBus.subscribe('task-events', loggerCap);

// Process some tasks
console.log('Processing tasks...\n');

for (let i = 1; i <= 5; i++) {
  const { requestMessage, pendingRequest } = createRequestReply(
    workerCap as any,
    { taskId: `task-${i}`, data: { value: i * 10 } },
    'processTask'
  );

  workerCap.send(requestMessage);

  // Wait for response
  const response = await waitForResponse(pendingRequest, 100);

  if (isOk(response)) {
    console.log(`  ✅ Got response: ${JSON.stringify(response.value)}`);
  } else {
    console.log(`  ❌ Error: ${response.error}`);
  }
}

console.log(`\nAnalytics: ${JSON.stringify(analyticsComp.getState())}\n`);

// === Example 2: Supervision + Request/Reply ===
// Supervised worker pool with automatic restart

console.log('\n=== Example 2: Supervised Worker Pool ===\n');

// Create supervisor
const supervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  retryDelay: 100,
});

// Unreliable worker that sometimes crashes
let workerInstance = 0;

const createUnreliableWorker = () => {
  const instanceId = ++workerInstance;
  console.log(`  🏭 Creating worker instance #${instanceId}`);

  const unreliableReducer: Reducer<{ instance: number; processed: number }, WorkerMessage> = (
    state,
    message
  ) => {
    switch (message.type) {
      case 'processTask': {
        console.log(`  👷 Worker #${state.instance} processing ${message.taskId}`);

        // Simulate random failures
        if (Math.random() < 0.3) {
          console.log(`  💥 Worker #${state.instance} crashed!`);

          // Notify supervisor
          supervisor.notifyError('urn:worker:unreliable' as any, new Error('Worker crashed'));

          return stay(state, unreliableReducer, [
            emitTo(message.replyTo, Err(new Error('Worker crashed'))),
          ]);
        }

        const result = Ok({ taskId: message.taskId, result: 'Success', worker: state.instance });

        return stay(
          { ...state, processed: state.processed + 1 },
          unreliableReducer,
          [emitTo(message.replyTo, createReply(message, result))]
        );
      }
    }
  };

  const { capability } = createComponent(
    'urn:worker:unreliable' as any,
    { instance: instanceId, processed: 0 },
    unreliableReducer
  );

  return capability;
};

// Register worker with supervisor
let unreliableWorkerCap = createUnreliableWorker();

supervisor.registerChild('urn:worker:unreliable' as any, () => {
  unreliableWorkerCap = createUnreliableWorker();
});

// Process tasks with supervision
console.log('\nProcessing tasks with supervised worker...\n');

for (let i = 1; i <= 10; i++) {
  const { requestMessage, pendingRequest } = createRequestReply(
    unreliableWorkerCap as any,
    { taskId: `task-${i}`, data: {} },
    'processTask'
  );

  unreliableWorkerCap.send(requestMessage);

  const response = await waitForResponse(pendingRequest, 100);

  if (isOk(response)) {
    console.log(`  ✅ Task ${i}: ${JSON.stringify(response.value)}`);
  } else {
    console.log(`  ❌ Task ${i}: ${response.error}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
}

console.log('\n=== Example 3: All Patterns Together ===\n');

// Complete system: Coordinator -> Workers (supervised) -> Pub/Sub events

// Coordinator messages
const SubmitJobMsg = createMessage<'submitJob', { job: any; replyTo: Capability<any> }>(
  'submitJob'
);

const JobStatusMsg = createMessage<'jobStatus', { jobId: string; replyTo: Capability<any> }>(
  'jobStatus'
);

type CoordinatorMessage = MessageOf<typeof SubmitJobMsg> | MessageOf<typeof JobStatusMsg>;

// Job state
type JobState = 'pending' | 'processing' | 'completed' | 'failed';

type CoordinatorState = {
  jobs: Map<string, { status: JobState; workerId?: string; result?: any; error?: string }>;
  nextJobId: number;
};

// Coordinator reducer
const coordinatorReducer: Reducer<CoordinatorState, CoordinatorMessage> = (state, message) => {
  switch (message.type) {
    case 'submitJob': {
      const jobId = `job-${state.nextJobId}`;
      console.log(`  📥 Coordinator: Received job ${jobId}`);

      const newJobs = new Map(state.jobs);
      newJobs.set(jobId, { status: 'pending' });

      // Assign to worker (request/reply)
      const { requestMessage, pendingRequest } = createRequestReply(
        workerPoolCap as any,
        { taskId: jobId, data: message.job },
        'processTask'
      );

      // Update status to processing
      newJobs.set(jobId, { status: 'processing' });

      // Send to worker and handle response async
      (async () => {
        workerPoolCap.send(requestMessage);
        const response = await waitForResponse(pendingRequest, 200);

        if (isOk(response)) {
          console.log(`  ✅ Job ${jobId} completed`);
          eventBus.publish('job-events', {
            type: 'jobCompleted',
            jobId,
            result: response.value,
          });
        } else {
          console.log(`  ❌ Job ${jobId} failed: ${response.error}`);
          eventBus.publish('job-events', {
            type: 'jobFailed',
            jobId,
            error: response.error,
          });
        }
      })();

      return stay(
        {
          jobs: newJobs,
          nextJobId: state.nextJobId + 1,
        },
        coordinatorReducer,
        [emitTo(message.replyTo, Ok({ jobId, status: 'processing' }))]
      );
    }

    case 'jobStatus': {
      const job = state.jobs.get(message.jobId);

      if (!job) {
        return stay(state, coordinatorReducer, [
          emitTo(message.replyTo, Err(new Error('Job not found'))),
        ]);
      }

      return stay(state, coordinatorReducer, [
        emitTo(message.replyTo, Ok({ jobId: message.jobId, ...job })),
      ]);
    }
  }
};

// Create coordinator
const { capability: coordinatorCap } = createComponent(
  'urn:coordinator:main' as any,
  { jobs: new Map(), nextJobId: 1 } as CoordinatorState,
  coordinatorReducer
);

// Create worker pool (supervised)
const workerPoolReducer: Reducer<{}, WorkerMessage> = (state, message) => {
  // Simple load balancing - just process task
  return workerReducer(state, message);
};

const { capability: workerPoolCap } = createComponent(
  'urn:worker:pool' as any,
  {},
  workerPoolReducer
);

// Subscribe monitoring
const { capability: monitorCap } = createComponent(
  'urn:monitor:main' as any,
  { completed: 0, failed: 0 },
  (state, message: any) => {
    if (message.type === 'jobCompleted') {
      console.log(`  📈 Monitor: Job ${message.jobId} completed`);
      return stay({ ...state, completed: state.completed + 1 }, arguments.callee as any, []);
    } else if (message.type === 'jobFailed') {
      console.log(`  📉 Monitor: Job ${message.jobId} failed`);
      return stay({ ...state, failed: state.failed + 1 }, arguments.callee as any, []);
    }
    return stay(state, arguments.callee as any, []);
  }
);

eventBus.subscribe('job-events', monitorCap);

// Submit jobs
console.log('Submitting jobs to coordinator...\n');

const { capability: clientReplyCap } = createComponent(
  'urn:client:reply' as any,
  {},
  (state, message: any) => {
    if (message.success) {
      console.log(`  Client received: ${JSON.stringify(message.value)}`);
    }
    return stay(state, arguments.callee as any, []);
  }
);

for (let i = 1; i <= 5; i++) {
  coordinatorCap.send(
    SubmitJobMsg({
      job: { type: 'analysis', data: `data-${i}` },
      replyTo: clientReplyCap,
    })
  );

  await new Promise((resolve) => setTimeout(resolve, 100));
}

// Wait for processing
await new Promise((resolve) => setTimeout(resolve, 500));

console.log('\n=== Pattern Integration Examples Complete ===\n');

console.log('Patterns Demonstrated:\n');
console.log('1. Request/Reply: RPC-style communication between coordinator and workers');
console.log('2. Pub/Sub: Event distribution to analytics, logging, and monitoring');
console.log('3. Supervision: Automatic restart of failed workers');
console.log('4. Combined: Complete task processing system with all patterns\n');

console.log('Key Benefits:\n');
console.log('- Request/Reply provides synchronous-style RPC');
console.log('- Pub/Sub decouples event producers from consumers');
console.log('- Supervision ensures system resilience');
console.log('- All patterns compose cleanly together\n');
