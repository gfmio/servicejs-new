/**
 * Session Types Example
 *
 * Demonstrates type-safe state machines using reducer replacement (become).
 * Shows how session types enforce valid message sequences at compile time.
 */

import {
  createComponent,
  createMessage,
  stay,
  become,
  emitTo,
  type Reducer,
  type Capability,
  type MessageOf,
} from '../src/index.js';
import { Ok, Err } from '@servicejs/result';

console.log('\n=== Session Types: Traffic Light Example ===\n');

// === Traffic Light State Machine ===
// States: Red -> Green -> Yellow -> Red

// === Message Types ===

const ChangeMsg = createMessage<'change', {}>('change');
const GetStateMsg = createMessage<'getState', { replyTo: Capability<any> }>('getState');

type TrafficLightMessage = MessageOf<typeof ChangeMsg> | MessageOf<typeof GetStateMsg>;

// === State ===

type TrafficLightState = {
  color: 'red' | 'yellow' | 'green';
};

// === Reducers (One per State) ===

// Red Light Reducer: Only accepts 'change' to go to Green
const redLightReducer: Reducer<TrafficLightState, TrafficLightMessage> = (state, message) => {
  switch (message.type) {
    case 'change':
      console.log('🔴 Red -> 🟢 Green');
      return become({ color: 'green' }, greenLightReducer, []);

    case 'getState':
      return stay(state, redLightReducer, [
        emitTo(message.replyTo, Ok({ color: 'red', canChange: true })),
      ]);
  }
};

// Green Light Reducer: Only accepts 'change' to go to Yellow
const greenLightReducer: Reducer<TrafficLightState, TrafficLightMessage> = (state, message) => {
  switch (message.type) {
    case 'change':
      console.log('🟢 Green -> 🟡 Yellow');
      return become({ color: 'yellow' }, yellowLightReducer, []);

    case 'getState':
      return stay(state, greenLightReducer, [
        emitTo(message.replyTo, Ok({ color: 'green', canChange: true })),
      ]);
  }
};

// Yellow Light Reducer: Only accepts 'change' to go to Red
const yellowLightReducer: Reducer<TrafficLightState, TrafficLightMessage> = (state, message) => {
  switch (message.type) {
    case 'change':
      console.log('🟡 Yellow -> 🔴 Red');
      return become({ color: 'red' }, redLightReducer, []);

    case 'getState':
      return stay(state, yellowLightReducer, [
        emitTo(message.replyTo, Ok({ color: 'yellow', canChange: true })),
      ]);
  }
};

// === Create Component ===

const { component: trafficLight, capability: trafficLightCap } = createComponent(
  'urn:traffic:main' as any,
  { color: 'red' } as TrafficLightState,
  redLightReducer // Start in red state
);

// === Reply Handler ===

const { capability: replyCap } = createComponent(
  'urn:reply:traffic' as any,
  {},
  (state, message: any) => {
    if (message.success) {
      console.log(`  State: ${JSON.stringify(message.value)}`);
    }
    return stay(state, arguments.callee as any, []);
  }
);

// === Demonstrate State Transitions ===

console.log('=== Demonstrating Traffic Light Cycle ===\n');

