/**
 * Complete Application Integration Example
 *
 * A task management system that demonstrates integration of:
 * - @servicejs/core (components, reducers, capabilities)
 * - @servicejs/mailbox (FIFO and Priority mailboxes)
 * - @servicejs/request-reply (RPC-style queries)
 * - @servicejs/pub-sub (event broadcasting)
 *
 * Architecture:
 * - TaskStore: Manages task storage (uses FIFO mailbox for sequential writes)
 * - TaskScheduler: Processes tasks by priority (uses Priority mailbox)
 * - EventBus: Broadcasts task events to subscribers
 * - QueryService: Handles read queries via request/reply
 */

import {
  createComponent,
  createURN,
  stay,
  emitTo,
  createCapability,
  createMessage,
  type MessageOf,
  type Capability,
} from '@servicejs/core';
import { createFIFOMailbox, createPriorityMailbox } from '@servicejs/mailbox';
import { createPubSub } from '@servicejs/pub-sub';
import {
  createRequestReply,
  createReply,
  type RequestMessage,
} from '@servicejs/request-reply';

//=============================================================================
// Domain Types
//=============================================================================

type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

type Task = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
};

//=============================================================================
// Event Messages
//=============================================================================

type TaskEventMsg = MessageOf<
  'task-event',
  {
    event: 'task.created' | 'task.started' | 'task.completed' | 'task.failed';
    taskId: string;
    task?: Task;
  }
>;

//=============================================================================
// Task Store Component (with FIFO Mailbox)
//=============================================================================

type StoreState = {
  tasks: Map<string, Task>;
};

type StoreMsg =
  | MessageOf<'create-task', { task: Task }>
  | MessageOf<'update-task', { taskId: string; updates: Partial<Task> }>;

const createTaskStore = (eventBus: Capability<TaskEventMsg>) => {
  const storeReducer = (state: StoreState, msg: StoreMsg) => {
    switch (msg.type) {
      case 'create-task': {
        const newTasks = new Map(state.tasks);
        newTasks.set(msg.task.id, msg.task);

        return stay({ tasks: newTasks }, storeReducer, [
          emitTo(
            eventBus,
            createMessage('task-event', {
              event: 'task.created',
              taskId: msg.task.id,
              task: msg.task,
            })
          ),
        ]);
      }

      case 'update-task': {
        const task = state.tasks.get(msg.taskId);
        if (!task) {
          return stay(state, storeReducer);
        }

        const updatedTask = { ...task, ...msg.updates };
        const newTasks = new Map(state.tasks);
        newTasks.set(msg.taskId, updatedTask);

        const eventType =
          updatedTask.status === 'completed'
            ? 'task.completed'
            : updatedTask.status === 'failed'
              ? 'task.failed'
              : updatedTask.status === 'running'
                ? 'task.started'
                : ('task.created' as const);

        return stay({ tasks: newTasks }, storeReducer, [
          emitTo(
            eventBus,
            createMessage('task-event', {
              event: eventType,
              taskId: msg.taskId,
              task: updatedTask,
            })
          ),
        ]);
      }

      default:
        return stay(state, storeReducer);
    }
  };

  const { component, capability } = createComponent(
    createURN('app', 'task-store'),
    { tasks: new Map<string, Task>() },
    storeReducer
  );

  // Wrap capability with FIFO mailbox for sequential writes
  const mailbox = createFIFOMailbox<StoreMsg>();

  return {
    component,
    enqueue: (msg: StoreMsg) => {
      mailbox.enqueue(msg);
    },
    processPendingWrites: () => {
      while (!mailbox.isEmpty()) {
        const msg = mailbox.dequeue();
        if (msg.isSome()) {
          capability.send(msg.value);
        }
      }
    },
    getState: () => component.getState(),
  };
};

//=============================================================================
// Task Scheduler Component (with Priority Mailbox)
//=============================================================================

type SchedulerState = {
  running: Set<string>;
  completed: Set<string>;
};

type SchedulerMsg = MessageOf<
  'schedule-task',
  {
    task: Task;
    onComplete: Capability<MessageOf<'task-result', { taskId: string; success: boolean }>>;
  }
