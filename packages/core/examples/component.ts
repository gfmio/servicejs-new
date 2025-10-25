/**
 * Component Examples
 *
 * Components tie together URN, state, reducer, and capability.
 * They encapsulate behavior and expose a capability for interaction.
 */

import { createComponent, type Component } from '../src/component.js';
import { createURN } from '../src/urn.js';
import { stay, become, type Reducer } from '../src/reducer.js';
import { emitTo, batch } from '../src/effect.js';
import { createMessage, type MessageOf } from '../src/message.js';

// Example 1: Basic Counter Component
console.log('=== Example 1: Basic Counter ===');
{
  type State = { count: number };
  type Msg = MessageOf<'increment', { amount: number }> | MessageOf<'decrement', { amount: number }>;

  const counterReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'increment') {
      return stay({ count: state.count + msg.amount }, counterReducer);
    }
    if (msg.type === 'decrement') {
      return stay({ count: state.count - msg.amount }, counterReducer);
    }
    return stay(state, counterReducer);
  };

  const { component, capability } = createComponent(
    createURN('example', 'counter-1'),
    { count: 0 },
    counterReducer
  );

  console.log('Initial state:', component.getState());

  capability.send(createMessage('increment', { amount: 5 }));
  console.log('After +5:', component.getState());

  capability.send(createMessage('increment', { amount: 3 }));
  console.log('After +3:', component.getState());

  capability.send(createMessage('decrement', { amount: 2 }));
  console.log('After -2:', component.getState());

  console.log('Component URN:', component.urn.toString());
}

// Example 2: State Machine Component (Traffic Light)
console.log('\n=== Example 2: State Machine (Traffic Light) ===');
{
  type State = { light: 'red' | 'yellow' | 'green'; duration: number };
  type Msg = MessageOf<'next', {}>;

  const redReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'next') {
      console.log('  Red -> Green');
      return become({ light: 'green', duration: 30 }, greenReducer);
    }
    return stay(state, redReducer);
  };

  const greenReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'next') {
      console.log('  Green -> Yellow');
      return become({ light: 'yellow', duration: 5 }, yellowReducer);
    }
    return stay(state, greenReducer);
  };

  const yellowReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'next') {
      console.log('  Yellow -> Red');
      return become({ light: 'red', duration: 30 }, redReducer);
    }
    return stay(state, yellowReducer);
  };

  const { component, capability } = createComponent(
    createURN('example', 'traffic-light-1'),
    { light: 'red' as const, duration: 30 },
    redReducer
  );

  console.log('Initial:', component.getState().light);

  capability.send(createMessage('next', {}));
  console.log('Current:', component.getState().light);

  capability.send(createMessage('next', {}));
  console.log('Current:', component.getState().light);

  capability.send(createMessage('next', {}));
  console.log('Current:', component.getState().light);
}

// Example 3: Component with Effects (Logger + Counter)
console.log('\n=== Example 3: Component with Effects ===');
{
  type LogState = { logs: string[] };
  type LogMsg = MessageOf<'log', { text: string }>;

  const loggerReducer: Reducer<LogState, LogMsg> = (state, msg) => {
    if (msg.type === 'log') {
      console.log(`  [LOG] ${msg.text}`);
      return stay({ logs: [...state.logs, msg.text] }, loggerReducer);
    }
    return stay(state, loggerReducer);
  };

  const { component: logger, capability: logCap } = createComponent(
    createURN('example', 'logger-1'),
    { logs: [] },
    loggerReducer
  );

  // Counter that logs its changes
  type CounterState = { count: number };
  type CounterMsg = MessageOf<'increment', { amount: number }>;

  const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
    if (msg.type === 'increment') {
      const newCount = state.count + msg.amount;
      const effects = [
        emitTo(logCap, createMessage('log', { text: `Count updated to ${newCount}` })),
      ];
      return stay({ count: newCount }, counterReducer, effects);
    }
    return stay(state, counterReducer);
  };

  const { component: counter, capability: counterCap } = createComponent(
    createURN('example', 'counter-2'),
    { count: 0 },
    counterReducer
  );

  console.log('Sending increment messages:');
  counterCap.send(createMessage('increment', { amount: 5 }));
  counterCap.send(createMessage('increment', { amount: 3 }));
  counterCap.send(createMessage('increment', { amount: 7 }));

  console.log('\nFinal counter state:', counter.getState());
  console.log('Logger collected logs:', logger.getState().logs);
}

