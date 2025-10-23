/**
 * Advanced Example: Event Bus with Supervision
 * 
 * This demonstrates:
 * - Pub-sub pattern
 * - Topic-based messaging
 * - Supervision and error recovery
 * - Multiple concurrent components
 */

import {
  type Message,
  type Component,
  randomURN,
  createHandlerComponent,
} from '@actor-framework/core';

import { createFIFOMailbox } from '@actor-framework/mailbox';
import { createLocalTransport } from '@actor-framework/transport';
import {
  createPubSubBroker,
  type PublishedMessage,
  createSupervisor,
  type ErrorNotification,
} from '@actor-framework/patterns';

// ============================================================================
// Event Types
// ============================================================================

interface UserEvent {
  type: 'user';
  action: 'created' | 'updated' | 'deleted';
  userId: string;
  timestamp: number;
}

interface OrderEvent {
  type: 'order';
  action: 'placed' | 'shipped' | 'delivered' | 'cancelled';
  orderId: string;
  userId: string;
  timestamp: number;
}

type DomainEvent = UserEvent | OrderEvent;

// ============================================================================
// Subscriber Components
// ============================================================================

/**
 * Analytics service - tracks all events
 */
const createAnalyticsService = () => {
  const urn = randomURN('analytics');
  let eventCount = 0;
  const eventsByType = new Map<string, number>();

  const handler = (message: PublishedMessage<DomainEvent>) => {
    eventCount++;
    
    const eventType = `${message.data.type}.${message.data.action}`;
    eventsByType.set(eventType, (eventsByType.get(eventType) ?? 0) + 1);

    console.log(`📊 [Analytics] Event ${eventCount}: ${eventType}`);
  };

  const component = createHandlerComponent<PublishedMessage<DomainEvent>>(urn, handler);

  return {
    component,
    getStats: () => ({
      totalEvents: eventCount,
      eventsByType: Object.fromEntries(eventsByType),
    }),
  };
};

/**
 * Email service - sends emails for certain events
 */
const createEmailService = (shouldFail: boolean = false) => {
  const urn = randomURN('email');
  let emailsSent = 0;

  const handler = (message: PublishedMessage<DomainEvent>) => {
    const event = message.data;

    // Simulate failure
    if (shouldFail && Math.random() < 0.3) {
      throw new Error('Email service temporarily unavailable');
    }

    // Only send emails for certain events
    if (event.type === 'user' && event.action === 'created') {
      emailsSent++;
      console.log(`📧 [Email] Sending welcome email to user ${event.userId}`);
    } else if (event.type === 'order' && event.action === 'shipped') {
      emailsSent++;
      console.log(`📧 [Email] Sending shipment notification for order ${event.orderId}`);
    }
  };

  const component = createHandlerComponent<PublishedMessage<DomainEvent>>(urn, handler);

  return {
    component,
    getStats: () => ({ emailsSent }),
  };
};

/**
 * Notification service - pushes notifications
 */
const createNotificationService = () => {
  const urn = randomURN('notifications');
  let notificationsSent = 0;

  const handler = (message: PublishedMessage<DomainEvent>) => {
    const event = message.data;

    if (event.type === 'order') {
      notificationsSent++;
      console.log(`🔔 [Notification] Order ${event.orderId}: ${event.action}`);
    }
  };

  const component = createHandlerComponent<PublishedMessage<DomainEvent>>(urn, handler);

  return {
    component,
    getStats: () => ({ notificationsSent }),
  };
};

// ============================================================================
// Main Application
// ============================================================================

async function main() {
  console.log('🎯 Event Bus with Supervision Example\n');

  // Create transport
  const transport = createLocalTransport<Message>();
  await transport.start();

  // Create pub-sub broker
  const broker = createPubSubBroker<DomainEvent>();

  // Create supervisor
  const supervisorURN = randomURN('supervisor');
  const supervisor = createSupervisor(
    supervisorURN,
    'restart', // Restart failed components
    3,         // Max 3 retries
    1000       // 1 second between retries
  );

  // Create services
  const analytics = createAnalyticsService();
  const email = createEmailService(false); // No failures initially
  const notifications = createNotificationService();

  const services = [analytics, email, notifications];

  // Set up mailboxes and subscriptions
  for (const service of services) {
    const mailbox = createFIFOMailbox<PublishedMessage<DomainEvent>>(
      service.component.send.bind(service.component)
    );
    mailbox.start();

    transport.registerHandler(service.component.urn, (msg) => {
      try {
        mailbox.enqueue(msg as PublishedMessage<DomainEvent>);
      } catch (error) {
        // Report error to supervisor
        const errorChannel = supervisor.createErrorChannel(service.component.urn);
        errorChannel.send({
          type: 'error',
          componentURN: service.component.urn,
          error: error instanceof Error ? error : new Error(String(error)),
          message: msg,
        });
      }
    });

    // Subscribe to all topics
    const channel = transport.createChannel<PublishedMessage<DomainEvent>>(
      service.component.urn
    );
    
    broker.subscribe('users', channel);
    broker.subscribe('orders', channel);

    // Register with supervisor
    supervisor.registerChild(service.component);
  }

  console.log('✅ Services started and subscribed to events\n');

  // =========================================================================
  // Publish events
  // =========================================================================

  console.log('=== Publishing Events ===\n');

  // User events
  broker.publish('users', {
    type: 'user',
    action: 'created',
    userId: 'user-001',
    timestamp: Date.now(),
  });
  await sleep(50);

  broker.publish('users', {
    type: 'user',
    action: 'updated',
    userId: 'user-001',
    timestamp: Date.now(),
  });
  await sleep(50);

  // Order events
  broker.publish('orders', {
    type: 'order',
    action: 'placed',
    orderId: 'order-001',
    userId: 'user-001',
    timestamp: Date.now(),
  });
  await sleep(50);

  broker.publish('orders', {
    type: 'order',
    action: 'shipped',
    orderId: 'order-001',
    userId: 'user-001',
    timestamp: Date.now(),
  });
  await sleep(50);

  broker.publish('orders', {
    type: 'order',
    action: 'delivered',
    orderId: 'order-001',
    userId: 'user-001',
    timestamp: Date.now(),
  });
  await sleep(50);

  // More user events
  broker.publish('users', {
    type: 'user',
    action: 'created',
    userId: 'user-002',
    timestamp: Date.now(),
  });
  await sleep(50);

  broker.publish('orders', {
    type: 'order',
    action: 'placed',
    orderId: 'order-002',
    userId: 'user-002',
    timestamp: Date.now(),
  });
  await sleep(50);

  broker.publish('orders', {
    type: 'order',
    action: 'cancelled',
    orderId: 'order-002',
    userId: 'user-002',
    timestamp: Date.now(),
  });
  await sleep(200);

  // =========================================================================
  // Display statistics
  // =========================================================================

  console.log('\n=== Statistics ===\n');

  console.log('Analytics:', analytics.getStats());
  console.log('Email:', email.getStats());
  console.log('Notifications:', notifications.getStats());

  console.log('\nBroker Stats:');
  console.log('- Topics:', broker.topics());
  console.log('- Users subscribers:', broker.subscriberCount('users'));
  console.log('- Orders subscribers:', broker.subscriberCount('orders'));

  // =========================================================================
  // Cleanup
  // =========================================================================

  console.log('\n=== Shutting Down ===\n');

  await supervisor.shutdownAll();
  broker.clear();
  await transport.stop();

  console.log('✅ All services shut down gracefully\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
