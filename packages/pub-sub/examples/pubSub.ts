/**
 * Publish/Subscribe Pattern Examples
 *
 * Demonstrates topic-based event broadcasting for decoupled communication.
 */

import { createPubSub } from '../src/pubSub.js';
import { createCapability, createMessage, type MessageOf } from '@servicejs/core';

// Example 1: Basic Pub/Sub
console.log('=== Example 1: Basic Pub/Sub ===');
{
  type EventMsg = MessageOf<'event', { name: string; data: unknown }>;

  const broker = createPubSub<EventMsg>();

  // Subscribe to topic
  const subscription = broker.subscribe('user.events', createCapability((msg) => {
    console.log(`Received event: ${msg.name}`);
  }));

  // Publish event
  broker.publish('user.events', createMessage('event', {
    name: 'user.login',
    data: { userId: '123' }
  }));

  // Unsubscribe
  subscription.unsubscribe();
  console.log('Unsubscribed');
}

// Example 2: Multiple Subscribers
console.log('\n=== Example 2: Multiple Subscribers ===');
{
  type EventMsg = MessageOf<'event', { name: string; data: unknown }>;

  const broker = createPubSub<EventMsg>();

  // Logger subscriber
  broker.subscribe('app.events', createCapability((msg) => {
    console.log(`[LOG] ${msg.name}`);
  }));

  // Metrics subscriber
  broker.subscribe('app.events', createCapability((msg) => {
    console.log(`[METRICS] Recording: ${msg.name}`);
  }));

  // Analytics subscriber
  broker.subscribe('app.events', createCapability((msg) => {
    console.log(`[ANALYTICS] Tracking: ${msg.name}`);
  }));

  // One publish, all subscribers receive
  const count = broker.publish('app.events', createMessage('event', {
    name: 'button.click',
    data: { buttonId: 'submit' }
  }));

  console.log(`Delivered to ${count} subscribers`);
}

// Example 3: Multiple Topics
console.log('\n=== Example 3: Multiple Topics ===');
{
  type EventMsg = MessageOf<'event', { name: string; data: unknown }>;

  const broker = createPubSub<EventMsg>();

  // Subscribe to different topics
  broker.subscribe('user.events', createCapability((msg) => {
    console.log(`[USER] ${msg.name}`);
  }));

  broker.subscribe('system.events', createCapability((msg) => {
    console.log(`[SYSTEM] ${msg.name}`);
  }));

  broker.subscribe('analytics', createCapability((msg) => {
    console.log(`[ANALYTICS] ${msg.name}`);
  }));

  // Publish to specific topics
  broker.publish('user.events', createMessage('event', {
    name: 'user.logout',
    data: {}
  }));

  broker.publish('system.events', createMessage('event', {
    name: 'disk.low',
    data: {}
  }));

  console.log('Active topics:', broker.topics());
}

// Example 4: Dynamic Subscriptions
console.log('\n=== Example 4: Dynamic Subscriptions ===');
{
  type EventMsg = MessageOf<'event', { name: string; data: unknown }>;

  const broker = createPubSub<EventMsg>();
  const subscriptions: any[] = [];

  // Add subscribers dynamically
  for (let i = 1; i <= 3; i++) {
    const sub = broker.subscribe('notifications', createCapability((msg) => {
      console.log(`Subscriber ${i} received: ${msg.name}`);
    }));
    subscriptions.push(sub);
  }

  console.log(`Subscriber count: ${broker.subscriberCount('notifications')}`);

  // Publish
  broker.publish('notifications', createMessage('event', {
    name: 'new.message',
    data: {}
  }));

  // Remove one subscriber
  subscriptions[1].unsubscribe();
  console.log(`After unsubscribe: ${broker.subscriberCount('notifications')}`);

  // Publish again
  broker.publish('notifications', createMessage('event', {
    name: 'another.message',
    data: {}
  }));
}

// Example 5: Event Bus Pattern
console.log('\n=== Example 5: Event Bus Pattern ===');
{
  type EventMsg = MessageOf<'event', { name: string; timestamp: number; data: unknown }>;

  const eventBus = createPubSub<EventMsg>();

  // System logger
  eventBus.subscribe('*', createCapability((msg) => {
    console.log(`[${new Date(msg.timestamp).toISOString()}] ${msg.name}`);
  }));

  // Error handler
  eventBus.subscribe('errors', createCapability((msg) => {
    console.error(`ERROR: ${msg.name}`, msg.data);
  }));

  // Regular events
  eventBus.publish('*', createMessage('event', {
    name: 'app.start',
    timestamp: Date.now(),
    data: {}
  }));

  // Error event
  eventBus.publish('errors', createMessage('event', {
    name: 'database.connection.failed',
    timestamp: Date.now(),
    data: { error: 'Connection timeout' }
  }));
}

// Example 6: Cleanup
console.log('\n=== Example 6: Cleanup ===');
{
  type EventMsg = MessageOf<'event', { name: string }>;

  const broker = createPubSub<EventMsg>();

  broker.subscribe('topic1', createCapability(() => {}));
  broker.subscribe('topic2', createCapability(() => {}));
  broker.subscribe('topic3', createCapability(() => {}));

  console.log('Topics before clear:', broker.topics());
  console.log('Total topics:', broker.topics().length);

  broker.clear();

  console.log('Topics after clear:', broker.topics());
  console.log('Total topics:', broker.topics().length);
}

console.log('\n=== All Pub/Sub Examples Complete ===');
