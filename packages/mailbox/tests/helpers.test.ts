/**
 * Tests for Mailbox Helper Utilities
 */

import { test, expect } from 'bun:test';
import {
  createMailboxCapability,
  wrapComponentWithMailbox,
  createAutoProcessingCapability,
} from '../src/helpers.js';
import { createFIFOMailbox } from '../src/fifoMailbox.js';
import { createPriorityMailbox } from '../src/priorityMailbox.js';
import { createComponent, createURN, stay, createMessage } from '@servicejs/core';

type TestMsg = { type: 'test'; value: number };

test('createMailboxCapability queues messages', () => {
  const mailbox = createFIFOMailbox<TestMsg>();
  const received: number[] = [];

  const targetCap = {
    send: (msg: TestMsg) => {
      received.push(msg.value);
    },
  };

  const bufferedCap = createMailboxCapability(mailbox, targetCap);

  bufferedCap.send(createMessage('test', { value: 1 }));
  bufferedCap.send(createMessage('test', { value: 2 }));
  bufferedCap.send(createMessage('test', { value: 3 }));

  // Messages are queued, not processed
  expect(received).toEqual([]);
  expect(mailbox.size()).toBe(3);

  // Process messages manually
  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      targetCap.send(msg.value);
    }
  }

  expect(received).toEqual([1, 2, 3]);
});

test('wrapComponentWithMailbox with manual processing', () => {
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();

  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Send messages (they get queued)
  wrapped.capability.send(createMessage('increment', { amount: 1 }));
  wrapped.capability.send(createMessage('increment', { amount: 2 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));

  // Not processed yet
  expect(component.getState().count).toBe(0);
  expect(mailbox.size()).toBe(3);

  // Process all messages
  const processed = wrapped.processMessages();

  expect(processed).toBe(3);
  expect(component.getState().count).toBe(6);
  expect(mailbox.isEmpty()).toBe(true);
});

test('wrapComponentWithMailbox with auto-processing', () => {
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();

  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: true,
  });

  // Messages are automatically processed
  wrapped.capability.send(createMessage('increment', { amount: 1 }));
  wrapped.capability.send(createMessage('increment', { amount: 2 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));

  expect(component.getState().count).toBe(6);
  expect(mailbox.isEmpty()).toBe(true);
});

test('wrapComponentWithMailbox with batch processing', () => {
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();

  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: true,
    batchSize: 2,
  });

  // Send 5 messages
  wrapped.capability.send(createMessage('increment', { amount: 1 }));
  wrapped.capability.send(createMessage('increment', { amount: 2 }));
  wrapped.capability.send(createMessage('increment', { amount: 3 }));

  // With batch size 2 and 3 messages:
  // First send processes 2, second send processes 2, third send processes 2
  // But we only have 3 messages total, so all get processed
  expect(component.getState().count).toBe(6);
});

test('processBatch processes specified number of messages', () => {
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();

  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue 5 messages
  for (let i = 1; i <= 5; i++) {
    wrapped.capability.send(createMessage('increment', { amount: i }));
  }

  expect(mailbox.size()).toBe(5);

  // Process first 2
  const processed1 = wrapped.processBatch(2);
  expect(processed1).toBe(2);
  expect(component.getState().count).toBe(3); // 1 + 2
  expect(mailbox.size()).toBe(3);

  // Process next 2
  const processed2 = wrapped.processBatch(2);
  expect(processed2).toBe(2);
  expect(component.getState().count).toBe(10); // 1 + 2 + 3 + 4
  expect(mailbox.size()).toBe(1);

  // Try to process 5 but only 1 left
  const processed3 = wrapped.processBatch(5);
  expect(processed3).toBe(1);
  expect(component.getState().count).toBe(15); // 1 + 2 + 3 + 4 + 5
  expect(mailbox.isEmpty()).toBe(true);
});

test('createAutoProcessingCapability processes immediately', () => {
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'counter'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();
  const autoCap = createAutoProcessingCapability(mailbox, capability);

  // Messages are processed immediately
  autoCap.send(createMessage('increment', { amount: 1 }));
  expect(component.getState().count).toBe(1);

  autoCap.send(createMessage('increment', { amount: 2 }));
  expect(component.getState().count).toBe(3);

  autoCap.send(createMessage('increment', { amount: 3 }));
  expect(component.getState().count).toBe(6);

  expect(mailbox.isEmpty()).toBe(true);
});

test('wrapComponentWithMailbox works with priority mailbox', () => {
  type TaskState = { processed: number[] };
  type TaskMsg = { type: 'task'; id: number; priority: number };

  const reducer = (state: TaskState, msg: TaskMsg) => {
    return stay({ processed: [...state.processed, msg.id] }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('test', 'tasks'),
    { processed: [] },
    reducer
  );

  const mailbox = createPriorityMailbox<TaskMsg>((msg) => msg.priority);

  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue tasks in random order
  wrapped.capability.send(createMessage('task', { id: 1, priority: 5 }));
  wrapped.capability.send(createMessage('task', { id: 2, priority: 10 }));
  wrapped.capability.send(createMessage('task', { id: 3, priority: 1 }));
  wrapped.capability.send(createMessage('task', { id: 4, priority: 7 }));

  // Process all - should be in priority order
  wrapped.processMessages();

  expect(component.getState().processed).toEqual([2, 4, 1, 3]);
});
