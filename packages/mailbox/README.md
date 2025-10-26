# @servicejs/mailbox

Mailbox implementations for ServiceJS - FIFO, Priority, and Bounded queues for message buffering.

## Overview

`@servicejs/mailbox` provides different mailbox types for queuing and buffering messages in ServiceJS applications:

- **FIFO Mailbox**: First-in-first-out delivery (standard queue)
- **Priority Mailbox**: Priority-based delivery (higher priority first)
- **Bounded Mailbox**: Capacity-limited with backpressure (rejects when full)
- **Async Mailbox**: Asynchronous message processing (for I/O operations)
- **Helper Utilities**: Integrate mailboxes with components easily

## Installation

```bash
npm install @servicejs/mailbox @servicejs/core
# or
bun add @servicejs/mailbox @servicejs/core
```

## Quick Start

### FIFO Mailbox

```typescript
import { createFIFOMailbox } from '@servicejs/mailbox';
import { createMessage } from '@servicejs/core';

const mailbox = createFIFOMailbox<LogMessage>();

// Enqueue messages
mailbox.enqueue(createMessage('log', { text: 'First' }));
mailbox.enqueue(createMessage('log', { text: 'Second' }));
mailbox.enqueue(createMessage('log', { text: 'Third' }));

// Dequeue in order
const msg1 = mailbox.dequeue(); // Some({ text: 'First' })
const msg2 = mailbox.dequeue(); // Some({ text: 'Second' })
const msg3 = mailbox.dequeue(); // Some({ text: 'Third' })
```

### Priority Mailbox

```typescript
import { createPriorityMailbox } from '@servicejs/mailbox';

type TaskMsg = MessageOf<'task', { name: string; priority: number }>;

const mailbox = createPriorityMailbox<TaskMsg>(msg => msg.priority);

// Enqueue in any order
mailbox.enqueue(createMessage('task', { name: 'Low', priority: 1 }));
mailbox.enqueue(createMessage('task', { name: 'Urgent', priority: 10 }));
mailbox.enqueue(createMessage('task', { name: 'Medium', priority: 5 }));

// Dequeue by priority (highest first)
const msg1 = mailbox.dequeue(); // Urgent (priority 10)
const msg2 = mailbox.dequeue(); // Medium (priority 5)
const msg3 = mailbox.dequeue(); // Low (priority 1)
```

### Bounded Mailbox

```typescript
import { createBoundedMailbox } from '@servicejs/mailbox';

const mailbox = createBoundedMailbox<Message>(10); // Max 10 messages

// Enqueue messages
const result1 = mailbox.enqueue(createMessage('data', { value: 1 }));
console.log(result1.success); // true

// Fill to capacity
for (let i = 0; i < 9; i++) {
  mailbox.enqueue(createMessage('data', { value: i }));
}

// Try to exceed capacity
const result2 = mailbox.enqueue(createMessage('data', { value: 11 }));
if (!result2.success) {
  console.log('Mailbox full:', result2.reason); // 'full'
}

console.log(mailbox.isFull()); // true
console.log(mailbox.available()); // 0
```

## Mailbox Types

### FIFO Mailbox

First-in-first-out delivery. The simplest and most common mailbox type.

**Use cases:**
- Standard message queuing
- Event processing
- Task queues
- Message buffering

**API:**
```typescript
interface FIFOMailbox<TMsg> {
  enqueue(message: TMsg): void;
  dequeue(): Option<TMsg>;
  peek(): Option<TMsg>;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}
```

**Example:**
```typescript
const buffer = createFIFOMailbox<EventMessage>();

// Producer
buffer.enqueue(createMessage('event', { name: 'click' }));
buffer.enqueue(createMessage('event', { name: 'submit' }));

// Consumer
while (!buffer.isEmpty()) {
  const event = buffer.dequeue();
  if (event.isSome()) {
    processEvent(event.value);
  }
}
```

### Priority Mailbox

Priority-based delivery where higher priority messages are delivered first.

**Use cases:**
- Task scheduling
- Alert/notification systems
- Emergency handling
- Quality of Service (QoS)

**API:**
```typescript
interface PriorityMailbox<TMsg> {
  enqueue(message: TMsg): void;
  dequeue(): Option<TMsg>;
  peek(): Option<TMsg>;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}
```

