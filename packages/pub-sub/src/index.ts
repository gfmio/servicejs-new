/**
 * @servicejs/pub-sub
 *
 * Publish/Subscribe pattern for topic-based event broadcasting.
 *
 * This package provides:
 * - Topic-based subscriptions
 * - Multiple subscribers per topic
 * - Type-safe event publishing
 * - Subscription management
 *
 * @example
 * ```typescript
 * import { createPubSub } from '@servicejs/pub-sub';
 * import { createCapability } from '@servicejs/core';
 *
 * const broker = createPubSub<EventMessage>();
 *
 * // Subscribe to events
 * const subscription = broker.subscribe('user.events', createCapability((msg) => {
 *   console.log('Event received:', msg);
 * }));
 *
 * // Publish event
 * broker.publish('user.events', {
 *   type: 'event',
 *   name: 'user.login',
 *   data: { userId: '123' }
 * });
 *
 * // Unsubscribe
 * subscription.unsubscribe();
 * ```
 */

export {
  createPubSub,
  type PubSub,
  type Subscription,
} from './pubSub.js';
