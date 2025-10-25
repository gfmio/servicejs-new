# @servicejs/request-reply

Request/Reply pattern for ServiceJS - Type-safe RPC-style request-response messaging.

## Overview

`@servicejs/request-reply` provides a type-safe request-response messaging pattern for ServiceJS applications. It enables RPC-style communication between components with:

- Type-safe request/response pairs
- Correlation IDs for matching replies to requests
- Timeout handling
- Cancellation support
- Async/await integration

## Installation

```bash
npm install @servicejs/request-reply @servicejs/core @servicejs/result
# or
bun add @servicejs/request-reply @servicejs/core @servicejs/result
```

## Quick Start

### Basic Request/Reply

```typescript
import { createRequestReply, createReply } from '@servicejs/request-reply';
import { createCapability, createComponent } from '@servicejs/core';

// Define request and response types
type GetUserRequest = { userId: string };
type UserData = { name: string; email: string };
type ResponseMsg = MessageOf<'user-response', { data: UserData }>;

// Server capability
const serverCap = createCapability<any>((msg) => {
  const user = users.get(msg.request.userId);

  // Create and send reply
  const reply = createReply(msg, { data: user });
  msg.replyTo.send(reply);
});

// Client response handler
const responseCap = createCapability<ResponseMsg>((msg) => {
  console.log('Received:', msg.response.data);
});

// Client: Create and send request
const { requestMessage, pendingRequest } = createRequestReply<
  GetUserRequest,
  UserData,
  ResponseMsg
>(
  { userId: '123' },
  responseCap
);

serverCap.send(requestMessage);
```

### With Timeout (Async/Await)

```typescript
import { waitForResponse } from '@servicejs/request-reply';

// Create request
const { requestMessage, pendingRequest } = createRequestReply(
  { userId: '123' },
  responseCap
);

// Send request
serverCap.send(requestMessage);

// Wait for response with 5 second timeout
const result = await waitForResponse(pendingRequest, 5000);

if (result.isOk()) {
  console.log('Success:', result.value);
} else if (result.isErr()) {
  if (result.error.type === 'TIMEOUT') {
    console.log('Request timed out');
  } else if (result.error.type === 'CANCELLED') {
    console.log('Request was cancelled');
  }
}
```

## Core Concepts

### Request Message

A request message contains:
- `correlationId` - Unique identifier for matching replies
- `replyTo` - Capability where the response should be sent
- `request` - The request payload

```typescript
interface RequestMessage<TRequest, TResponse> {
  readonly correlationId: string;
  readonly replyTo: Capability<TResponse>;
  readonly request: TRequest;
}
```

### Response Message

A response message contains:
- `correlationId` - Matches the request's correlation ID
- `response` - The response payload

```typescript
interface ResponseMessage<TResponse> {
  readonly correlationId: string;
  readonly response: TResponse;
}
```

### Pending Request

A pending request tracks the state of an in-flight request:

```typescript
interface PendingRequest<TResponse> {
  readonly correlationId: string;
  hasResponse(): boolean;
  getResponse(): Option<TResponse>;
  cancel(): void;
  isCancelled(): boolean;
}
```

## API Reference

### `createRequestReply(request, responseCapability)`

Creates a request message and pending request tracker.

**Parameters:**
- `request: TRequest` - The request payload
- `responseCapability: Capability<TResponseMsg>` - Where to receive the response

**Returns:**
```typescript
{
  requestMessage: RequestMessage<TRequest, TResponseMsg>;
  pendingRequest: PendingRequest<TResponse>;
}
```

**Example:**
```typescript
const { requestMessage, pendingRequest } = createRequestReply(
  { query: 'search term' },
  responseCapability
);
```

### `createReply(requestMessage, response)`

Creates a reply message for a request.

**Parameters:**
- `requestMessage: RequestMessage` - The original request
- `response: TResponse` - The response payload

**Returns:** `ResponseMessage<TResponse>`

**Example:**
```typescript
const serverReducer = (state, msg) => {
  const result = processRequest(msg.request);
  const reply = createReply(msg, result);

  return stay(state, serverReducer, [
    emitTo(msg.replyTo, reply)
  ]);
};
```

### `waitForResponse(pendingRequest, timeoutMs)`

Waits for a response with timeout.

**Parameters:**
- `pendingRequest: PendingRequest<TResponse>` - The pending request
- `timeoutMs: number` - Timeout in milliseconds

**Returns:** `Promise<Result<TResponse, RequestReplyError>>`

**Example:**
```typescript
const result = await waitForResponse(pendingRequest, 5000);

if (result.isOk()) {
  console.log('Response:', result.value);
} else if (result.isErr()) {
  console.log('Error:', result.error.type);
}
```