>;

const priorityValue: Record<TaskPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
};

const createTaskScheduler = () => {
  const schedulerReducer = (state: SchedulerState, msg: SchedulerMsg) => {
    if (msg.type === 'schedule-task') {
      const { task, onComplete } = msg;

      console.log(`  [SCHEDULER] Processing task: ${task.title} (${task.priority})`);

      // Simulate task execution
      const success = Math.random() > 0.2; // 80% success rate

      const newState = {
        running: new Set(state.running),
        completed: new Set([...state.completed, task.id]),
      };
      newState.running.delete(task.id);

      return stay(newState, schedulerReducer, [
        emitTo(
          onComplete,
          createMessage('task-result', { taskId: task.id, success })
        ),
      ]);
    }

    return stay(state, schedulerReducer);
  };

  const { component, capability } = createComponent(
    createURN('app', 'task-scheduler'),
    { running: new Set<string>(), completed: new Set<string>() },
    schedulerReducer
  );

  // Wrap with priority mailbox
  const mailbox = createPriorityMailbox<SchedulerMsg>(
    (msg) => priorityValue[msg.task.priority]
  );

  return {
    component,
    schedule: (msg: SchedulerMsg) => {
      mailbox.enqueue(msg);
    },
    processNextTask: () => {
      const msg = mailbox.dequeue();
      if (msg.isSome()) {
        capability.send(msg.value);
        return true;
      }
      return false;
    },
    hasPendingTasks: () => !mailbox.isEmpty(),
    pendingCount: () => mailbox.size(),
  };
};

//=============================================================================
// Query Service (Request/Reply)
//=============================================================================

type QueryRequest = { type: 'get-task'; taskId: string } | { type: 'list-tasks' };
type QueryResponse = { found: true; task: Task } | { found: false } | { tasks: Task[] };
type QueryResponseMsg = MessageOf<'query-response', QueryResponse>;

const createQueryService = (store: ReturnType<typeof createTaskStore>) => {
  const queryReducer = (
    state: {},
    msg: RequestMessage<QueryRequest, QueryResponseMsg>
  ) => {
    const request = msg.request;

    if (request.type === 'get-task') {
      const task = store.getState().tasks.get(request.taskId);
      const response: QueryResponse = task
        ? { found: true, task }
        : { found: false };

      const reply: any = createReply(msg, response);
      reply.type = 'query-response';

      return stay(state, queryReducer, [
        emitTo(msg.replyTo as Capability<QueryResponseMsg>, reply),
      ]);
    }

    if (request.type === 'list-tasks') {
      const tasks = Array.from(store.getState().tasks.values());
      const response: QueryResponse = { tasks };

      const reply: any = createReply(msg, response);
      reply.type = 'query-response';

      return stay(state, queryReducer, [
        emitTo(msg.replyTo as Capability<QueryResponseMsg>, reply),
      ]);
    }

    return stay(state, queryReducer);
  };

  const { capability } = createComponent(
    createURN('app', 'query-service'),
    {},
    queryReducer
  );

  return capability;
};

//=============================================================================
// Application
//=============================================================================

console.log('=== Task Management System ===\n');

// Create event bus
const eventBus = createPubSub<TaskEventMsg>();

// Subscribe logger to all events
eventBus.subscribe(
  'task.events',
  createCapability((msg) => {
    console.log(`  [EVENT] ${msg.event}: ${msg.taskId}`);
  })
);

// Create components
const store = createTaskStore(
  createCapability((msg) => {
    eventBus.publish('task.events', msg);
  })
);

const scheduler = createTaskScheduler();

// Create task completion handler
const taskCompletionHandler = createCapability<
  MessageOf<'task-result', { taskId: string; success: boolean }>
>((msg) => {
  store.enqueue(
    createMessage('update-task', {
      taskId: msg.taskId,
      updates: {
        status: msg.success ? 'completed' : 'failed',
        completedAt: Date.now(),
      },
    })
  );
  store.processPendingWrites();
});

// Create query service
const queryService = createQueryService(store);

