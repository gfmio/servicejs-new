/**
 * Circuit Breaker Example
 *
 * Demonstrates circuit breaker pattern for resilient service communication.
 */

import { createCapability } from '@servicejs/core';
import { createCircuitBreaker } from '../src/circuitBreaker.js';
import { isOk, isErr } from '@servicejs/result';

// Messages
interface APIMessage {
  readonly type: 'api-call';
  readonly endpoint: string;
}

// Simulate unreliable service
let callCount = 0;
let shouldFail = false;

const unreliableService = createCapability<APIMessage>((msg) => {
  callCount++;
  if (shouldFail) {
    throw new Error(`Service unavailable: ${msg.endpoint}`);
  }
  console.log(`✓ API call succeeded: ${msg.endpoint}`);
});

// Example 1: Basic Circuit Breaker
console.log('\n=== Example 1: Basic Circuit Breaker ===\n');

const breaker = createCircuitBreaker(unreliableService, undefined, {
  failureThreshold: 3,
  resetTimeout: 2000,
  onStateChange: (old, newState) => {
    console.log(`🔄 Circuit state: ${old} -> ${newState}`);
  },
});

console.log(`Initial state: ${breaker.getState()}`);
console.log(`Failure count: ${breaker.getFailureCount()}\n`);

// Successful calls
const result1 = breaker.send({ type: 'api-call', endpoint: '/users' });
console.log(`Result 1: ${isOk(result1) ? 'Success' : 'Failed'}`);
console.log(`State: ${breaker.getState()}, Failures: ${breaker.getFailureCount()}\n`);

// Example 2: Circuit Opens After Failures
console.log('\n=== Example 2: Circuit Opens After Failures ===\n');

const breaker2 = createCircuitBreaker(unreliableService, undefined, {
  failureThreshold: 3,
  resetTimeout: 1000,
});

// Make service fail
shouldFail = true;

// First failure
console.log('Attempt 1:');
const r1 = breaker2.send({ type: 'api-call', endpoint: '/api/data' });
console.log(`  Result: ${isErr(r1) ? 'Failed' : 'Success'}`);
console.log(`  State: ${breaker2.getState()}, Failures: ${breaker2.getFailureCount()}`);

// Second failure
console.log('\nAttempt 2:');
const r2 = breaker2.send({ type: 'api-call', endpoint: '/api/data' });
console.log(`  Result: ${isErr(r2) ? 'Failed' : 'Success'}`);
console.log(`  State: ${breaker2.getState()}, Failures: ${breaker2.getFailureCount()}`);

// Third failure - circuit opens
console.log('\nAttempt 3 (circuit should open):');
const r3 = breaker2.send({ type: 'api-call', endpoint: '/api/data' });
console.log(`  Result: ${isErr(r3) ? 'Failed' : 'Success'}`);
console.log(`  State: ${breaker2.getState()}, Failures: ${breaker2.getFailureCount()}`);

// Example 3: Fail Fast When Open
console.log('\n=== Example 3: Fail Fast When Open ===\n');

console.log('Circuit is now open. Attempting to send...');
const fastFailResult = breaker2.send({ type: 'api-call', endpoint: '/api/data' });

if (isErr(fastFailResult)) {
  console.log(`✗ Failed fast: ${fastFailResult.error.type}`);
  if (fastFailResult.error.type === 'CIRCUIT_OPEN') {
    console.log(`  Message: ${fastFailResult.error.message}`);
  }
}

// Example 4: Circuit Recovery (Half-Open -> Closed)
console.log('\n=== Example 4: Circuit Recovery ===\n');

const breaker4 = createCircuitBreaker(unreliableService, undefined, {
  failureThreshold: 2,
  resetTimeout: 500,
  onStateChange: (old, newState) => {
    console.log(`  State transition: ${old} -> ${newState}`);
  },
});

// Open the circuit
shouldFail = true;
console.log('Opening circuit with 2 failures...');
breaker4.send({ type: 'api-call', endpoint: '/test' });
breaker4.send({ type: 'api-call', endpoint: '/test' });
console.log(`Circuit state: ${breaker4.getState()}\n`);

// Wait for reset timeout
console.log('Waiting for reset timeout (500ms)...');
await new Promise((resolve) => setTimeout(resolve, 550));
console.log(`Circuit state after timeout: ${breaker4.getState()}\n`);

