/**
 * Event Bus with Pub/Sub Integration Example
 *
 * Demonstrates:
 * - Topic-based event broadcasting
 * - Multiple subscribers to same topic
 * - Multiple topics with different subscribers
 * - Dynamic subscription management
 * - Integration between @servicejs/core and @servicejs/pub-sub
 */

import {
  createComponent,
  createURN,
  stay,
  createCapability,
  createMessage,
  type MessageOf,
} from '@servicejs/core';
import { createPubSub } from '@servicejs/pub-sub';

// Define event types
type EventMsg = MessageOf<
  'event',
  {
    name: string;
    timestamp: number;
    data: unknown;
  }
>;

// Example 1: Basic Pub/Sub
console.log('=== Example 1: Basic Pub/Sub ===\n');
{
  const broker = createPubSub<EventMsg>();

  // Subscribe to user events
  console.log('Subscribing to "user.events"...');
  const subscription = broker.subscribe(
    'user.events',
    createCapability((msg) => {
      console.log(`📩 Event received: ${msg.name}`);
      console.log(`   Data: ${JSON.stringify(msg.data)}`);
    })
  );

  // Publish event
  console.log('\nPublishing user login event...');
  const count = broker.publish(
    'user.events',
    createMessage('event', {
      name: 'user.login',
      timestamp: Date.now(),
      data: { userId: '123', username: 'Alice' },
    })
  );

  console.log(`✓ Delivered to ${count} subscriber(s)\n`);

  // Unsubscribe
  subscription.unsubscribe();
  console.log('Unsubscribed from "user.events"');
  console.log(`Active: ${subscription.isActive()}`);
}

// Example 2: Multiple Subscribers
console.log('\n=== Example 2: Multiple Subscribers ===\n');
{
  const broker = createPubSub<EventMsg>();

  // Logger subscriber
  broker.subscribe(
    'app.events',
    createCapability((msg) => {
      console.log(`[LOGGER] ${new Date(msg.timestamp).toISOString()} - ${msg.name}`);
    })
  );

  // Metrics subscriber
  broker.subscribe(
    'app.events',
    createCapability((msg) => {
      console.log(`[METRICS] Recording event: ${msg.name}`);
    })
  );

  // Analytics subscriber
  broker.subscribe(
    'app.events',
    createCapability((msg) => {
      console.log(`[ANALYTICS] Tracking: ${msg.name}`);
    })
  );

  // Audit subscriber
  broker.subscribe(
    'app.events',
    createCapability((msg) => {
      console.log(`[AUDIT] Event logged: ${msg.name}`);
    })
  );

  console.log(`Subscribers to "app.events": ${broker.subscriberCount('app.events')}\n`);

  // Publish one event
  console.log('Publishing "button.click" event...\n');
  const count = broker.publish(
    'app.events',
    createMessage('event', {
      name: 'button.click',
      timestamp: Date.now(),
      data: { buttonId: 'submit' },
    })
  );

  console.log(`\n✓ Event delivered to ${count} subscriber(s)`);
}

// Example 3: Multiple Topics
console.log('\n=== Example 3: Multiple Topics ===\n');
{
  const broker = createPubSub<EventMsg>();

  // User events subscriber
  broker.subscribe(
    'user.events',
    createCapability((msg) => {
      console.log(`[USER] ${msg.name}`);
    })
  );

  // System events subscriber
  broker.subscribe(
    'system.events',
    createCapability((msg) => {
      console.log(`[SYSTEM] ${msg.name}`);
    })
  );

  // Analytics subscriber (multiple topics)
  const analyticsHandler = createCapability<EventMsg>((msg) => {
    console.log(`[ANALYTICS] ${msg.name}`);
  });
  broker.subscribe('user.events', analyticsHandler);
  broker.subscribe('system.events', analyticsHandler);

  console.log('Active topics:', broker.topics());
  console.log('');

  // Publish to different topics
  console.log('Publishing to "user.events":');
  broker.publish(
    'user.events',
    createMessage('event', {
      name: 'user.login',
      timestamp: Date.now(),
      data: {},
    })
  );

  console.log('\nPublishing to "system.events":');
  broker.publish(
    'system.events',
    createMessage('event', {
      name: 'disk.low',
      timestamp: Date.now(),
      data: { percent: 95 },
    })
  );
}

