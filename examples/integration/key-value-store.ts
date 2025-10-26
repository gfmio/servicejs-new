/**
 * Simple Key-Value Store with Request/Reply Integration Example
 *
 * Demonstrates:
 * - RPC-style request-response messaging
 * - Multiple request types (get, set, delete)
 * - Success and error responses
 * - Integration between @servicejs/core and @servicejs/request-reply
 */

import {
  createComponent,
  createURN,
  stay,
  emitTo,
  createCapability,
  type MessageOf,
  type Capability,
} from '@servicejs/core';
import {
  createRequestReply,
  createReply,
  waitForResponse,
  type RequestMessage,
} from '@servicejs/request-reply';
import { type Result, isOk, isErr } from '@servicejs/result';

// Define request/response types
type GetRequest = { key: string };
type GetResponse = { found: true; value: string } | { found: false };

type SetRequest = { key: string; value: string };
type SetResponse = { success: true };

type DeleteRequest = { key: string };
type DeleteResponse = { success: boolean };

// Define response messages
type GetResponseMsg = MessageOf<'get-response', GetResponse>;
type SetResponseMsg = MessageOf<'set-response', SetResponse>;
type DeleteResponseMsg = MessageOf<'delete-response', DeleteResponse>;

// Define store state
type StoreState = {
  data: Map<string, string>;
};

// Define store messages
type StoreMsg =
  | RequestMessage<GetRequest, GetResponseMsg>
  | RequestMessage<SetRequest, SetResponseMsg>
  | RequestMessage<DeleteRequest, DeleteResponseMsg>;

// Helper to check if message is a request
function isRequest(msg: any): msg is RequestMessage<any, any> {
  return 'correlationId' in msg && 'replyTo' in msg && 'request' in msg;
}

// Create store reducer
const storeReducer = (state: StoreState, msg: StoreMsg) => {
  if (!isRequest(msg)) {
    return stay(state, storeReducer);
  }

  const request = msg.request;

  // GET request
  if ('key' in request && !('value' in request)) {
    const value = state.data.get(request.key);
    const responseData: GetResponse = value !== undefined
      ? { found: true as const, value }
      : { found: false as const };

    // Create reply with response data
    const reply: any = createReply(msg, responseData);
    reply.type = 'get-response';

    return stay(state, storeReducer, [
      emitTo(msg.replyTo as Capability<GetResponseMsg>, reply),
    ]);
  }

  // SET request
  if ('key' in request && 'value' in request) {
    const newData = new Map(state.data);
    newData.set(request.key, request.value);

    const responseData: SetResponse = { success: true };
    const reply: any = createReply(msg, responseData);
    reply.type = 'set-response';

    return stay({ data: newData }, storeReducer, [
      emitTo(msg.replyTo as Capability<SetResponseMsg>, reply),
    ]);
  }

  return stay(state, storeReducer);
};

// Example 1: Basic GET/SET with Response Handlers
console.log('=== Example 1: Basic GET/SET Operations ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'kv-store-1'),
    { data: new Map() },
    storeReducer
  );

  // SET a value
  console.log('Setting key "user:1" = "Alice"');
  const setResp = createCapability<SetResponseMsg>((msg) => {
    console.log(`✓ SET successful`);
  });
  const setReq = createRequestReply<SetRequest, SetResponse, SetResponseMsg>(
    { key: 'user:1', value: 'Alice' },
    setResp
  );
  capability.send(setReq.requestMessage);

  // GET the value
  console.log('\nGetting key "user:1"');
  const getResp = createCapability<GetResponseMsg>((msg) => {
    if (msg.response.found) {
      console.log(`✓ GET found: "${msg.response.value}"`);
    } else {
      console.log(`✗ GET: Key not found`);
    }
  });
  const getReq = createRequestReply<GetRequest, GetResponse, GetResponseMsg>(
    { key: 'user:1' },
    getResp
  );
  capability.send(getReq.requestMessage);

  // GET non-existent key
  console.log('\nGetting key "user:99" (not set)');
  const getReq2 = createRequestReply<GetRequest, GetResponse, GetResponseMsg>(
    { key: 'user:99' },
    getResp
  );
  capability.send(getReq2.requestMessage);
}

