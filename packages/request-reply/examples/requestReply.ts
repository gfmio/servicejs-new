/**
 * Request/Reply Pattern Examples
 *
 * Demonstrates type-safe RPC-style request-response communication.
 */

import { createRequestReply, createReply, waitForResponse } from '../src/requestReply.js';
import { createCapability, createComponent, createURN, stay, emitTo, createMessage, type MessageOf, type Reducer } from '@servicejs/core';

// Example 1: Basic Request/Reply
console.log('=== Example 1: Basic Request/Reply ===');
{
  type GetUserRequest = { userId: string };
  type UserData = { name: string; email: string };
  type ResponseMsg = MessageOf<'user-response', { data: UserData }>;

  // Server that handles user requests
  const users = new Map([
    ['1', { name: 'Alice', email: 'alice@example.com' }],
    ['2', { name: 'Bob', email: 'bob@example.com' }],
  ]);

  const serverCap = createCapability<any>((msg) => {
    console.log(`Server received request for user: ${msg.request.userId}`);

    const user = users.get(msg.request.userId);
    if (user) {
      const reply = createReply(msg, { data: user });
      msg.replyTo.send(reply);
    }
  });

  // Client response handler
  const responseCap = createCapability<ResponseMsg>((msg) => {
    console.log(`Client received response:`, msg.response.data);
  });

  // Create and send request
  const { requestMessage } = createRequestReply<GetUserRequest, UserData, ResponseMsg>(
    { userId: '1' },
    responseCap
  );

  serverCap.send(requestMessage);
}

// Example 2: Async/Await with Timeout
console.log('\n=== Example 2: Async/Await with Timeout ===');
{
  type CalculateRequest = { operation: 'add' | 'multiply'; a: number; b: number };
  type CalculateResult = { result: number };
  type ResponseMsg = MessageOf<'calc-response', CalculateResult>;

  const calculatorCap = createCapability<any>((msg) => {
    const { operation, a, b } = msg.request;
    const result = operation === 'add' ? a + b : a * b;

    // Simulate async processing
    setTimeout(() => {
      const reply = createReply(msg, { result });
      msg.replyTo.send(reply);
    }, 100);
  });

  const responseCap = createCapability<ResponseMsg>((msg) => {
    // Store response in pending request
    if ((msg as any)._setResponse) {
      (msg as any)._setResponse(msg.response);
    }
  });

  (async () => {
    const { requestMessage, pendingRequest } = createRequestReply<CalculateRequest, CalculateResult, ResponseMsg>(
      { operation: 'add', a: 5, b: 3 },
      responseCap
    );

    // Attach response setter to message
    (requestMessage as any)._responseMsg = responseCap;
    (responseCap as any)._setResponse = (data: CalculateResult) => {
      (requestMessage as any)._setResponse(data);
    };

    calculatorCap.send(requestMessage);

    const result = await waitForResponse(pendingRequest, 500);
    if (result.isOk()) {
      console.log(`Calculation result: ${result.value.result}`);
    } else if (result.isErr() && result.error.type === 'TIMEOUT') {
      console.log('Request timed out');
    }
  })();
}

// Example 3: Multiple Concurrent Requests
console.log('\n=== Example 3: Multiple Concurrent Requests ===');
{
  type QueryRequest = { query: string };
  type QueryResult = { results: string[] };
  type ResponseMsg = MessageOf<'query-response', QueryResult>;

  const searchCap = createCapability<any>((msg) => {
    const results = [`Result 1 for "${msg.request.query}"`, `Result 2 for "${msg.request.query}"`];

    setTimeout(() => {
      const reply = createReply(msg, { results });
      msg.replyTo.send(reply);
    }, Math.random() * 100);
  });

  const responseCap = createCapability<ResponseMsg>((msg) => {
    console.log(`Search results for correlation ${msg.correlationId}:`, msg.response.results);
  });

  // Send multiple requests
  const queries = ['typescript', 'servicejs', 'patterns'];

  queries.forEach((query) => {
    const { requestMessage } = createRequestReply<QueryRequest, QueryResult, ResponseMsg>(
      { query },
      responseCap
    );

    searchCap.send(requestMessage);
  });
}

// Example 4: Request Cancellation
console.log('\n=== Example 4: Request Cancellation ===');
{
  type SlowRequest = { id: number };
  type SlowResult = { processed: boolean };
  type ResponseMsg = MessageOf<'slow-response', SlowResult>;

  const slowServerCap = createCapability<any>((msg) => {
    // Simulate slow processing
    setTimeout(() => {
      const reply = createReply(msg, { processed: true });
      msg.replyTo.send(reply);
    }, 2000);
  });

  const responseCap = createCapability<ResponseMsg>((msg) => {
    console.log(`Response received (shouldn't see this if cancelled)`);
  });

  (async () => {
    const { requestMessage, pendingRequest } = createRequestReply<SlowRequest, SlowResult, ResponseMsg>(
      { id: 1 },
      responseCap
    );

    slowServerCap.send(requestMessage);

    // Cancel after 100ms
    setTimeout(() => {
      console.log('Cancelling request...');
      pendingRequest.cancel();
    }, 100);

    const result = await waitForResponse(pendingRequest, 5000);
    if (result.isErr() && result.error.type === 'CANCELLED') {
      console.log('Request was cancelled as expected');
    }
  })();
}

// Example 5: Error Handling
console.log('\n=== Example 5: Error Handling ===');
{
  type ValidationRequest = { email: string };
  type ValidationResult = { valid: boolean; error?: string };
  type ResponseMsg = MessageOf<'validation-response', ValidationResult>;

  const validatorCap = createCapability<any>((msg) => {
    const { email } = msg.request;
    const valid = email.includes('@');

    const reply = createReply(msg, {
      valid,
      error: valid ? undefined : 'Invalid email format',
    });

    msg.replyTo.send(reply);
  });

  const responseCap = createCapability<ResponseMsg>((msg) => {
    if (msg.response.valid) {
      console.log('Email is valid');
    } else {
      console.log(`Validation error: ${msg.response.error}`);
    }
  });

  // Valid email
  const valid = createRequestReply<ValidationRequest, ValidationResult, ResponseMsg>(
    { email: 'user@example.com' },
    responseCap
  );
  validatorCap.send(valid.requestMessage);

  // Invalid email
  const invalid = createRequestReply<ValidationRequest, ValidationResult, ResponseMsg>(
    { email: 'invalid-email' },
    responseCap
  );
  validatorCap.send(invalid.requestMessage);
}

console.log('\n=== All Request/Reply Examples Complete ===');