// Service recovers
shouldFail = false;
console.log('Service recovered. Attempting send in half-open state...');
const recoveryResult = breaker4.send({ type: 'api-call', endpoint: '/test' });
console.log(`Result: ${isOk(recoveryResult) ? 'Success' : 'Failed'}`);
console.log(`Circuit state: ${breaker4.getState()}\n`);

// Example 5: Half-Open Failure Reopens Circuit
console.log('\n=== Example 5: Half-Open Failure ===\n');

const breaker5 = createCircuitBreaker(unreliableService, undefined, {
  failureThreshold: 1,
  resetTimeout: 500,
  onStateChange: (old, newState) => {
    console.log(`  ${old} -> ${newState}`);
  },
});

// Open circuit
shouldFail = true;
console.log('Opening circuit...');
breaker5.send({ type: 'api-call', endpoint: '/test' });

// Wait for half-open
await new Promise((resolve) => setTimeout(resolve, 550));
console.log(`\nCircuit is ${breaker5.getState()}`);

// Fail again in half-open state
console.log('Sending in half-open state (will fail)...');
breaker5.send({ type: 'api-call', endpoint: '/test' });
console.log(`Circuit reopened: ${breaker5.getState()}\n`);

// Example 6: Manual Reset
console.log('\n=== Example 6: Manual Reset ===\n');

const breaker6 = createCircuitBreaker(unreliableService, undefined, {
  failureThreshold: 1,
  resetTimeout: 60000, // Very long timeout
});

// Open circuit
shouldFail = true;
breaker6.send({ type: 'api-call', endpoint: '/test' });
console.log(`Circuit opened: ${breaker6.getState()}`);
console.log(`Failures: ${breaker6.getFailureCount()}\n`);

// Manual reset
console.log('Manually resetting circuit...');
breaker6.reset();
console.log(`Circuit state: ${breaker6.getState()}`);
console.log(`Failures: ${breaker6.getFailureCount()}\n`);

// Example 7: Custom Failure Detection
console.log('\n=== Example 7: Custom Failure Detection ===\n');

interface StatusMessage {
  readonly type: 'request';
  readonly endpoint: string;
  readonly expectedStatus?: number;
}

let responseStatus = 200;
const apiCapability = createCapability<StatusMessage>((msg) => {
  console.log(`  API call to ${msg.endpoint}, status: ${responseStatus}`);
});

const breaker7 = createCircuitBreaker(
  apiCapability,
  (msg) => {
    // Consider 5xx responses as failures
    return responseStatus >= 500;
  },
  {
    failureThreshold: 2,
    onStateChange: (old, newState) => {
      console.log(`  Circuit: ${old} -> ${newState}`);
    },
  }
);

// Success with 200
console.log('Request 1 (200):');
responseStatus = 200;
breaker7.send({ type: 'request', endpoint: '/api/data' });
console.log(`  State: ${breaker7.getState()}\n`);

// Server error (500) - counts as failure
console.log('Request 2 (500):');
responseStatus = 500;
breaker7.send({ type: 'request', endpoint: '/api/data' });
console.log(`  State: ${breaker7.getState()}\n`);

// Another server error - circuit opens
console.log('Request 3 (500):');
responseStatus = 500;
breaker7.send({ type: 'request', endpoint: '/api/data' });
console.log(`  State: ${breaker7.getState()}\n`);

// Example 8: State Monitoring
console.log('\n=== Example 8: State Monitoring ===\n');

const stateChanges: Array<{ old: string; new: string; time: number }> = [];

const breaker8 = createCircuitBreaker(unreliableService, undefined, {
  failureThreshold: 2,
  resetTimeout: 300,
  onStateChange: (old, newState) => {
    stateChanges.push({ old, new: newState, time: Date.now() });
  },
});

// Trigger state changes
shouldFail = true;
breaker8.send({ type: 'api-call', endpoint: '/test' });
breaker8.send({ type: 'api-call', endpoint: '/test' });

await new Promise((resolve) => setTimeout(resolve, 350));
shouldFail = false;
breaker8.send({ type: 'api-call', endpoint: '/test' });

console.log('State change history:');
stateChanges.forEach((change, i) => {
  console.log(`  ${i + 1}. ${change.old} -> ${change.new}`);
});

console.log('\n✓ All circuit breaker examples completed');