// Example 2: Multiple Operations
console.log('\n=== Example 2: Multiple SET/GET Operations ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'kv-store-2'),
    { data: new Map() },
    storeReducer
  );

  const setResp = createCapability<SetResponseMsg>(() => {});
  const getResp = createCapability<GetResponseMsg>((msg) => {
    if (msg.response.found) {
      console.log(`  → ${msg.response.value}`);
    }
  });

  // Set multiple values
  console.log('Setting multiple users...');
  const users = ['Alice', 'Bob', 'Charlie'];
  users.forEach((name, index) => {
    const req = createRequestReply<SetRequest, SetResponse, SetResponseMsg>(
      { key: `user:${index + 1}`, value: name },
      setResp
    );
    capability.send(req.requestMessage);
  });

  console.log('\nReading all users:');
  for (let i = 1; i <= users.length; i++) {
    const req = createRequestReply<GetRequest, GetResponse, GetResponseMsg>(
      { key: `user:${i}` },
      getResp
    );
    capability.send(req.requestMessage);
  }
}

// Example 3: Async/Await with waitForResponse
console.log('\n=== Example 3: Async/Await Pattern ===\n');
await (async () => {
  const { component, capability } = createComponent(
    createURN('examples', 'kv-store-3'),
    { data: new Map([['config:name', 'ServiceJS']]) },
    storeReducer
  );

  console.log('Creating async request for "config:name"...');

  // Create response capability that updates pending request
  let setResponseFn: ((data: GetResponse) => void) | null = null;
  const responseHandler = createCapability<GetResponseMsg>((msg) => {
    if (setResponseFn) {
      setResponseFn(msg.response);
    }
  });

  const { requestMessage, pendingRequest } = createRequestReply<GetRequest, GetResponse, GetResponseMsg>(
    { key: 'config:name' },
    responseHandler
  );

  // Wire up the response setter
  setResponseFn = (requestMessage as any)._setResponse;

  // Send request
  capability.send(requestMessage);

  // Wait for response
  console.log('Waiting for response...');
  const result = await waitForResponse(pendingRequest, 1000);

  if (isOk(result)) {
    const response = result.value;
    if (response.found) {
      console.log(`✓ Async GET result: "${response.value}"`);
    } else {
      console.log(`✗ Key not found`);
    }
  } else if (isErr(result)) {
    console.log(`✗ Error: ${result.error.type}`);
  }
})();

// Example 4: Timeout Handling
console.log('\n=== Example 4: Timeout Handling ===\n');
await (async () => {
  const { component, capability } = createComponent(
    createURN('examples', 'kv-store-4'),
    { data: new Map() },
    storeReducer
  );

  console.log('Creating request but not sending it (simulates slow server)...');

  let setResponseFn: ((data: GetResponse) => void) | null = null;
  const responseHandler = createCapability<GetResponseMsg>((msg) => {
    if (setResponseFn) {
      setResponseFn(msg.response);
    }
  });

  const { requestMessage, pendingRequest } = createRequestReply<GetRequest, GetResponse, GetResponseMsg>(
    { key: 'slow:key' },
    responseHandler
  );

  setResponseFn = (requestMessage as any)._setResponse;

  // Don't send the request to simulate timeout
  // capability.send(requestMessage);

  console.log('Waiting for response with 500ms timeout...');
  const result = await waitForResponse(pendingRequest, 500);

  if (isErr(result) && result.error.type === 'TIMEOUT') {
    console.log(`✓ Request timed out after ${result.error.timeoutMs}ms (as expected)`);
  }
})();

console.log('\n=== All Key-Value Store Examples Complete ===');