// Example 4: Dynamic Subscriptions
console.log('\n=== Example 4: Dynamic Subscriptions ===\n');
{
  const broker = createPubSub<EventMsg>();
  const subscriptions: Map<string, any> = new Map();

  // Add listener
  function addListener(id: string, topic: string) {
    const sub = broker.subscribe(
      topic,
      createCapability((msg) => {
        console.log(`[${id}] Received: ${msg.name}`);
      })
    );
    subscriptions.set(id, sub);
    console.log(`✓ Added listener "${id}" to topic "${topic}"`);
  }

  // Remove listener
  function removeListener(id: string) {
    const sub = subscriptions.get(id);
    if (sub) {
      sub.unsubscribe();
      subscriptions.delete(id);
      console.log(`✓ Removed listener "${id}"`);
    }
  }

  // Add listeners dynamically
  addListener('listener-1', 'notifications');
  addListener('listener-2', 'notifications');
  addListener('listener-3', 'notifications');

  console.log(`\nSubscribers: ${broker.subscriberCount('notifications')}\n`);

  // Publish event
  console.log('Publishing notification...\n');
  broker.publish(
    'notifications',
    createMessage('event', {
      name: 'new.message',
      timestamp: Date.now(),
      data: { from: 'Bob' },
    })
  );

  // Remove one listener
  console.log('');
  removeListener('listener-2');

  console.log(`\nSubscribers: ${broker.subscriberCount('notifications')}\n`);

  // Publish again
  console.log('Publishing another notification...\n');
  broker.publish(
    'notifications',
    createMessage('event', {
      name: 'another.message',
      timestamp: Date.now(),
      data: { from: 'Alice' },
    })
  );
}

// Example 5: Component Integration with Event Bus
console.log('\n=== Example 5: Component Integration ===\n');
{
  type AppState = { events: string[] };
  type AppMsg =
    | EventMsg
    | MessageOf<'clear-events', {}>;

  const appReducer = (state: AppState, msg: AppMsg) => {
    if (msg.type === 'event') {
      return stay({
        events: [...state.events, msg.name],
      }, appReducer);
    }

    if (msg.type === 'clear-events') {
      return stay({ events: [] }, appReducer);
    }

    return stay(state, appReducer);
  };

  const { component, capability } = createComponent(
    createURN('examples', 'event-collector'),
    { events: [] },
    appReducer
  );

  const broker = createPubSub<EventMsg>();

  // Subscribe component to events
  broker.subscribe('app.events', capability);

  // Publish some events
  console.log('Publishing events to the app...');
  broker.publish(
    'app.events',
    createMessage('event', {
      name: 'app.started',
      timestamp: Date.now(),
      data: {},
    })
  );

  broker.publish(
    'app.events',
    createMessage('event', {
      name: 'user.authenticated',
      timestamp: Date.now(),
      data: { userId: '123' },
    })
  );

  broker.publish(
    'app.events',
    createMessage('event', {
      name: 'data.loaded',
      timestamp: Date.now(),
      data: { records: 42 },
    })
  );

  console.log('\nCollected events:', component.getState().events);
}

// Example 6: Monitoring and Debugging
console.log('\n=== Example 6: Monitoring and Debugging ===\n');
{
  const broker = createPubSub<EventMsg>();

  // Set up various subscriptions
  broker.subscribe('user.events', createCapability(() => {}));
  broker.subscribe('user.events', createCapability(() => {}));
  broker.subscribe('system.events', createCapability(() => {}));
  broker.subscribe('analytics', createCapability(() => {}));
  broker.subscribe('errors', createCapability(() => {}));

  console.log('Active topics:', broker.topics());
  console.log('');

  // Check subscriber counts
  broker.topics().forEach((topic) => {
    console.log(`${topic}: ${broker.subscriberCount(topic)} subscriber(s)`);
  });

  // Publish to non-existent topic
  console.log('\nPublishing to non-existent topic "unknown"...');
  const count = broker.publish(
    'unknown',
    createMessage('event', {
      name: 'test',
      timestamp: Date.now(),
      data: {},
    })
  );

  if (count === 0) {
    console.log('⚠️  No subscribers for topic "unknown"');
  }

  // Clear all subscriptions
  console.log('\nClearing all subscriptions...');
  broker.clear();
  console.log('Active topics after clear:', broker.topics());
}

console.log('\n=== All Event Bus Examples Complete ===');