//=============================================================================
// Scenario: Create and Process Tasks
//=============================================================================

console.log('Phase 1: Creating tasks\n');

const tasks: Task[] = [
  {
    id: 'task-1',
    title: 'Fix critical bug',
    priority: 'critical',
    status: 'pending',
    createdAt: Date.now(),
  },
  {
    id: 'task-2',
    title: 'Update documentation',
    priority: 'low',
    status: 'pending',
    createdAt: Date.now(),
  },
  {
    id: 'task-3',
    title: 'Deploy to production',
    priority: 'high',
    status: 'pending',
    createdAt: Date.now(),
  },
  {
    id: 'task-4',
    title: 'Code review',
    priority: 'normal',
    status: 'pending',
    createdAt: Date.now(),
  },
  {
    id: 'task-5',
    title: 'Security patch',
    priority: 'critical',
    status: 'pending',
    createdAt: Date.now(),
  },
];

// Create tasks (queued in FIFO mailbox)
tasks.forEach((task) => {
  console.log(`Creating task: ${task.title} [${task.priority}]`);
  store.enqueue(createMessage('create-task', { task }));
});

// Process writes
console.log('\nProcessing task creation...\n');
store.processPendingWrites();

// Schedule all tasks (queued in Priority mailbox)
console.log('\nPhase 2: Scheduling tasks\n');
tasks.forEach((task) => {
  scheduler.schedule(
    createMessage('schedule-task', {
      task,
      onComplete: taskCompletionHandler,
    })
  );
});

console.log(`Tasks queued: ${scheduler.pendingCount()}`);
console.log('Tasks will be processed by priority (critical > high > normal > low)\n');

// Process tasks by priority
console.log('Phase 3: Processing tasks\n');
while (scheduler.hasPendingTasks()) {
  scheduler.processNextTask();
}

//=============================================================================
// Scenario: Query Tasks
//=============================================================================

console.log('\nPhase 4: Querying task status\n');

// Query specific task
console.log('Querying task "task-1"...');
const getResp = createCapability<QueryResponseMsg>((msg) => {
  if ('found' in msg.response) {
    if (msg.response.found) {
      console.log(`  ✓ Found: ${msg.response.task.title}`);
      console.log(`    Status: ${msg.response.task.status}`);
    } else {
      console.log(`  ✗ Not found`);
    }
  }
});

const getReq = createRequestReply<QueryRequest, QueryResponse, QueryResponseMsg>(
  { type: 'get-task', taskId: 'task-1' },
  getResp
);
queryService.send(getReq.requestMessage);

// List all tasks
console.log('\nQuerying all tasks...');
const listResp = createCapability<QueryResponseMsg>((msg) => {
  if ('tasks' in msg.response) {
    console.log(`  Found ${msg.response.tasks.length} tasks:`);
    msg.response.tasks.forEach((task) => {
      const status = task.status === 'completed' ? '✓' : task.status === 'failed' ? '✗' : '○';
      console.log(`    ${status} ${task.title} [${task.priority}] - ${task.status}`);
    });
  }
});

const listReq = createRequestReply<QueryRequest, QueryResponse, QueryResponseMsg>(
  { type: 'list-tasks' },
  listResp
);
queryService.send(listReq.requestMessage);

//=============================================================================
// Summary
//=============================================================================

console.log('\n=== Summary ===\n');
console.log('Components used:');
console.log('  ✓ TaskStore (with FIFO mailbox for sequential writes)');
console.log('  ✓ TaskScheduler (with Priority mailbox for task prioritization)');
console.log('  ✓ EventBus (pub/sub for event broadcasting)');
console.log('  ✓ QueryService (request/reply for queries)');
console.log('');
console.log('Patterns demonstrated:');
console.log('  ✓ Message-passing components with reducers');
console.log('  ✓ FIFO mailbox for ordered operations');
console.log('  ✓ Priority mailbox for task scheduling');
console.log('  ✓ Pub/sub for decoupled event handling');
console.log('  ✓ Request/reply for synchronous queries');

console.log('\n=== Complete Application Example Finished ===');
