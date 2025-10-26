/**
 * Integration Tests for Mailboxes with Components
 */

import { test, expect } from 'bun:test';
import {
  createFIFOMailbox,
  createPriorityMailbox,
  createBoundedMailbox,
  wrapComponentWithMailbox,
} from '../src/index.js';
import { createComponent, createURN, stay, emitTo, createMessage } from '@servicejs/core';

// Counter component
type CounterState = { count: number; history: string[] };
type CounterMsg =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

const counterReducer = (state: CounterState, msg: CounterMsg) => {
  switch (msg.type) {
    case 'increment':
      return stay(
        {
          count: state.count + msg.amount,
          history: [...state.history, `+${msg.amount}`],
        },
        counterReducer
      );
    case 'decrement':
      return stay(
        {
          count: state.count - msg.amount,
          history: [...state.history, `-${msg.amount}`],
        },
        counterReducer
      );
    case 'reset':
      return stay(
        { count: 0, history: [...state.history, 'reset'] },
        counterReducer
      );
    default:
      return stay(state, counterReducer);
  }
};

test('FIFO mailbox with counter component ensures order', () => {
  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0, history: [] },
    counterReducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue operations
  wrapped.capability.send(createMessage('increment', { amount: 5 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));
  wrapped.capability.send(createMessage('decrement', { amount: 2 }));
  wrapped.capability.send(createMessage('reset', {}));
  wrapped.capability.send(createMessage('increment', { amount: 10 }));

  // Process all
  wrapped.processMessages();

  expect(component.getState().count).toBe(10);
  expect(component.getState().history).toEqual(['+5', '+3', '-2', 'reset', '+10']);
});

test('Priority mailbox with component processes high priority first', () => {
  type TaskState = { executed: string[] };
  type TaskMsg = {
    type: 'task';
    name: string;
    priority: number;
  };

  const taskReducer = (state: TaskState, msg: TaskMsg) => {
    return stay({ executed: [...state.executed, msg.name] }, taskReducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'tasks'),
    { executed: [] },
    taskReducer
  );

  const mailbox = createPriorityMailbox<TaskMsg>((msg) => msg.priority);
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue tasks with different priorities
  wrapped.capability.send(createMessage('task', { name: 'Low', priority: 1 }));
  wrapped.capability.send(createMessage('task', { name: 'High', priority: 10 }));
  wrapped.capability.send(createMessage('task', { name: 'Medium', priority: 5 }));
  wrapped.capability.send(createMessage('task', { name: 'Critical', priority: 20 }));

  // Process all
  wrapped.processMessages();

  expect(component.getState().executed).toEqual(['Critical', 'High', 'Medium', 'Low']);
});

test('Bounded mailbox with component provides backpressure', () => {
  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0, history: [] },
    counterReducer
  );

  const mailbox = createBoundedMailbox<CounterMsg>(3); // Max 3 messages
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Try to queue 5 messages
  wrapped.capability.send(createMessage('increment', { amount: 1 }));
  wrapped.capability.send(createMessage('increment', { amount: 2 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));

  expect(mailbox.size()).toBe(3);
  expect(mailbox.isFull()).toBe(true);

  // These should be dropped/rejected due to capacity
  wrapped.capability.send(createMessage('increment', { amount: 4 }));
  wrapped.capability.send(createMessage('increment', { amount: 5 }));

  expect(mailbox.size()).toBe(3); // Still only 3

  // Process some
  wrapped.processBatch(2);
  expect(component.getState().count).toBe(3); // 1 + 2

  // Now there's room
  expect(mailbox.isFull()).toBe(false);

  // Process remaining
  wrapped.processMessages();
  expect(component.getState().count).toBe(6); // 1 + 2 + 3
});