// Example 4: Multi-Component System (Chat Room)
console.log('\n=== Example 4: Multi-Component System ===');
{
  type UserMsg = MessageOf<'message', { from: string; text: string }>;
  type RoomMsg = MessageOf<'broadcast', { from: string; text: string }> | UserMsg;

  // Chat room component
  type RoomState = { messages: Array<{ from: string; text: string }> };

  const roomReducer: Reducer<RoomState, RoomMsg> = (state, msg) => {
    if (msg.type === 'broadcast') {
      console.log(`  [ROOM] ${msg.from}: ${msg.text}`);
      return stay(
        { messages: [...state.messages, { from: msg.from, text: msg.text }] },
        roomReducer
      );
    }
    return stay(state, roomReducer);
  };

  const { component: room, capability: roomCap } = createComponent(
    createURN('chat', 'room-general'),
    { messages: [] },
    roomReducer
  );

  // User components
  type UserState = { name: string; inbox: string[] };

  const createUserReducer = (name: string, roomCap: any): Reducer<UserState, UserMsg> => {
    return (state, msg) => {
      if (msg.type === 'message') {
        console.log(`  [${state.name}] Received: "${msg.text}" from ${msg.from}`);
        return stay(
          { ...state, inbox: [...state.inbox, `${msg.from}: ${msg.text}`] },
          createUserReducer(name, roomCap)
        );
      }
      return stay(state, createUserReducer(name, roomCap));
    };
  };

  const { component: alice, capability: aliceCap } = createComponent(
    createURN('chat', 'user-alice'),
    { name: 'Alice', inbox: [] },
    createUserReducer('Alice', roomCap)
  );

  const { component: bob, capability: bobCap } = createComponent(
    createURN('chat', 'user-bob'),
    { name: 'Bob', inbox: [] },
    createUserReducer('Bob', roomCap)
  );

  // Simulate chat
  console.log('Chat simulation:');
  roomCap.send(createMessage('broadcast', { from: 'Alice', text: 'Hello everyone!' }));
  roomCap.send(createMessage('broadcast', { from: 'Bob', text: 'Hi Alice!' }));
  roomCap.send(createMessage('broadcast', { from: 'Alice', text: 'How are you?' }));

  console.log('\nRoom messages:', room.getState().messages.length);
}

