/**
 * Advanced Example: ATM State Machine using Protocol Types
 * 
 * This demonstrates:
 * - Session types / protocol types
 * - State machines with typed transitions
 * - Different message types in different states
 * - Type-safe protocol evolution
 */

import {
  type Message,
  type ComponentState,
  createURN,
  Ok,
  Err,
  ProtocolBuilder,
} from '@actor-framework/core';

import { createFIFOMailbox } from '@actor-framework/mailbox';
import { createLocalTransport } from '@actor-framework/transport';

// ============================================================================
// ATM Protocol Definition
// ============================================================================

// State
interface ATMState extends ComponentState {
  balance: number;
  cardInserted: boolean;
  authenticated: boolean;
  attempts: number;
}

// Messages for different states
interface InsertCardMessage extends Message {
  type: 'insert-card';
  cardNumber: string;
}

interface EnterPINMessage extends Message {
  type: 'enter-pin';
  pin: string;
}

interface CheckBalanceMessage extends Message {
  type: 'check-balance';
}

interface WithdrawMessage extends Message {
  type: 'withdraw';
  amount: number;
}

interface EjectCardMessage extends Message {
  type: 'eject-card';
}

interface TransactionCompleteMessage extends Message {
  type: 'transaction-complete';
}

// ============================================================================
// ATM Protocol State Machine
// ============================================================================

const createATMProtocol = (initialBalance: number) => {
  const builder = new ProtocolBuilder<ATMState>();

  // State 1: Waiting for card
  builder.state(
    'waiting-for-card',
    (msg): msg is InsertCardMessage => msg.type === 'insert-card'
  );

  // State 2: Waiting for PIN
  builder.state(
    'waiting-for-pin',
    (msg): msg is EnterPINMessage | EjectCardMessage =>
      msg.type === 'enter-pin' || msg.type === 'eject-card'
  );

  // State 3: Authenticated (can perform transactions)
  builder.state(
    'authenticated',
    (msg): msg is CheckBalanceMessage | WithdrawMessage | EjectCardMessage =>
      msg.type === 'check-balance' ||
      msg.type === 'withdraw' ||
      msg.type === 'eject-card'
  );

  // State 4: Transaction in progress
  builder.state(
    'transaction',
    (msg): msg is TransactionCompleteMessage => msg.type === 'transaction-complete'
  );

  // Transitions

  // Insert card: waiting-for-card → waiting-for-pin
  builder.on(
    'waiting-for-card',
    'insert-card',
    (state, msg: InsertCardMessage) => {
      console.log(`\n💳 Card inserted: ${msg.cardNumber}`);
      return Ok({
        state: {
          ...state,
          cardInserted: true,
          attempts: 0,
        },
        effects: [],
      });
    },
    'waiting-for-pin'
  );

  // Enter correct PIN: waiting-for-pin → authenticated
  builder.on(
    'waiting-for-pin',
    'enter-pin',
    (state, msg: EnterPINMessage) => {
      const correctPIN = '1234'; // Hardcoded for demo
      
      if (msg.pin === correctPIN) {
        console.log('✅ PIN accepted - Authentication successful');
        return Ok({
          state: {
            ...state,
            authenticated: true,
          },
          effects: [],
        });
      } else {
        const newAttempts = state.attempts + 1;
        console.log(`❌ Invalid PIN - Attempt ${newAttempts}/3`);
        
        if (newAttempts >= 3) {
          console.log('🚫 Too many attempts - Card ejected');
          return Ok({
            state: {
              balance: initialBalance,
              cardInserted: false,
              authenticated: false,
              attempts: 0,
            },
            effects: [],
          });
        }
        
        return Ok({
          state: {
            ...state,
            attempts: newAttempts,
          },
          effects: [],
        });
      }
    },
    'authenticated'
  );

  // Check balance: authenticated → authenticated (stays in same state)
  builder.on(
    'authenticated',
    'check-balance',
    (state, _msg: CheckBalanceMessage) => {
      console.log(`\n💰 Current balance: $${state.balance}`);
      return Ok({
        state,
        effects: [],
      });
    },
    'authenticated'
  );

  // Withdraw: authenticated → transaction
  builder.on(
    'authenticated',
    'withdraw',
    (state, msg: WithdrawMessage) => {
      console.log(`\n💸 Processing withdrawal: $${msg.amount}`);
      
      if (msg.amount > state.balance) {
        console.log('❌ Insufficient funds');
        return Ok({
          state,
          effects: [],
        });
      }
      
      if (msg.amount <= 0) {
        console.log('❌ Invalid amount');
        return Ok({
          state,
          effects: [],
        });
      }

      const newBalance = state.balance - msg.amount;
      console.log(`✅ Withdrawal successful - New balance: $${newBalance}`);
      
      return Ok({
        state: {
          ...state,
          balance: newBalance,
        },
        effects: [],
      });
    },
    'transaction'
  );

  // Transaction complete: transaction → authenticated
  builder.on(
    'transaction',
    'transaction-complete',
    (state, _msg: TransactionCompleteMessage) => {
      console.log('Transaction complete');
      return Ok({
        state,
        effects: [],
      });
    },
    'authenticated'
  );

  // Eject card from any state: → waiting-for-card
  builder.on(
    'waiting-for-pin',
    'eject-card',
    (state, _msg: EjectCardMessage) => {
      console.log('\n👋 Card ejected - Thank you');
      return Ok({
        state: {
          balance: initialBalance,
          cardInserted: false,
          authenticated: false,
          attempts: 0,
        },
        effects: [],
      });
    },
    'waiting-for-card'
  );

  builder.on(
    'authenticated',
    'eject-card',
    (state, _msg: EjectCardMessage) => {
      console.log('\n👋 Card ejected - Thank you');
      return Ok({
        state: {
          balance: state.balance, // Persist balance
          cardInserted: false,
          authenticated: false,
          attempts: 0,
        },
        effects: [],
      });
    },
    'waiting-for-card'
  );

  // Build the initial protocol
  return builder.buildProtocol('waiting-for-card');
};

