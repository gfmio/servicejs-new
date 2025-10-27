/**
 * Builder Examples
 *
 * Demonstrates component creation using the fluent ComponentBuilder API.
 */

import { stay } from '@servicejs/core';
import { createComponentBuilder } from '../src/index.js';

// Example 1: Basic Counter with Builder
console.log('\n=== Example 1: Basic Counter with Builder ===\n');

interface CounterState {
  count: number;
}

interface CounterMessage {
  type: 'increment' | 'decrement' | 'reset';
  amount?: number;
}

const counterReducer = (state: CounterState, message: CounterMessage) => {
  switch (message.type) {
    case 'increment':
      const newCount = state.count + (message.amount || 1);
      console.log(`  Incrementing: ${state.count} → ${newCount}`);
      return stay({ count: newCount }, counterReducer);
    case 'decrement':
      const decrementedCount = state.count - (message.amount || 1);
      console.log(`  Decrementing: ${state.count} → ${decrementedCount}`);
      return stay({ count: decrementedCount }, counterReducer);
    case 'reset':
      console.log('  Resetting counter to 0');
      return stay({ count: 0 }, counterReducer);
    default:
      return stay(state, counterReducer);
  }
};

const { component: counter1, capability: counterCap1 } = createComponentBuilder<
  CounterState,
  CounterMessage
>()
  .withURN('urn:example:builder-counter')
  .withState({ count: 0 })
  .withReducer(counterReducer)
  .build();

counterCap1.send({ type: 'increment', amount: 5 });
counterCap1.send({ type: 'increment', amount: 3 });
counterCap1.send({ type: 'decrement', amount: 2 });

console.log(`Final count: ${counter1.getState().count}`);

// Example 2: Builder with Lifecycle Hooks
console.log('\n=== Example 2: Builder with Lifecycle Hooks ===\n');

interface ServiceState {
  initialized: boolean;
  connections: number;
}

interface ServiceMessage {
  type: 'connect' | 'disconnect';
}

const serviceReducer = (state: ServiceState, message: ServiceMessage) => {
  switch (message.type) {
    case 'connect':
      console.log('  New connection established');
      return stay({ ...state, connections: state.connections + 1 }, serviceReducer);
    case 'disconnect':
      console.log('  Connection closed');
      return stay({ ...state, connections: state.connections - 1 }, serviceReducer);
    default:
      return stay(state, serviceReducer);
  }
};

const { component: service, capability: serviceCap } = createComponentBuilder<
  ServiceState,
  ServiceMessage
>()
  .withURN('urn:example:builder-service')
  .withState({ initialized: false, connections: 0 })
  .withReducer(serviceReducer)
  .withLifecycle({
    onInit: () => {
      console.log('  Service initializing...');
      console.log('  Loading configuration');
      console.log('  Connecting to database');
    },
    onShutdown: () => {
      console.log('  Service shutting down...');
      console.log('  Closing connections');
      console.log('  Cleanup complete');
    },
  })
  .build();

serviceCap.send({ type: 'connect' });
serviceCap.send({ type: 'connect' });
serviceCap.send({ type: 'disconnect' });

console.log(`Active connections: ${service.getState().connections}`);

// Example 3: Task Manager with Builder
console.log('\n=== Example 3: Task Manager with Builder ===\n');

interface TaskState {
  tasks: Array<{ id: number; title: string; completed: boolean }>;
  nextId: number;
}

interface TaskMessage {
  type: 'add' | 'complete' | 'remove';
  id?: number;
  title?: string;
}

const taskReducer = (state: TaskState, message: TaskMessage) => {
  switch (message.type) {
    case 'add':
      if (!message.title) return stay(state, taskReducer);
      console.log(`  Adding task: "${message.title}"`);
      return stay(
        {
          tasks: [...state.tasks, { id: state.nextId, title: message.title, completed: false }],
          nextId: state.nextId + 1,
        },
        taskReducer
      );
    case 'complete':
      if (message.id === undefined) return stay(state, taskReducer);
      console.log(`  Completing task #${message.id}`);
      return stay(
        {
          ...state,
          tasks: state.tasks.map((task) =>
            task.id === message.id ? { ...task, completed: true } : task
          ),
        },
        taskReducer
      );
    case 'remove':
      if (message.id === undefined) return stay(state, taskReducer);
      console.log(`  Removing task #${message.id}`);
      return stay(
        {
          ...state,
          tasks: state.tasks.filter((task) => task.id !== message.id),
        },
        taskReducer
      );
    default:
      return stay(state, taskReducer);
  }
};

const { component: taskManager, capability: taskCap } = createComponentBuilder<
  TaskState,
  TaskMessage
>()
  .withURN('urn:example:builder-tasks')
  .withState({ tasks: [], nextId: 1 })
  .withReducer(taskReducer)
  .build();

taskCap.send({ type: 'add', title: 'Write documentation' });
taskCap.send({ type: 'add', title: 'Add tests' });
taskCap.send({ type: 'add', title: 'Deploy' });
taskCap.send({ type: 'complete', id: 1 });
taskCap.send({ type: 'remove', id: 2 });

const { tasks } = taskManager.getState();
console.log(`\nRemaining tasks: ${tasks.length}`);
tasks.forEach((task) => {
  console.log(`  [${task.completed ? '✓' : ' '}] ${task.title}`);
});

// Example 4: State Machine with Builder
console.log('\n=== Example 4: State Machine with Builder ===\n');

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ConnectionState {
  status: ConnectionStatus;
  retries: number;
  lastError?: string;
}

interface ConnectionMessage {
  type: 'connect' | 'connected' | 'disconnect' | 'error';
  error?: string;
}

const connectionReducer = (state: ConnectionState, message: ConnectionMessage) => {
  console.log(`  ${state.status} + ${message.type}`);

  switch (message.type) {
    case 'connect':
      if (state.status === 'disconnected' || state.status === 'error') {
        console.log(`  → connecting (attempt ${state.retries + 1})`);
        return stay(
          { status: 'connecting', retries: state.retries + 1 },
          connectionReducer
        );
      }
      return stay(state, connectionReducer);

    case 'connected':
      if (state.status === 'connecting') {
        console.log('  → connected');
        return stay({ status: 'connected', retries: 0 }, connectionReducer);
      }
      return stay(state, connectionReducer);

    case 'disconnect':
      console.log('  → disconnected');
      return stay({ status: 'disconnected', retries: 0 }, connectionReducer);

    case 'error':
      console.log(`  → error: ${message.error}`);
      return stay(
        {
          status: 'error',
          retries: state.retries,
          lastError: message.error,
        },
        connectionReducer
      );

    default:
      return stay(state, connectionReducer);
  }
};

const { component: connection, capability: connectionCap } = createComponentBuilder<
  ConnectionState,
  ConnectionMessage
>()
  .withURN('urn:example:builder-connection')
  .withState({ status: 'disconnected', retries: 0 })
  .withReducer(connectionReducer)
  .build();

connectionCap.send({ type: 'connect' });
connectionCap.send({ type: 'connected' });
connectionCap.send({ type: 'error', error: 'Network timeout' });
connectionCap.send({ type: 'connect' });
connectionCap.send({ type: 'connected' });
connectionCap.send({ type: 'disconnect' });

console.log(`\nFinal status: ${connection.getState().status}`);

console.log('\n✓ All builder examples completed');
