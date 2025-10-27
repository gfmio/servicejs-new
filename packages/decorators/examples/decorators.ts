/**
 * Decorator Examples
 *
 * Demonstrates class-based component creation using decorators.
 */

import 'reflect-metadata';
import { createCapability, stay } from '@servicejs/core';
import { isOk } from '@servicejs/result';
import { Component, Handler, Inject, OnInit, OnShutdown, createComponentFromClass } from '../src/index.js';

// Example 1: Basic Counter with Decorators
console.log('\n=== Example 1: Basic Counter with Decorators ===\n');

interface CounterState {
  count: number;
}

interface CounterMessage {
  type: 'increment' | 'decrement' | 'reset';
  amount?: number;
}

@Component({ urn: 'urn:example:counter' })
class CounterComponent {
  @Handler('increment')
  handleIncrement(state: CounterState, message: CounterMessage): CounterState {
    const newCount = state.count + (message.amount || 1);
    console.log(`  Incrementing: ${state.count} → ${newCount}`);
    return { count: newCount };
  }

  @Handler('decrement')
  handleDecrement(state: CounterState, message: CounterMessage): CounterState {
    const newCount = state.count - (message.amount || 1);
    console.log(`  Decrementing: ${state.count} → ${newCount}`);
    return { count: newCount };
  }

  @Handler('reset')
  handleReset(): CounterState {
    console.log('  Resetting counter to 0');
    return { count: 0 };
  }
}

const counterResult = createComponentFromClass<CounterState, CounterMessage>(
  CounterComponent,
  { count: 0 }
);

if (isOk(counterResult)) {
  const { component, capability } = counterResult.value;

  capability.send({ type: 'increment', amount: 5 });
  capability.send({ type: 'increment', amount: 3 });
  capability.send({ type: 'decrement', amount: 2 });

  console.log(`Final count: ${component.getState().count}`);
}

// Example 2: Lifecycle Hooks
console.log('\n=== Example 2: Lifecycle Hooks ===\n');

interface ServiceState {
  initialized: boolean;
  connections: number;
}

interface ServiceMessage {
  type: 'connect' | 'disconnect';
}

@Component({ urn: 'urn:example:service' })
class ServiceComponent {
  @OnInit
  initialize() {
    console.log('  Service initializing...');
    console.log('  Loading configuration');
    console.log('  Connecting to database');
  }

  @Handler('connect')
  handleConnect(state: ServiceState): ServiceState {
    console.log('  New connection established');
    return { ...state, connections: state.connections + 1 };
  }

  @Handler('disconnect')
  handleDisconnect(state: ServiceState): ServiceState {
    console.log('  Connection closed');
    return { ...state, connections: state.connections - 1 };
  }

  @OnShutdown
  cleanup() {
    console.log('  Service shutting down...');
    console.log('  Closing database connections');
    console.log('  Cleanup complete');
  }
}

const serviceResult = createComponentFromClass<ServiceState, ServiceMessage>(
  ServiceComponent,
  { initialized: true, connections: 0 }
);

if (isOk(serviceResult)) {
  const { component, capability, instance } = serviceResult.value;

  capability.send({ type: 'connect' });
  capability.send({ type: 'connect' });
  capability.send({ type: 'disconnect' });

  console.log(`Active connections: ${component.getState().connections}`);

  // Call shutdown hook
  if (instance.__onShutdown) {
    instance.__onShutdown();
  }
}

// Example 3: Dependency Injection
console.log('\n=== Example 3: Dependency Injection ===\n');

interface LogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface DbMessage {
  type: 'query' | 'insert';
  data?: any;
}

interface UserServiceState {
  users: string[];
}

interface UserServiceMessage {
  type: 'createUser' | 'listUsers';
  username?: string;
}

// Create capabilities to inject
const loggerCapability = createCapability<LogMessage>((msg) => {
  console.log(`  [${msg.level.toUpperCase()}] ${msg.message}`);
});

const dbCapability = createCapability<DbMessage>((msg) => {
  console.log(`  [DB] ${msg.type}: ${JSON.stringify(msg.data || {})}`);
});

@Component({ urn: 'urn:example:user-service' })
class UserServiceComponent {
  constructor(
    @Inject('logger') private logger: typeof loggerCapability,
    @Inject('database') private db: typeof dbCapability
  ) {}

  @OnInit
  initialize() {
    this.logger.send({ type: 'log', level: 'info', message: 'UserService initialized' });
  }

  @Handler('createUser')
  handleCreateUser(state: UserServiceState, message: UserServiceMessage): UserServiceState {
    if (!message.username) {
      this.logger.send({ type: 'log', level: 'warn', message: 'No username provided' });
      return state;
    }

    this.logger.send({
      type: 'log',
      level: 'info',
      message: `Creating user: ${message.username}`,
    });

    this.db.send({
      type: 'insert',
      data: { username: message.username },
    });

    return {
      users: [...state.users, message.username],
    };
  }

  @Handler('listUsers')
  handleListUsers(state: UserServiceState): UserServiceState {
    this.logger.send({
      type: 'log',
      level: 'info',
      message: `Listing ${state.users.length} users`,
    });

    return state;
  }
}