// ============================================================================
// Main Application
// ============================================================================

async function main() {
  console.log('🏧 ATM Protocol Example\n');
  console.log('This demonstrates session types and protocol evolution.\n');

  // Create transport
  const transport = createLocalTransport<Message>();
  await transport.start();

  // Create ATM component
  const atmURN = createURN('atm', 'main');
  const initialState: ATMState = {
    balance: 1000,
    cardInserted: false,
    authenticated: false,
    attempts: 0,
  };

  const protocol = createATMProtocol(1000);
  const atmReducer = protocol.buildReducer(initialState, 'waiting-for-card');

  // Create mailbox
  const mailbox = createFIFOMailbox<Message>((message) => {
    const result = atmReducer.reduce(message);
    if (!result.ok) {
      console.error('Error:', result.error.message);
    }
  });
  mailbox.start();

  transport.registerHandler(atmURN, (msg) => mailbox.enqueue(msg));

  const atmChannel = transport.createChannel<Message>(atmURN);

  // =========================================================================
  // Scenario 1: Successful transaction
  // =========================================================================
  console.log('=== Scenario 1: Successful Transaction ===');
  
  atmChannel.send({ type: 'insert-card', cardNumber: '1234-5678-9012-3456' });
  await sleep(100);
  
  atmChannel.send({ type: 'enter-pin', pin: '1234' });
  await sleep(100);
  
  atmChannel.send({ type: 'check-balance' });
  await sleep(100);
  
  atmChannel.send({ type: 'withdraw', amount: 100 });
  await sleep(100);
  
  atmChannel.send({ type: 'transaction-complete' });
  await sleep(100);
  
  atmChannel.send({ type: 'check-balance' });
  await sleep(100);
  
  atmChannel.send({ type: 'eject-card' });
  await sleep(200);

  // =========================================================================
  // Scenario 2: Failed PIN attempts
  // =========================================================================
  console.log('\n=== Scenario 2: Failed PIN Attempts ===');
  
  atmChannel.send({ type: 'insert-card', cardNumber: '9876-5432-1098-7654' });
  await sleep(100);
  
  atmChannel.send({ type: 'enter-pin', pin: '0000' });
  await sleep(100);
  
  atmChannel.send({ type: 'enter-pin', pin: '1111' });
  await sleep(100);
  
  atmChannel.send({ type: 'enter-pin', pin: '2222' });
  await sleep(200);

  // =========================================================================
  // Scenario 3: Insufficient funds
  // =========================================================================
  console.log('\n=== Scenario 3: Insufficient Funds ===');
  
  atmChannel.send({ type: 'insert-card', cardNumber: '1111-2222-3333-4444' });
  await sleep(100);
  
  atmChannel.send({ type: 'enter-pin', pin: '1234' });
  await sleep(100);
  
  atmChannel.send({ type: 'withdraw', amount: 10000 }); // More than balance
  await sleep(100);
  
  atmChannel.send({ type: 'eject-card' });
  await sleep(200);

  console.log('\n=== Demo Complete ===\n');

  // Cleanup
  await mailbox.stop();
  await transport.stop();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
