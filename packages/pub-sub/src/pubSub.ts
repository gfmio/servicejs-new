/**
 * @servicejs/pub-sub - Publish/Subscribe Pattern
 *
 * Topic-based event broadcasting for decoupled communication.
 */

import type { Message, Capability } from '@servicejs/core';

/**
 * A subscription to a topic.
 *
 * Can be used to unsubscribe from the topic.
 */
export interface Subscription {
  /**
   * The topic this subscription is for.
   */
  readonly topic: string;

  /**
   * Unsubscribe from the topic.
   */
  unsubscribe(): void;

  /**
   * Check if this subscription is still active.
   */
  isActive(): boolean;
}

/**
 * A publish/subscribe broker for topic-based messaging.
 *
 * Enables decoupled communication where publishers and subscribers
 * don't need direct references to each other.
 *
 * @typeParam TMsg - The message type
 *
 * @example
 * ```typescript
 * const broker = createPubSub<EventMessage>();
 *
 * // Subscribe to topic
 * const sub = broker.subscribe('user.events', userEventCap);
 *
 * // Publish to topic
 * broker.publish('user.events', { type: 'user-login', userId: '123' });
 *
 * // Unsubscribe
 * sub.unsubscribe();
 * ```
 */
export interface PubSub<TMsg extends Message> {
  /**
   * Subscribe to a topic.
   *
   * @param topic - The topic to subscribe to
   * @param capability - Capability to receive messages
   * @returns Subscription that can be used to unsubscribe
   */
  subscribe(topic: string, capability: Capability<TMsg>): Subscription;

  /**
   * Unsubscribe from a topic.
   *
   * @param subscription - The subscription to cancel
   */
  unsubscribe(subscription: Subscription): void;

  /**
   * Publish a message to a topic.
   *
   * All subscribers to the topic will receive the message.
   *
   * @param topic - The topic to publish to
   * @param message - The message to publish
   * @returns Number of subscribers that received the message
   */
  publish(topic: string, message: TMsg): number;

  /**
   * Get the number of subscribers for a topic.
   *
   * @param topic - The topic to check
   * @returns Number of active subscribers
   */
  subscriberCount(topic: string): number;

  /**
   * Get all active topics.
   *
   * @returns Array of topic names that have subscribers
   */
  topics(): readonly string[];

  /**
   * Clear all subscriptions.
   */
  clear(): void;
}

/**
 * Create a publish/subscribe broker.
 *
 * @returns A new pub/sub broker
 *
 * @example
 * ```typescript
 * type EventMsg = MessageOf<'event', { name: string; data: unknown }>;
 *
 * const broker = createPubSub<EventMsg>();
 *
 * // Subscriber 1
 * const sub1 = broker.subscribe('app.events', createCapability((msg) => {
 *   console.log('Subscriber 1:', msg);
 * }));
 *
 * // Subscriber 2
 * const sub2 = broker.subscribe('app.events', createCapability((msg) => {
 *   console.log('Subscriber 2:', msg);
 * }));
 *
 * // Publish to both subscribers
 * broker.publish('app.events', {
 *   type: 'event',
 *   name: 'user.login',
 *   data: { userId: '123' }
 * });
 * ```
 */
export function createPubSub<TMsg extends Message>(): PubSub<TMsg> {
  const subscriptions = new Map<string, Set<{ capability: Capability<TMsg>; active: boolean }>>();

  return {
    subscribe(topic: string, capability: Capability<TMsg>): Subscription {
      if (!subscriptions.has(topic)) {
        subscriptions.set(topic, new Set());
      }

      const sub = { capability, active: true };
      subscriptions.get(topic)!.add(sub);

      return {
        topic,

        unsubscribe(): void {
          sub.active = false;
          const subs = subscriptions.get(topic);
          if (subs) {
            subs.delete(sub);
            if (subs.size === 0) {
              subscriptions.delete(topic);
            }
          }
        },

        isActive(): boolean {
          return sub.active;
        },
      };
    },

    unsubscribe(subscription: Subscription): void {
      subscription.unsubscribe();
    },

    publish(topic: string, message: TMsg): number {
      const subs = subscriptions.get(topic);
      if (!subs) {
        return 0;
      }

      let count = 0;
      for (const sub of subs) {
        if (sub.active) {
          sub.capability.send(message);
          count++;
        }
      }

      return count;
    },

    subscriberCount(topic: string): number {
      const subs = subscriptions.get(topic);
      if (!subs) {
        return 0;
      }

      let count = 0;
      for (const sub of subs) {
        if (sub.active) {
          count++;
        }
      }

      return count;
    },

    topics(): readonly string[] {
      return Array.from(subscriptions.keys());
    },

    clear(): void {
      for (const subs of subscriptions.values()) {
        for (const sub of subs) {
          sub.active = false;
        }
        subs.clear();
      }
      subscriptions.clear();
    },
  };
}