const userServiceResult = createComponentFromClass<UserServiceState, UserServiceMessage>(
  UserServiceComponent,
  { users: [] },
  {
    capabilities: {
      logger: loggerCapability,
      database: dbCapability,
    },
  }
);

if (isOk(userServiceResult)) {
  const { component, capability } = userServiceResult.value;

  capability.send({ type: 'createUser', username: 'alice' });
  capability.send({ type: 'createUser', username: 'bob' });
  capability.send({ type: 'listUsers' });

  console.log(`\nTotal users: ${component.getState().users.length}`);
}

// Example 4: State Factory
console.log('\n=== Example 4: State Factory ===\n');

interface ConfigState {
  version: string;
  timestamp: number;
  settings: Record<string, any>;
}

interface ConfigMessage {
  type: 'update';
  key: string;
  value: any;
}

@Component({
  urn: 'urn:example:config',
  state: () => ({
    version: '1.0.0',
    timestamp: Date.now(),
    settings: { debug: true },
  }),
})
class ConfigComponent {
  @Handler('update')
  handleUpdate(state: ConfigState, message: ConfigMessage): ConfigState {
    console.log(`  Updating config: ${message.key} = ${message.value}`);
    return {
      ...state,
      settings: {
        ...state.settings,
        [message.key]: message.value,
      },
    };
  }
}

const configResult = createComponentFromClass<ConfigState, ConfigMessage>(
  ConfigComponent,
  { version: '0.0.0', timestamp: 0, settings: {} } // Will be overridden by state factory
);

if (isOk(configResult)) {
  const { component, capability } = configResult.value;

  console.log(`Initial version: ${component.getState().version}`);
  console.log(`Initial timestamp: ${component.getState().timestamp}`);

  capability.send({ type: 'update', key: 'theme', value: 'dark' });
  capability.send({ type: 'update', key: 'language', value: 'en' });

  console.log(`Settings:`, component.getState().settings);
}

// Example 5: Generic Message Handler
console.log('\n=== Example 5: Generic Message Handler ===\n');

interface LoggerState {
  logs: string[];
}

interface LoggerMessage {
  type: string;
  message: string;
}

@Component({ urn: 'urn:example:logger' })
class LoggerComponent {
  @Handler() // No type specified = handles all messages
  handleAny(state: LoggerState, message: LoggerMessage): LoggerState {
    const entry = `[${message.type}] ${message.message}`;
    console.log(`  ${entry}`);
    return {
      logs: [...state.logs, entry],
    };
  }
}

const loggerResult = createComponentFromClass<LoggerState, LoggerMessage>(
  LoggerComponent,
  { logs: [] }
);

if (isOk(loggerResult)) {
  const { component, capability } = loggerResult.value;

  capability.send({ type: 'info', message: 'Application started' });
  capability.send({ type: 'warn', message: 'Low memory' });
  capability.send({ type: 'error', message: 'Connection failed' });

  console.log(`\nTotal logs: ${component.getState().logs.length}`);
}

// Example 6: Complex State Transitions
console.log('\n=== Example 6: Complex State Transitions ===\n');

interface TaskState {
  tasks: Array<{ id: number; title: string; completed: boolean }>;
  nextId: number;
}

interface TaskMessage {
  type: 'add' | 'complete' | 'remove';
  id?: number;
  title?: string;
}

@Component({ urn: 'urn:example:tasks' })
class TaskComponent {
  @Handler('add')
  handleAdd(state: TaskState, message: TaskMessage): TaskState {
    if (!message.title) return state;

    console.log(`  Adding task: "${message.title}"`);
    return {
      tasks: [...state.tasks, { id: state.nextId, title: message.title, completed: false }],
      nextId: state.nextId + 1,
    };
  }

  @Handler('complete')
  handleComplete(state: TaskState, message: TaskMessage): TaskState {
    if (message.id === undefined) return state;

    console.log(`  Completing task #${message.id}`);
    return {
      ...state,
      tasks: state.tasks.map((task) =>
        task.id === message.id ? { ...task, completed: true } : task
      ),
    };
  }

  @Handler('remove')
  handleRemove(state: TaskState, message: TaskMessage): TaskState {
    if (message.id === undefined) return state;

    console.log(`  Removing task #${message.id}`);
    return {
      ...state,
      tasks: state.tasks.filter((task) => task.id !== message.id),
    };
  }
}

const taskResult = createComponentFromClass<TaskState, TaskMessage>(TaskComponent, {
  tasks: [],
  nextId: 1,
});

if (isOk(taskResult)) {
  const { component, capability } = taskResult.value;

  capability.send({ type: 'add', title: 'Write documentation' });
  capability.send({ type: 'add', title: 'Add tests' });
  capability.send({ type: 'add', title: 'Deploy' });
  capability.send({ type: 'complete', id: 1 });
  capability.send({ type: 'remove', id: 2 });

  const { tasks } = component.getState();
  console.log(`\nRemaining tasks: ${tasks.length}`);
  tasks.forEach((task) => {
    console.log(`  [${task.completed ? '✓' : ' '}] ${task.title}`);
  });
}

console.log('\n✓ All decorator examples completed');
