# @servicejs/pub-sub

Publish/Subscribe pattern for ServiceJS - Topic-based event broadcasting for decoupled communication.

## Overview

`@servicejs/pub-sub` provides a topic-based publish/subscribe messaging pattern for ServiceJS applications. It enables decoupled communication where publishers and subscribers don't need direct references to each other.

**Features:**
- Topic-based subscriptions
- Multiple subscribers per topic
- Type-safe event publishing
- Subscription management (subscribe/unsubscribe)
- Subscriber counting and topic listing
- Clean unsubscription

## Installation

```bash
npm install @servicejs/pub-sub @servicejs/core
# or
bun add @servicejs/pub-sub @servicejs/core
```

## Quick Start

```typescript
import { createPubSub } from '@servicejs/pub-sub';
import { createCapability, createMessage } from '@servicejs/core';

type EventMsg = MessageOf<'event', { name: string; data: unknown }>;

// Create broker
const broker = createPubSub<EventMsg>();

// Subscribe to topic
const subscription = broker.subscribe('user.events', createCapability((msg) => {
  console.log('Event received:', msg.name, msg.data);
}));

// Publish event
broker.publish('user.events', createMessage('event', {
  name: 'user.login',
  data: { userId: '123', timestamp: Date.now() }
}));

// Later: unsubscribe
subscription.unsubscribe();
```

## Core Concepts

### Topics

Topics are string identifiers that categorize messages. Common patterns:

- **Hierarchical**: `app.user.login`, `app.user.logout`, `app.system.error`
- **Flat**: `user-events`, `system-events`, `analytics`
- **Wildcards**: Some systems support `app.*` or `app.user.*` (not built-in)

### Publishers

Publishers send messages to topics without knowing who (if anyone) is subscribed.

```typescript
const count = broker.publish('notifications', createMessage('event', {
  name: 'new-message',
  data: { messageId: '456' }
}));

console.log(`Delivered to ${count} subscribers`);
```

### Subscribers

Subscribers express interest in topics via capabilities.

```typescript
const subscription = broker.subscribe('notifications', notificationCapability);

// Later...
subscription.unsubscribe();
```

### Broker

The broker manages subscriptions and routes messages from publishers to subscribers.

```typescript
const broker = createPubSub<EventMessage>();
```

## API Reference

### `createPubSub<TMsg>()`

Creates a new publish/subscribe broker.

**Returns:** `PubSub<TMsg>`

**Example:**
```typescript
const broker = createPubSub<EventMessage>();
```

### `broker.subscribe(topic, capability)`

Subscribe to a topic.

**Parameters:**
- `topic: string` - The topic to subscribe to
- `capability: Capability<TMsg>` - Capability to receive messages

**Returns:** `Subscription`

**Example:**
```typescript
const subscription = broker.subscribe('app.events', eventCapability);
```

### `broker.unsubscribe(subscription)`

Unsubscribe from a topic.

**Parameters:**
- `subscription: Subscription` - The subscription to cancel

**Example:**
```typescript
broker.unsubscribe(subscription);
// or
subscription.unsubscribe();
```

### `broker.publish(topic, message)`

Publish a message to a topic.

**Parameters:**
- `topic: string` - The topic to publish to
- `message: TMsg` - The message to publish

**Returns:** `number` - Number of subscribers that received the message

**Example:**
```typescript
const count = broker.publish('alerts', alertMessage);
console.log(`Delivered to ${count} subscribers`);
```

### `broker.subscriberCount(topic)`

Get the number of subscribers for a topic.

**Parameters:**
- `topic: string` - The topic to check

**Returns:** `number`

**Example:**
```typescript
const count = broker.subscriberCount('app.events');
console.log(`${count} subscribers to app.events`);
```

### `broker.topics()`

Get all active topics.

**Returns:** `readonly string[]`

**Example:**
```typescript
const topics = broker.topics();
console.log('Active topics:', topics);
```

### `broker.clear()`

Clear all subscriptions.

**Example:**
```typescript
broker.clear(); // Removes all subscriptions
```

### Subscription Methods

```typescript
interface Subscription {
  readonly topic: string;
  unsubscribe(): void;
  isActive(): boolean;
}
```

## Common Patterns

### Event Bus

```typescript
type EventMsg = MessageOf<'event', { name: string; timestamp: number; data: unknown }>;

const eventBus = createPubSub<EventMsg>();

// System logger subscribes to all events
eventBus.subscribe('*', createCapability((msg) => {
  console.log(`[${new Date(msg.timestamp).toISOString()}] ${msg.name}`);
}));

// Metrics collector
eventBus.subscribe('*', createCapability((msg) => {
  recordMetric(msg.name);
}));

// Publish events
eventBus.publish('*', createMessage('event', {
  name: 'app.started',
  timestamp: Date.now(),
  data: {}
}));
```

### Topic-Based Routing