**Example:**
```typescript
type AlertMsg = MessageOf<'alert', { level: 'low' | 'medium' | 'high'; text: string }>;

const priorityMap = { high: 10, medium: 5, low: 1 };
const mailbox = createPriorityMailbox<AlertMsg>(msg => priorityMap[msg.level]);

mailbox.enqueue(createMessage('alert', { level: 'medium', text: 'Warning' }));
mailbox.enqueue(createMessage('alert', { level: 'low', text: 'Info' }));
mailbox.enqueue(createMessage('alert', { level: 'high', text: 'Critical!' }));

// Processes in order: high, medium, low
while (!mailbox.isEmpty()) {
  const alert = mailbox.dequeue();
  if (alert.isSome()) {
    handleAlert(alert.value);
  }
}
```

**Equal Priorities:**
Messages with equal priority maintain FIFO order within that priority level.

### Bounded Mailbox

Capacity-limited mailbox that provides backpressure by rejecting messages when full.

**Use cases:**
- Backpressure management
- Rate limiting
- Memory protection
- Buffer overflow prevention

**API:**
```typescript
interface BoundedMailbox<TMsg> {
  enqueue(message: TMsg): EnqueueResult;
  dequeue(): Option<TMsg>;
  peek(): Option<TMsg>;
  size(): number;
  capacity(): number;
  isEmpty(): boolean;
  isFull(): boolean;
  available(): number;
  clear(): void;
}

type EnqueueResult =
  | { success: true }
  | { success: false; reason: 'full' };
```

**Example:**
```typescript
const mailbox = createBoundedMailbox<RequestMessage>(100);

// Producer with backpressure handling
function sendRequest(request: RequestMessage) {
  const result = mailbox.enqueue(request);

  if (!result.success) {
    // Handle backpressure
    console.log('Mailbox full, applying backpressure');
    // Options: retry later, drop, signal upstream, etc.
  }
}

// Consumer
function processRequests() {
  const request = mailbox.dequeue();
  if (request.isSome()) {
    handleRequest(request.value);
  }
}

// Monitor capacity
console.log(`Capacity: ${mailbox.capacity()}`);
console.log(`Current: ${mailbox.size()}`);
console.log(`Available: ${mailbox.available()}`);
console.log(`Full: ${mailbox.isFull()}`);
```

### Async Mailbox

Asynchronous message processing for I/O operations, API calls, and database queries.

**Use cases:**
- I/O operations (file system, network)
- API requests
- Database queries
- Any asynchronous processing

**API:**
```typescript
interface AsyncMailbox<TMsg> {
  enqueue(message: TMsg): void;
  start(handler: (message: TMsg) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  size(): number;
  isEmpty(): boolean;
  isRunning(): boolean;
  clear(): void;
}
```

**Example:**
```typescript
const mailbox = createAsyncMailbox<ApiRequestMsg>();

// Enqueue requests
mailbox.enqueue(createMessage('api-request', { url: '/users' }));
mailbox.enqueue(createMessage('api-request', { url: '/posts' }));

// Start processing
const processPromise = mailbox.start(async (msg) => {
  const response = await fetch(msg.url);
  const data = await response.json();
  console.log('Received:', data);
});

// Later: stop processing
await mailbox.stop();
await processPromise;
```

**Key Features:**
- Sequential processing (waits for each handler to complete)
- Graceful shutdown (waits for current message)
- Error handling (continues processing after errors)
- Messages can be enqueued while processing

## Helper Utilities

Helper functions for integrating mailboxes with components.

### createMailboxCapability

Wrap a capability with a mailbox for buffered sends.

```typescript
import { createMailboxCapability } from '@servicejs/mailbox';

const mailbox = createFIFOMailbox<MyMsg>();
const bufferedCap = createMailboxCapability(mailbox, component.capability);

// Messages are queued, not sent immediately
bufferedCap.send(message1);
bufferedCap.send(message2);

// Process manually
while (!mailbox.isEmpty()) {
  const msg = mailbox.dequeue();
  if (msg.isSome()) {
    component.capability.send(msg.value);
  }
}
```

### wrapComponentWithMailbox

Wrap a component capability with a mailbox and processing controls.

```typescript
import { wrapComponentWithMailbox } from '@servicejs/mailbox';

const mailbox = createFIFOMailbox<MyMsg>();
const wrapped = wrapComponentWithMailbox(mailbox, component.capability, {
  autoProcess: false, // Manual processing
});

// Queue messages
wrapped.capability.send(message1);
wrapped.capability.send(message2);

// Process all
wrapped.processMessages();

// Or process in batches
wrapped.processBatch(10);
```

**Options:**
- `autoProcess`: Automatically process messages on send (default: false)
- `batchSize`: Maximum messages to process per send (default: Infinity)