test('Component with effects and FIFO mailbox', () => {
  type State = { count: number };
  type Msg = { type: 'increment'; amount: number; notify?: boolean };

  let notifications: string[] = [];
  const notifyCap = {
    send: (msg: any) => {
      notifications.push(msg.text);
    },
  };

  const reducer = (state: State, msg: Msg) => {
    const newCount = state.count + msg.amount;
    const effects = msg.notify
      ? [emitTo(notifyCap, createMessage('notify', { text: `Count is now ${newCount}` }))]
      : [];

    return stay({ count: newCount }, reducer, effects);
  };

  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<Msg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue operations with effects
  wrapped.capability.send(createMessage('increment', { amount: 5, notify: true }));
  wrapped.capability.send(createMessage('increment', { amount: 3, notify: false }));
  wrapped.capability.send(createMessage('increment', { amount: 2, notify: true }));

  // Process all
  wrapped.processMessages();

  expect(component.getState().count).toBe(10);
  expect(notifications).toEqual(['Count is now 5', 'Count is now 10']);
});

test('Auto-processing with FIFO mailbox ensures sequential execution', () => {
  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0, history: [] },
    counterReducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: true, // Auto-process
  });

  // All operations processed immediately in order
  wrapped.capability.send(createMessage('increment', { amount: 1 }));
  wrapped.capability.send(createMessage('increment', { amount: 2 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));

  expect(component.getState().count).toBe(6);
  expect(component.getState().history).toEqual(['+1', '+2', '+3']);
  expect(mailbox.isEmpty()).toBe(true);
});

test('Multiple components with shared mailbox', () => {
  // Component 1: Counter
  const counter = createComponent(
    createURN('test', 'counter'),
    { count: 0, history: [] },
    counterReducer
  );

  // Component 2: Logger
  type LogState = { logs: string[] };
  type LogMsg = { type: 'log'; message: string };

  const logReducer = (state: LogState, msg: LogMsg) => {
    return stay({ logs: [...state.logs, msg.message] }, logReducer);
  };

  const logger = createComponent(
    createURN('test', 'logger'),
    { logs: [] },
    logReducer
  );

  // Separate mailboxes for each component
  const counterMailbox = createFIFOMailbox<CounterMsg>();
  const loggerMailbox = createFIFOMailbox<LogMsg>();

  const wrappedCounter = wrapComponentWithMailbox(counterMailbox, counter.capability, {
    autoProcess: false,
  });

  const wrappedLogger = wrapComponentWithMailbox(loggerMailbox, logger.capability, {
    autoProcess: false,
  });

  // Queue operations to both
  wrappedCounter.capability.send(createMessage('increment', { amount: 5 }));
  wrappedLogger.capability.send(createMessage('log', { message: 'Counter incremented' }));
  wrappedCounter.capability.send(createMessage('decrement', { amount: 2 }));
  wrappedLogger.capability.send(createMessage('log', { message: 'Counter decremented' }));

  // Process both mailboxes
  wrappedCounter.processMessages();
  wrappedLogger.processMessages();

  expect(counter.component.getState().count).toBe(3);
  expect(logger.component.getState().logs).toEqual([
    'Counter incremented',
    'Counter decremented',
  ]);
});

test('Component state machine with mailbox', () => {
  type State = { mode: 'idle' | 'running'; count: number };
  type Msg =
    | { type: 'start' }
    | { type: 'stop' }
    | { type: 'increment'; amount: number };

  const idleReducer = (state: State, msg: Msg) => {
    if (msg.type === 'start') {
      return stay({ ...state, mode: 'running' as const }, runningReducer);
    }
    return stay(state, idleReducer);
  };

  const runningReducer = (state: State, msg: Msg) => {
    if (msg.type === 'stop') {
      return stay({ ...state, mode: 'idle' as const }, idleReducer);
    }
    if (msg.type === 'increment') {
      return stay({ ...state, count: state.count + msg.amount }, runningReducer);
    }
    return stay(state, runningReducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'state-machine'),
    { mode: 'idle' as const, count: 0 },
    idleReducer
  );

  const mailbox = createFIFOMailbox<Msg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue state transitions
  wrapped.capability.send(createMessage('start', {}));
  wrapped.capability.send(createMessage('increment', { amount: 5 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));
  wrapped.capability.send(createMessage('stop', {}));
  wrapped.capability.send(createMessage('increment', { amount: 1 })); // Should be ignored in idle mode

  // Process all
  wrapped.processMessages();

  expect(component.getState().mode).toBe('idle');
  expect(component.getState().count).toBe(8); // Only increments while running
});