// Example 5: Session Type Protocol
console.log('\n=== Example 5: Session Type Protocol ===');
{
  type State =
    | { phase: 'init' }
    | { phase: 'authenticated'; user: string }
    | { phase: 'active'; user: string; data: string[] }
    | { phase: 'closed' };

  type Msg =
    | MessageOf<'login', { username: string }>
    | MessageOf<'load-data', {}>
    | MessageOf<'add-data', { item: string }>
    | MessageOf<'logout', {}>;

  const initReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'login') {
      console.log(`  Logged in as ${msg.username}`);
      return become({ phase: 'authenticated', user: msg.username }, authenticatedReducer);
    }
    console.log(`  ERROR: Must login first, got ${msg.type}`);
    return stay(state, initReducer);
  };

  const authenticatedReducer: Reducer<State, Msg> = (state, msg) => {
    if (state.phase !== 'authenticated') return stay(state, authenticatedReducer);

    if (msg.type === 'load-data') {
      console.log(`  Data loaded for ${state.user}`);
      return become({ phase: 'active', user: state.user, data: [] }, activeReducer);
    }
    if (msg.type === 'logout') {
      console.log(`  Logged out`);
      return become({ phase: 'closed' }, closedReducer);
    }
    console.log(`  ERROR: Invalid operation, got ${msg.type}`);
    return stay(state, authenticatedReducer);
  };

  const activeReducer: Reducer<State, Msg> = (state, msg) => {
    if (state.phase !== 'active') return stay(state, activeReducer);

    if (msg.type === 'add-data') {
      console.log(`  Added: ${msg.item}`);
      return stay(
        { ...state, data: [...state.data, msg.item] },
        activeReducer
      );
    }
    if (msg.type === 'logout') {
      console.log(`  Session ended with ${state.data.length} items`);
      return become({ phase: 'closed' }, closedReducer);
    }
    return stay(state, activeReducer);
  };

  const closedReducer: Reducer<State, Msg> = (state, msg) => {
    console.log(`  Session closed, ignoring ${msg.type}`);
    return stay(state, closedReducer);
  };

  const { component, capability } = createComponent(
    createURN('example', 'session-1'),
    { phase: 'init' as const },
    initReducer
  );

  console.log('Protocol: login -> load-data -> add-data* -> logout');
  console.log('Initial phase:', component.getState().phase);

  capability.send(createMessage('login', { username: 'alice' }));
  console.log('Phase:', component.getState().phase);

  capability.send(createMessage('load-data', {}));
  console.log('Phase:', component.getState().phase);

  capability.send(createMessage('add-data', { item: 'item1' }));
  capability.send(createMessage('add-data', { item: 'item2' }));
  console.log('Phase:', component.getState().phase, 'Items:', (component.getState() as any).data);

  capability.send(createMessage('logout', {}));
  console.log('Phase:', component.getState().phase);
}

// Example 6: Component as Aggregate Root
console.log('\n=== Example 6: Aggregate Root Pattern ===');
{
  type OrderState = {
    orderId: string;
    items: Array<{ id: string; quantity: number }>;
    status: 'draft' | 'submitted' | 'completed';
    total: number;
  };

  type OrderMsg =
    | MessageOf<'add-item', { id: string; quantity: number; price: number }>
    | MessageOf<'remove-item', { id: string }>
    | MessageOf<'submit', {}>
    | MessageOf<'complete', {}>;

  const draftReducer: Reducer<OrderState, OrderMsg> = (state, msg) => {
    if (msg.type === 'add-item') {
      console.log(`  Added ${msg.quantity}x ${msg.id} ($${msg.price} each)`);
      return stay({
        ...state,
        items: [...state.items, { id: msg.id, quantity: msg.quantity }],
        total: state.total + msg.price * msg.quantity,
      }, draftReducer);
    }
    if (msg.type === 'remove-item') {
      console.log(`  Removed ${msg.id}`);
      return stay({
        ...state,
        items: state.items.filter((item) => item.id !== msg.id),
      }, draftReducer);
    }
    if (msg.type === 'submit') {
      console.log(`  Order submitted with ${state.items.length} items, total: $${state.total}`);
      return become({ ...state, status: 'submitted' }, submittedReducer);
    }
    return stay(state, draftReducer);
  };

  const submittedReducer: Reducer<OrderState, OrderMsg> = (state, msg) => {
    if (msg.type === 'complete') {
      console.log(`  Order completed`);
      return become({ ...state, status: 'completed' }, completedReducer);
    }
    console.log(`  Cannot modify submitted order`);
    return stay(state, submittedReducer);
  };

  const completedReducer: Reducer<OrderState, OrderMsg> = (state, msg) => {
    console.log(`  Order already completed, ignoring ${msg.type}`);
    return stay(state, completedReducer);
  };

  const { component, capability } = createComponent(
    createURN('orders', 'order-12345'),
    { orderId: '12345', items: [], status: 'draft' as const, total: 0 },
    draftReducer
  );

  console.log('Building order:');
  capability.send(createMessage('add-item', { id: 'widget', quantity: 2, price: 10 }));
  capability.send(createMessage('add-item', { id: 'gadget', quantity: 1, price: 25 }));
  console.log('Draft state:', component.getState());

  capability.send(createMessage('submit', {}));
  console.log('Submitted state:', component.getState());

  capability.send(createMessage('complete', {}));
  console.log('Final state:', component.getState());
}

console.log('\n=== All Component Examples Complete ===');