// Check initial state
trafficLightCap.send(GetStateMsg({ replyTo: replyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

// Cycle through states
console.log('\nCycling through states:\n');

for (let i = 0; i < 6; i++) {
  trafficLightCap.send(ChangeMsg({}));
  await new Promise((resolve) => setTimeout(resolve, 100));
}

console.log('\n=== Door Lock Example with Error Handling ===\n');

// === Door Lock State Machine ===
// States: Locked <-> Unlocked

// === Message Types ===

const UnlockMsg = createMessage<'unlock', { code: string; replyTo: Capability<any> }>('unlock');
const LockMsg = createMessage<'lock', { replyTo: Capability<any> }>('lock');
const OpenMsg = createMessage<'open', { replyTo: Capability<any> }>('open');

type DoorMessage =
  | MessageOf<typeof UnlockMsg>
  | MessageOf<typeof LockMsg>
  | MessageOf<typeof OpenMsg>;

// === State ===

type DoorState = {
  locked: boolean;
  code: string; // Correct unlock code
};

// === Locked State Reducer ===

const lockedReducer: Reducer<DoorState, DoorMessage> = (state, message) => {
  switch (message.type) {
    case 'unlock':
      if (message.code === state.code) {
        console.log('✅ Door unlocked');
        return become({ ...state, locked: false }, unlockedReducer, [
          emitTo(message.replyTo, Ok({ status: 'unlocked' })),
        ]);
      } else {
        console.log('❌ Wrong code');
        return stay(state, lockedReducer, [
          emitTo(message.replyTo, Err(new Error('Wrong unlock code'))),
        ]);
      }

    case 'open':
      console.log('❌ Cannot open - door is locked');
      return stay(state, lockedReducer, [
        emitTo(message.replyTo, Err(new Error('Door is locked'))),
      ]);

    case 'lock':
      console.log('ℹ️  Door is already locked');
      return stay(state, lockedReducer, [
        emitTo(message.replyTo, Ok({ status: 'already-locked' })),
      ]);
  }
};

// === Unlocked State Reducer ===

const unlockedReducer: Reducer<DoorState, DoorMessage> = (state, message) => {
  switch (message.type) {
    case 'lock':
      console.log('🔒 Door locked');
      return become({ ...state, locked: true }, lockedReducer, [
        emitTo(message.replyTo, Ok({ status: 'locked' })),
      ]);

    case 'open':
      console.log('🚪 Door opened');
      return stay(state, unlockedReducer, [
        emitTo(message.replyTo, Ok({ status: 'opened' })),
      ]);

    case 'unlock':
      console.log('ℹ️  Door is already unlocked');
      return stay(state, unlockedReducer, [
        emitTo(message.replyTo, Ok({ status: 'already-unlocked' })),
      ]);
  }
};

// === Create Door Component ===

const { component: door, capability: doorCap } = createComponent(
  'urn:door:main' as any,
  { locked: true, code: '1234' },
  lockedReducer // Start locked
);

// === Reply Handler for Door ===

const { capability: doorReplyCap } = createComponent(
  'urn:reply:door' as any,
  {},
  (state, message: any) => {
    if (message.success) {
      console.log(`  ✓ ${JSON.stringify(message.value)}`);
    } else {
      console.log(`  ✗ ${message.error.message}`);
    }
    return stay(state, arguments.callee as any, []);
  }
);

// === Demonstrate Door Operations ===

console.log('Scenario 1: Try to open locked door\n');
doorCap.send(OpenMsg({ replyTo: doorReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nScenario 2: Try to unlock with wrong code\n');
doorCap.send(UnlockMsg({ code: 'wrong', replyTo: doorReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nScenario 3: Unlock with correct code\n');
doorCap.send(UnlockMsg({ code: '1234', replyTo: doorReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nScenario 4: Open unlocked door\n');
doorCap.send(OpenMsg({ replyTo: doorReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nScenario 5: Lock the door\n');
doorCap.send(LockMsg({ replyTo: doorReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nScenario 6: Try to open locked door again\n');
doorCap.send(OpenMsg({ replyTo: doorReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\n=== Connection State Machine Example ===\n');

// === Connection Protocol ===
// States: Disconnected -> Connecting -> Connected -> Disconnecting -> Disconnected

// === Message Types ===

const ConnectMsg = createMessage<'connect', { url: string; replyTo: Capability<any> }>('connect');
const DisconnectMsg = createMessage<'disconnect', { replyTo: Capability<any> }>('disconnect');
const SendDataMsg = createMessage<'sendData', { data: string; replyTo: Capability<any> }>('sendData');
const ConnectionEstablishedMsg = createMessage<'connectionEstablished', {}>('connectionEstablished');
const ConnectionFailedMsg = createMessage<'connectionFailed', { error: string }>('connectionFailed');
const DisconnectedMsg = createMessage<'disconnected', {}>('disconnected');

type ConnectionMessage =
  | MessageOf<typeof ConnectMsg>
  | MessageOf<typeof DisconnectMsg>
  | MessageOf<typeof SendDataMsg>
  | MessageOf<typeof ConnectionEstablishedMsg>
  | MessageOf<typeof ConnectionFailedMsg>
  | MessageOf<typeof DisconnectedMsg>;

// === State ===

type ConnectionState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'disconnecting';
  url?: string;
  error?: string;
};

// === Disconnected Reducer ===

const disconnectedReducer: Reducer<ConnectionState, ConnectionMessage> = (state, message) => {
  switch (message.type) {
    case 'connect':
      console.log(`📡 Connecting to ${message.url}...`);
      // Simulate async connection (normally would emit to network capability)
      setTimeout(() => {
        connectionCap.send(ConnectionEstablishedMsg({}));
      }, 100);

      return become(
        { status: 'connecting', url: message.url },
        connectingReducer,
        [emitTo(message.replyTo, Ok({ status: 'connecting' }))]
      );

    case 'sendData':
      return stay(state, disconnectedReducer, [
        emitTo(message.replyTo, Err(new Error('Not connected'))),
      ]);

    default:
      return stay(state, disconnectedReducer, []);
  }
};

// === Connecting Reducer ===

const connectingReducer: Reducer<ConnectionState, ConnectionMessage> = (state, message) => {
  switch (message.type) {
    case 'connectionEstablished':
      console.log('✅ Connection established');
      return become({ ...state, status: 'connected' }, connectedReducer, []);

    case 'connectionFailed':
      console.log(`❌ Connection failed: ${message.error}`);
      return become(
        { status: 'disconnected', error: message.error },
        disconnectedReducer,
        []
      );

    case 'sendData':
      return stay(state, connectingReducer, [
        emitTo(message.replyTo, Err(new Error('Still connecting'))),
      ]);

    default:
      return stay(state, connectingReducer, []);
  }
};

// === Connected Reducer ===

const connectedReducer: Reducer<ConnectionState, ConnectionMessage> = (state, message) => {
  switch (message.type) {
    case 'sendData':
      console.log(`📤 Sending: ${message.data}`);
      return stay(state, connectedReducer, [
        emitTo(message.replyTo, Ok({ sent: true })),
      ]);

    case 'disconnect':
      console.log('🔌 Disconnecting...');
      // Simulate async disconnection
      setTimeout(() => {
        connectionCap.send(DisconnectedMsg({}));
      }, 100);

      return become(
        { ...state, status: 'disconnecting' },
        disconnectingReducer,
        [emitTo(message.replyTo, Ok({ status: 'disconnecting' }))]
      );

    default:
      return stay(state, connectedReducer, []);
  }
};

// === Disconnecting Reducer ===

const disconnectingReducer: Reducer<ConnectionState, ConnectionMessage> = (state, message) => {
  switch (message.type) {
    case 'disconnected':
      console.log('✅ Disconnected');
      return become({ status: 'disconnected' }, disconnectedReducer, []);

    case 'sendData':
      return stay(state, disconnectingReducer, [
        emitTo(message.replyTo, Err(new Error('Disconnecting'))),
      ]);

    default:
      return stay(state, disconnectingReducer, []);
  }
};

// === Create Connection Component ===

const { component: connection, capability: connectionCap } = createComponent(
  'urn:connection:websocket' as any,
  { status: 'disconnected' } as ConnectionState,
  disconnectedReducer
);

// === Reply Handler for Connection ===

const { capability: connReplyCap } = createComponent(
  'urn:reply:connection' as any,
  {},
  (state, message: any) => {
    if (message.success) {
      console.log(`  ✓ ${JSON.stringify(message.value)}`);
    } else {
      console.log(`  ✗ ${message.error.message}`);
    }
    return stay(state, arguments.callee as any, []);
  }
);

// === Demonstrate Connection State Machine ===

console.log('Step 1: Try to send data when disconnected\n');
connectionCap.send(SendDataMsg({ data: 'hello', replyTo: connReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nStep 2: Connect to server\n');
connectionCap.send(ConnectMsg({ url: 'ws://example.com', replyTo: connReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 150));

console.log('\nStep 3: Send data when connected\n');
connectionCap.send(SendDataMsg({ data: 'Hello, server!', replyTo: connReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\nStep 4: Disconnect\n');
connectionCap.send(DisconnectMsg({ replyTo: connReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 150));

console.log('\nStep 5: Try to send data after disconnect\n');
connectionCap.send(SendDataMsg({ data: 'goodbye', replyTo: connReplyCap }));
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\n=== Session Types Examples Complete ===\n');

console.log('Key Concepts Demonstrated:\n');
console.log('1. Session Types: Different reducers for different states');
console.log('2. State Transitions: become() changes the active reducer');
console.log('3. Type Safety: Only valid messages accepted in each state');
console.log('4. Error Handling: Invalid operations return errors');
console.log('5. Protocol Enforcement: State machine enforces message sequences\n');