### createAutoProcessingCapability

Create a capability that automatically processes messages through a mailbox.

```typescript
import { createAutoProcessingCapability } from '@servicejs/mailbox';

const mailbox = createFIFOMailbox<MyMsg>();
const autoCap = createAutoProcessingCapability(mailbox, component.capability);

// Messages are processed immediately in FIFO order
autoCap.send(message1);
autoCap.send(message2);
// Both messages already processed
```

**Use case:** Ensure sequential processing even with concurrent sends.

## Common Patterns

### Producer-Consumer with FIFO

```typescript
const mailbox = createFIFOMailbox<WorkItem>();

// Producer
function addWork(item: WorkItem) {
  mailbox.enqueue(item);
}

// Consumer
function processWork() {
  const item = mailbox.dequeue();
  if (item.isSome()) {
    doWork(item.value);
  }
}
```

### Priority Queue for Task Scheduling

```typescript
type Task = MessageOf<'task', { id: number; priority: number; work: () => void }>;

const scheduler = createPriorityMailbox<Task>(task => task.priority);

function scheduleTask(priority: number, work: () => void) {
  scheduler.enqueue(createMessage('task', {
    id: generateId(),
    priority,
    work,
  }));
}

function runNextTask() {
  const task = scheduler.dequeue();
  if (task.isSome()) {
    task.value.work();
  }
}
```

### Bounded Buffer with Overflow Handling

```typescript
const buffer = createBoundedMailbox<DataChunk>(1000);
let droppedCount = 0;

function bufferData(chunk: DataChunk) {
  const result = buffer.enqueue(chunk);

  if (!result.success) {
    droppedCount++;

    // Log overflow
    if (droppedCount % 100 === 0) {
      console.warn(`Dropped ${droppedCount} chunks due to full buffer`);
    }

    // Optional: implement drop strategy
    // - Drop oldest (dequeue then enqueue new)
    // - Apply backpressure to source
    // - Save to disk
  }
}
```

### Circular Buffer Pattern

```typescript
const buffer = createBoundedMailbox<Message>(10);

function circularEnqueue(message: Message) {
  const result = buffer.enqueue(message);

  if (!result.success) {
    // Remove oldest to make room
    buffer.dequeue();
    buffer.enqueue(message);
  }
}
```

## API Reference

### Common Methods (All Mailboxes)

- `enqueue(message)` - Add message to mailbox
  - FIFO/Priority: `void`
  - Bounded: `EnqueueResult`
- `dequeue()` - Remove and return next message (`Option<TMsg>`)
- `peek()` - Look at next message without removing (`Option<TMsg>`)
- `size()` - Get number of queued messages (`number`)
- `isEmpty()` - Check if mailbox is empty (`boolean`)
- `clear()` - Remove all messages

### Bounded Mailbox Additional Methods

- `capacity()` - Get maximum capacity (`number`)
- `isFull()` - Check if mailbox is at capacity (`boolean`)
- `available()` - Get number of available slots (`number`)

### Async Mailbox Methods

- `start(handler)` - Start processing messages (`Promise<void>`)
- `stop()` - Stop processing (waits for current message) (`Promise<void>`)
- `isRunning()` - Check if currently processing (`boolean`)

## Examples

See the [examples directory](./examples) for complete working examples:

- [FIFO Examples](./examples/fifoMailbox.ts) - Basic queuing and buffering
- [Priority Examples](./examples/priorityMailbox.ts) - Task scheduling and alerts
- [Bounded Examples](./examples/boundedMailbox.ts) - Backpressure and rate limiting
- [Async Examples](./examples/asyncMailbox.ts) - Asynchronous I/O operations
- [Helper Examples](./examples/helpers.ts) - Component integration utilities

## Performance Considerations

### FIFO Mailbox
- **Enqueue**: O(1)
- **Dequeue**: O(1)
- **Memory**: O(n) where n is queue size

### Priority Mailbox
- **Enqueue**: O(n) - inserts in priority order
- **Dequeue**: O(1) - highest priority is at front
- **Memory**: O(n) where n is queue size

### Bounded Mailbox
- **Enqueue**: O(1)
- **Dequeue**: O(1)
- **Memory**: O(capacity) - fixed upper bound

### Async Mailbox
- **Enqueue**: O(1)
- **Processing**: Sequential (one at a time)
- **Memory**: O(n) where n is queue size
- **Note**: Async processing ensures sequential execution even with concurrent enqueues

## License

MIT
