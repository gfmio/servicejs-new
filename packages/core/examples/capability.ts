/**
 * Capability Examples
 *
 * Capabilities are unforgeable references that mediate access to components.
 * They provide structural security by ensuring only holders can interact with a target.
 */

import {
  createCapability,
  mapCapability,
  filterCapability,
  composeCapabilities,
  interceptCapability,
  nullCapability,
  type Capability,
} from '../src/capability.js';
import { createMessage, type MessageOf } from '../src/message.js';

// Example 1: Basic Capability Creation
console.log('=== Example 1: Basic Capability ===');
{
  type LogMessage = MessageOf<'log', { text: string }>;

  const messages: string[] = [];
  const logCapability = createCapability<LogMessage>((msg) => {
    messages.push(msg.text);
    console.log(`[LOG] ${msg.text}`);
  });

  logCapability.send(createMessage('log', { text: 'Hello, world!' }));
  logCapability.send(createMessage('log', { text: 'Capability working!' }));

  console.log('Collected messages:', messages);
}

// Example 2: Mapping Messages (Adapter Pattern)
console.log('\n=== Example 2: Mapping Messages ===');
{
  type NumberMessage = MessageOf<'number', { value: number }>;
  type StringMessage = MessageOf<'string', { text: string }>;

  const numberCap = createCapability<NumberMessage>((msg) => {
    console.log(`Received number: ${msg.value}`);
  });

  // Adapt string messages to number messages
  const stringCap = mapCapability(numberCap, (msg: StringMessage) =>
    createMessage('number', { value: parseInt(msg.text) })
  );

  stringCap.send(createMessage('string', { text: '42' }));
  stringCap.send(createMessage('string', { text: '123' }));
}

// Example 3: Filtering Messages
console.log('\n=== Example 3: Filtering Messages ===');
{
  type CommandMessage = MessageOf<'command', { cmd: string; priority: number }>;

  let processedCount = 0;
  const commandCap = createCapability<CommandMessage>((msg) => {
    processedCount++;
    console.log(`Processing command: ${msg.cmd} (priority ${msg.priority})`);
  });

  // Only process high-priority commands
  const highPriorityCap = filterCapability(
    commandCap,
    (msg) => msg.priority >= 5
  );

  highPriorityCap.send(createMessage('command', { cmd: 'deploy', priority: 8 }));
  highPriorityCap.send(createMessage('command', { cmd: 'test', priority: 3 })); // Filtered out
  highPriorityCap.send(createMessage('command', { cmd: 'backup', priority: 7 }));

  console.log(`Processed ${processedCount} commands (2 expected, 1 filtered)`);
}

// Example 4: Composing Capabilities (Broadcasting)
console.log('\n=== Example 4: Composing Capabilities ===');
{
  type EventMessage = MessageOf<'event', { name: string; data: unknown }>;

  const consoleLogger = createCapability<EventMessage>((msg) => {
    console.log(`[Console] ${msg.name}:`, msg.data);
  });

  const fileLogger = createCapability<EventMessage>((msg) => {
    console.log(`[File] Writing ${msg.name} to log.txt`);
  });

  const metricsCollector = createCapability<EventMessage>((msg) => {
    console.log(`[Metrics] Recording ${msg.name}`);
  });

  // Broadcast to all three capabilities
  const broadcaster = composeCapabilities([
    consoleLogger,
    fileLogger,
    metricsCollector,
  ]);

  broadcaster.send(createMessage('event', { name: 'user.login', data: { userId: 123 } }));
}

// Example 5: Intercepting Messages (Logging/Debugging)
console.log('\n=== Example 5: Intercepting Messages ===');
{
  type ApiMessage = MessageOf<'api', { endpoint: string; method: string }>;

  const apiHandler = createCapability<ApiMessage>((msg) => {
    console.log(`Handling ${msg.method} ${msg.endpoint}`);
  });

  // Add logging interceptor
  const interceptedApi = interceptCapability(apiHandler, (msg) => {
    console.log(`[Interceptor] Before: ${msg.method} ${msg.endpoint}`);
  });

  interceptedApi.send(createMessage('api', { endpoint: '/users', method: 'GET' }));
  interceptedApi.send(createMessage('api', { endpoint: '/posts', method: 'POST' }));
}

// Example 6: Null Capability (Testing)
console.log('\n=== Example 6: Null Capability ===');
{
  type TestMessage = MessageOf<'test', { value: number }>;

  const nullCap = nullCapability<TestMessage>();

  // Safe to use in tests - messages are silently discarded
  nullCap.send(createMessage('test', { value: 1 }));
  nullCap.send(createMessage('test', { value: 2 }));

  console.log('Null capability discarded all messages silently');
}

// Example 7: Capability Chains (Pipeline)
console.log('\n=== Example 7: Capability Chains ===');
{
  type InputMessage = MessageOf<'input', { value: number }>;

  const finalHandler = createCapability<InputMessage>((msg) => {
    console.log(`Final value: ${msg.value}`);
  });

  // Chain: intercept -> filter -> intercept -> handle
  const pipeline = interceptCapability(
    filterCapability(
      interceptCapability(finalHandler, (msg) => {
        console.log(`[Inner intercept] Value: ${msg.value}`);
      }),
      (msg) => msg.value > 0 // Only positive numbers
    ),
    (msg) => {
      console.log(`[Outer intercept] Received: ${msg.value}`);
    }
  );

  pipeline.send(createMessage('input', { value: 10 }));
  pipeline.send(createMessage('input', { value: -5 })); // Filtered
  pipeline.send(createMessage('input', { value: 42 }));
}

console.log('\n=== All Capability Examples Complete ===');