```typescript
const broker = createPubSub<EventMsg>();

// Subscribe to specific topics
broker.subscribe('user.events', userEventHandler);
broker.subscribe('system.events', systemEventHandler);
broker.subscribe('analytics', analyticsHandler);

// Publishers target specific topics
broker.publish('user.events', createMessage('event', {
  name: 'user.login',
  data: { userId: '123' }
}));

broker.publish('system.events', createMessage('event', {
  name: 'disk.low',
  data: { percent: 95 }
}));
```

### Multiple Subscribers

```typescript
const broker = createPubSub<EventMsg>();

// Multiple components subscribe to same topic
broker.subscribe('app.events', loggerCapability);
broker.subscribe('app.events', metricsCapability);
broker.subscribe('app.events', analyticsCapability);
broker.subscribe('app.events', auditCapability);

// One publish, all receive
broker.publish('app.events', createMessage('event', {
  name: 'important.action',
  data: {}
}));
```

### Dynamic Subscriptions

```typescript
const broker = createPubSub<EventMsg>();
const subscriptions = new Map<string, Subscription>();

// Add subscription
function addListener(listenerId: string, topic: string, cap: Capability) {
  const subscription = broker.subscribe(topic, cap);
  subscriptions.set(listenerId, subscription);
}

// Remove subscription
function removeListener(listenerId: string) {
  const subscription = subscriptions.get(listenerId);
  if (subscription) {
    subscription.unsubscribe();
    subscriptions.delete(listenerId);
  }
}
```

### Component Integration

```typescript
type AppState = { events: EventMsg[] };
type AppMsg = EventMsg | MessageOf<'clear-events', {}>;

const appReducer: Reducer<AppState, AppMsg> = (state, msg) => {
  if (msg.type === 'event') {
    // Store event
    return stay(
      { events: [...state.events, msg] },
      appReducer,
      // Broadcast to pub/sub
      [emitTo(publishCapability, msg)]
    );
  }

  if (msg.type === 'clear-events') {
    return stay({ events: [] }, appReducer);
  }

  return stay(state, appReducer);
};

// Set up pub/sub
const broker = createPubSub<EventMsg>();

const publishCapability = createCapability<EventMsg>((msg) => {
  broker.publish('app.events', msg);
});

// Subscribers
broker.subscribe('app.events', loggerCapability);
broker.subscribe('app.events', metricsCapability);
```

### Lifecycle Management

```typescript
class EventListener {
  private subscription: Subscription | null = null;

  start(broker: PubSub<EventMsg>, topic: string) {
    this.subscription = broker.subscribe(topic, createCapability((msg) => {
      this.handleEvent(msg);
    }));
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  handleEvent(msg: EventMsg) {
    console.log('Received:', msg);
  }
}

const listener = new EventListener();
listener.start(broker, 'app.events');

// Later...
listener.stop();
```

### Filtered Subscriptions

```typescript
const broker = createPubSub<EventMsg>();

// Subscribe with filtering
broker.subscribe('all.events', createCapability((msg) => {
  if (msg.data.level === 'error') {
    handleError(msg);
  }
}));

// Or use filterCapability from @servicejs/core
import { filterCapability } from '@servicejs/core';

const errorCap = filterCapability(
  eventCapability,
  (msg) => msg.data.level === 'error'
);

broker.subscribe('all.events', errorCap);
```

## Best Practices

1. **Use descriptive topics** - `user.login` is better than `event1`
2. **Consistent naming** - Choose a convention (dot, dash, camel case) and stick to it
3. **Unsubscribe when done** - Prevent memory leaks by unsubscribing
4. **Check subscriber count** - Useful for debugging and monitoring
5. **Type safety** - Use specific message types for topics
6. **Avoid wildcards** - Be explicit about topics (unless building event bus)
7. **Clean up** - Use `broker.clear()` for shutdown/cleanup

## Topic Naming Conventions

### Hierarchical (Recommended)
```
app.user.login
app.user.logout
app.system.error
app.system.startup
```

### Flat
```
user-events
system-events
analytics
notifications
```

### Action-Based
```
user.created
user.updated
user.deleted
order.placed
order.shipped
```

### Domain-Based
```
auth.login
auth.logout
orders.create
orders.cancel
payments.process
```

## Monitoring and Debugging

```typescript
// Check active topics
console.log('Active topics:', broker.topics());

// Check subscriber count
broker.topics().forEach((topic) => {
  console.log(`${topic}: ${broker.subscriberCount(topic)} subscribers`);
});

// Track publish success
const count = broker.publish('app.events', msg);
if (count === 0) {
  console.warn('No subscribers for app.events');
}
```

## Examples

See the [examples directory](./examples) for complete working examples:

- [Pub/Sub Examples](./examples/pubSub.ts) - Basic usage, multiple subscribers, topics, event bus

## Comparison with Other Patterns

| Pattern | Use Case | Coupling |
|---------|----------|----------|
| **Pub/Sub** | One-to-many broadcasting | Decoupled |
| **Request/Reply** | One-to-one RPC | Coupled |
| **Direct capability** | One-to-one messaging | Coupled |

## License

MIT
