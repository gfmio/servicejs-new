/**
 * Reducer Examples
 *
 * Reducers are pure functions that process messages and return new state.
 * They enable stateful behavior, state machines, and session types.
 */

import { stay, become, initialResult, type Reducer } from '../src/reducer.js';
import { emitTo, batch, none } from '../src/effect.js';
import { createCapability } from '../src/capability.js';
import { createMessage, type MessageOf } from '../src/message.js';

// Example 1: Basic Counter Reducer
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

  let state: State = { count: 0 };
  let reducer = counterReducer;

  console.log('Initial:', state);

  const result1 = reducer(state, createMessage('increment', { amount: 5 }));
  state = result1.state;
  console.log('After +5:', state);

  const result2 = reducer(state, createMessage('increment', { amount: 3 }));
  state = result2.state;
  console.log('After +3:', state);

  const result3 = reducer(state, createMessage('decrement', { amount: 4 }));
  state = result3.state;
  console.log('After -4:', state);
}

// Example 2: State Machine (Connection States)
console.log('\n=== Example 2: State Machine ===');
{
  type State =
    | { status: 'disconnected' }
    | { status: 'connecting'; attempt: number }
    | { status: 'connected'; sessionId: string }
    | { status: 'error'; message: string };

  type Msg =
    | MessageOf<'connect', {}>
    | MessageOf<'connected', { sessionId: string }>
    | MessageOf<'disconnect', {}>
    | MessageOf<'error', { message: string }>;

  const disconnectedReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'connect') {
      console.log('  -> Transitioning to connecting...');
      return become({ status: 'connecting', attempt: 1 }, connectingReducer);
    }
    return stay(state, disconnectedReducer);
  };

  const connectingReducer: Reducer<State, Msg> = (state, msg) => {
    if (state.status !== 'connecting') return stay(state, connectingReducer);

    if (msg.type === 'connected') {
      console.log('  -> Transitioning to connected...');
      return become(
        { status: 'connected', sessionId: msg.sessionId },
        connectedReducer
      );
    }
    if (msg.type === 'error') {
      console.log('  -> Transitioning to error...');
      return become({ status: 'error', message: msg.message }, errorReducer);
    }
    return stay(state, connectingReducer);
  };

  const connectedReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'disconnect') {
      console.log('  -> Transitioning to disconnected...');
      return become({ status: 'disconnected' }, disconnectedReducer);
    }
    return stay(state, connectedReducer);
  };

  const errorReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'connect') {
      console.log('  -> Retrying connection...');
      return become({ status: 'connecting', attempt: 1 }, connectingReducer);
    }
    return stay(state, errorReducer);
  };

  let state: State = { status: 'disconnected' };
  let reducer = disconnectedReducer;

  console.log('Initial state:', state.status);

  const r1 = reducer(state, createMessage('connect', {}));
  state = r1.state;
  reducer = r1.reducer;
  console.log('State:', state.status);

  const r2 = reducer(state, createMessage('connected', { sessionId: 'sess-123' }));
  state = r2.state;
  reducer = r2.reducer;
  console.log('State:', state.status, (state as any).sessionId);

  const r3 = reducer(state, createMessage('disconnect', {}));
  state = r3.state;
  reducer = r3.reducer;
  console.log('State:', state.status);
}

// Example 3: Reducer with Effects
console.log('\n=== Example 3: Reducer with Effects ===');
{
  type State = { count: number; history: number[] };
  type Msg = MessageOf<'increment', { amount: number }> | MessageOf<'log', { value: number }>;

  const logMessages: number[] = [];
  const logCap = createCapability<Msg>((msg) => {
    if (msg.type === 'log') {
      logMessages.push(msg.value);
      console.log(`  [LOG] Value logged: ${msg.value}`);
    }
  });

  const counterReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'increment') {
      const newCount = state.count + msg.amount;
      const newHistory = [...state.history, newCount];

      // Emit log effect when count reaches milestone
      const effects = newCount % 10 === 0
        ? [emitTo(logCap, createMessage('log', { value: newCount }))]
        : [];

      return stay(
        { count: newCount, history: newHistory },
        counterReducer,
        effects
      );
    }
    return stay(state, counterReducer);
  };

  let state: State = { count: 0, history: [] };
  let reducer = counterReducer;

  // Process messages and execute effects
  const process = (msg: Msg) => {
    const result = reducer(state, msg);
    state = result.state;
    reducer = result.reducer;

    // Execute effects (normally done by component runtime)
    result.effects.forEach((effect) => {
      if (effect.type === 'emit') {
        effect.capability.send(effect.message);
      }
    });
  };

  console.log('Processing increments...');
  process(createMessage('increment', { amount: 5 }));
  process(createMessage('increment', { amount: 5 })); // Triggers log at 10
  process(createMessage('increment', { amount: 10 })); // Triggers log at 20

  console.log('Final count:', state.count);
  console.log('History:', state.history);
  console.log('Logged values:', logMessages);
}