## Common Patterns

### Simple RPC Call

```typescript
// Define API
type CalculateRequest = { operation: 'add' | 'multiply'; a: number; b: number };
type CalculateResponse = { result: number };

// Server
const calculatorCap = createCapability<any>((msg) => {
  const { operation, a, b } = msg.request;
  const result = operation === 'add' ? a + b : a * b;

  const reply = createReply(msg, { result });
  msg.replyTo.send(reply);
});

// Client
const { requestMessage, pendingRequest } = createRequestReply(
  { operation: 'add', a: 5, b: 3 },
  responseCap
);

calculatorCap.send(requestMessage);

const result = await waitForResponse(pendingRequest, 1000);
console.log(result.isOk() ? result.value.result : 'Error');
```

### Error Handling

```typescript
type ValidationRequest = { email: string };
type ValidationResponse =
  | { valid: true }
  | { valid: false; error: string };

const validatorCap = createCapability<any>((msg) => {
  const { email } = msg.request;
  const valid = email.includes('@');

  const reply = createReply(msg, {
    valid,
    ...(valid ? {} : { error: 'Invalid email format' }),
  });

  msg.replyTo.send(reply);
});

// Client
const result = await waitForResponse(pendingRequest, 2000);

if (result.isOk()) {
  const response = result.value;
  if (response.valid) {
    console.log('Email is valid');
  } else {
    console.log('Validation error:', response.error);
  }
} else {
  console.log('Request failed:', result.error.type);
}
```

### Request Cancellation

```typescript
const { requestMessage, pendingRequest } = createRequestReply(
  { slowOperation: true },
  responseCap
);

serverCap.send(requestMessage);

// Cancel after 1 second
setTimeout(() => {
  pendingRequest.cancel();
  console.log('Request cancelled');
}, 1000);

const result = await waitForResponse(pendingRequest, 5000);

if (result.isErr() && result.error.type === 'CANCELLED') {
  console.log('Confirmed: request was cancelled');
}
```

### Multiple Concurrent Requests

```typescript
const queries = ['query1', 'query2', 'query3'];

const requests = queries.map((query) =>
  createRequestReply({ query }, responseCap)
);

// Send all requests
requests.forEach(({ requestMessage }) => {
  searchCap.send(requestMessage);
});

// Wait for all responses
const results = await Promise.all(
  requests.map(({ pendingRequest }) =>
    waitForResponse(pendingRequest, 5000)
  )
);

// Process results
results.forEach((result, i) => {
  if (result.isOk()) {
    console.log(`Query ${i} result:`, result.value);
  } else {
    console.log(`Query ${i} failed`);
  }
});
```

### Component Integration

```typescript
type ServerState = { users: Map<string, User> };
type ServerMsg =
  | RequestMessage<GetUserRequest, UserResponseMsg>
  | MessageOf<'add-user', { user: User }>;

const serverReducer: Reducer<ServerState, ServerMsg> = (state, msg) => {
  if ('correlationId' in msg && 'replyTo' in msg) {
    // Handle request
    const user = state.users.get(msg.request.userId);

    if (user) {
      const reply = createReply(msg, { user });
      return stay(state, serverReducer, [
        emitTo(msg.replyTo, reply)
      ]);
    } else {
      const errorReply = createReply(msg, { error: 'User not found' });
      return stay(state, serverReducer, [
        emitTo(msg.replyTo, errorReply)
      ]);
    }
  }

  // Handle other messages...
  return stay(state, serverReducer);
};
```

## Error Handling

The `waitForResponse` function returns a `Result<TResponse, RequestReplyError>` with these error types:

### Timeout Error

```typescript
{
  type: 'TIMEOUT';
  correlationId: string;
  timeoutMs: number;
}
```

Occurs when the response is not received within the specified timeout period.

### Cancellation Error

```typescript
{
  type: 'CANCELLED';
  correlationId: string;
}
```

Occurs when the request is explicitly cancelled via `pendingRequest.cancel()`.

## Best Practices

1. **Set reasonable timeouts** - Always use timeouts to prevent hanging requests
2. **Handle errors gracefully** - Check for both timeout and cancellation errors
3. **Use correlation IDs** - The library generates unique IDs automatically
4. **Type safety** - Leverage TypeScript types for request/response pairs
5. **Cancellation** - Cancel requests when they're no longer needed
6. **Concurrent requests** - Use `Promise.all` for multiple parallel requests

## Examples

See the [examples directory](./examples) for complete working examples:

- [Request/Reply Examples](./examples/requestReply.ts) - Basic usage, timeouts, cancellation, error handling

## License

MIT