// Example 4: Session Types (Request/Response)
console.log('\n=== Example 4: Session Types ===');
{
  type State = { stage: string; data?: string };
  type Msg =
    | MessageOf<'request', { query: string }>
    | MessageOf<'response', { result: string }>
    | MessageOf<'done', {}>;

  // Reducer that expects a request, then a response, then done
  const awaitingRequestReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'request') {
      console.log(`  Received request: ${msg.query}`);
      return become({ stage: 'awaiting-response' }, awaitingResponseReducer);
    }
    console.log(`  ERROR: Expected request, got ${msg.type}`);
    return stay(state, awaitingRequestReducer);
  };

  const awaitingResponseReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'response') {
      console.log(`  Received response: ${msg.result}`);
      return become(
        { stage: 'awaiting-done', data: msg.result },
        awaitingDoneReducer
      );
    }
    console.log(`  ERROR: Expected response, got ${msg.type}`);
    return stay(state, awaitingResponseReducer);
  };

  const awaitingDoneReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'done') {
      console.log(`  Session complete with data: ${state.data}`);
      return become({ stage: 'complete', data: state.data }, completeReducer);
    }
    console.log(`  ERROR: Expected done, got ${msg.type}`);
    return stay(state, awaitingDoneReducer);
  };

  const completeReducer: Reducer<State, Msg> = (state, msg) => {
    console.log(`  Session already complete, ignoring ${msg.type}`);
    return stay(state, completeReducer);
  };

  let state: State = { stage: 'awaiting-request' };
  let reducer = awaitingRequestReducer;

  console.log('Session protocol: request -> response -> done');
  console.log('Initial stage:', state.stage);

  const r1 = reducer(state, createMessage('request', { query: 'Hello?' }));
  state = r1.state;
  reducer = r1.reducer;
  console.log('Stage:', state.stage);

  const r2 = reducer(state, createMessage('response', { result: 'World!' }));
  state = r2.state;
  reducer = r2.reducer;
  console.log('Stage:', state.stage);

  const r3 = reducer(state, createMessage('done', {}));
  state = r3.state;
  reducer = r3.reducer;
  console.log('Stage:', state.stage);
}

// Example 5: Immutable State Updates
console.log('\n=== Example 5: Immutable State Updates ===');
{
  type State = { users: string[]; count: number };
  type Msg = MessageOf<'add-user', { name: string }> | MessageOf<'clear', {}>;

  const userReducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'add-user') {
      // Create new arrays, don't mutate existing ones
      return stay(
        {
          users: [...state.users, msg.name],
          count: state.count + 1,
        },
        userReducer
      );
    }
    if (msg.type === 'clear') {
      return stay({ users: [], count: 0 }, userReducer);
    }
    return stay(state, userReducer);
  };

  const originalState: State = { users: ['Alice'], count: 1 };
  let state = originalState;
  let reducer = userReducer;

  console.log('Original state:', originalState);

  const r1 = reducer(state, createMessage('add-user', { name: 'Bob' }));
  state = r1.state;
  console.log('After adding Bob:', state);
  console.log('Original unchanged:', originalState);
  console.log('State is new object:', state !== originalState);

  const r2 = reducer(state, createMessage('add-user', { name: 'Carol' }));
  state = r2.state;
  console.log('After adding Carol:', state);
}

// Example 6: Complex Effects with Batch
console.log('\n=== Example 6: Complex Effects ===');
{
  type State = { value: number };
  type Msg = MessageOf<'update', { value: number }>;

  const cap1 = createCapability<Msg>((msg) => console.log('  [Cap1] Notified:', msg.value));
  const cap2 = createCapability<Msg>((msg) => console.log('  [Cap2] Notified:', msg.value));
  const cap3 = createCapability<Msg>((msg) => console.log('  [Cap3] Notified:', msg.value));

  const reducer: Reducer<State, Msg> = (state, msg) => {
    if (msg.type === 'update') {
      const newValue = msg.value;

      // Notify different capabilities based on value
      const effects = [];
      if (newValue > 10) effects.push(emitTo(cap1, createMessage('update', { value: newValue })));
      if (newValue % 2 === 0) effects.push(emitTo(cap2, createMessage('update', { value: newValue })));
      effects.push(emitTo(cap3, createMessage('update', { value: newValue }))); // Always notify

      return stay({ value: newValue }, reducer, effects);
    }
    return stay(state, reducer);
  };

  let state: State = { value: 0 };

  console.log('Updating to 12 (>10 and even):');
  const r1 = reducer(state, createMessage('update', { value: 12 }));
  r1.effects.forEach((e) => e.type === 'emit' && e.capability.send(e.message));

  console.log('\nUpdating to 7 (odd):');
  const r2 = reducer({ value: 0 }, createMessage('update', { value: 7 }));
  r2.effects.forEach((e) => e.type === 'emit' && e.capability.send(e.message));
}

console.log('\n=== All Reducer Examples Complete ===');
