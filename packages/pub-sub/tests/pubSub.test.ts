import { describe, test, expect } from 'bun:test';
import { createPubSub } from '../src/pubSub';
import { createCapability, createMessage, type MessageOf } from '@servicejs/core';

type EventMsg = MessageOf<'event', { name: string; data: unknown }>;

describe('PubSub', () => {
  describe('subscribe', () => {
    test('creates subscription', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const subscription = broker.subscribe('test.topic', cap);

      expect(subscription.topic).toBe('test.topic');
      expect(subscription.isActive()).toBe(true);
    });

    test('allows multiple subscriptions to same topic', () => {
      const broker = createPubSub<EventMsg>();
      const cap1 = createCapability<EventMsg>(() => {});
      const cap2 = createCapability<EventMsg>(() => {});

      broker.subscribe('test.topic', cap1);
      broker.subscribe('test.topic', cap2);

      expect(broker.subscriberCount('test.topic')).toBe(2);
    });

    test('allows subscriptions to different topics', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      broker.subscribe('topic1', cap);
      broker.subscribe('topic2', cap);

      expect(broker.topics()).toContain('topic1');
      expect(broker.topics()).toContain('topic2');
    });
  });

  describe('unsubscribe', () => {
    test('removes subscription', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const subscription = broker.subscribe('test.topic', cap);
      expect(broker.subscriberCount('test.topic')).toBe(1);

      subscription.unsubscribe();

      expect(subscription.isActive()).toBe(false);
      expect(broker.subscriberCount('test.topic')).toBe(0);
    });

    test('removes topic when last subscriber unsubscribes', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const subscription = broker.subscribe('test.topic', cap);
      expect(broker.topics()).toContain('test.topic');

      subscription.unsubscribe();

      expect(broker.topics()).not.toContain('test.topic');
    });

    test('using broker.unsubscribe', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const subscription = broker.subscribe('test.topic', cap);
      broker.unsubscribe(subscription);

      expect(subscription.isActive()).toBe(false);
      expect(broker.subscriberCount('test.topic')).toBe(0);
    });
  });

  describe('publish', () => {
    test('delivers message to subscriber', () => {
      const broker = createPubSub<EventMsg>();
      let received: EventMsg | null = null;

      const cap = createCapability<EventMsg>((msg) => {
        received = msg;
      });

      broker.subscribe('test.topic', cap);

      const msg = createMessage('event', { name: 'test', data: { value: 42 } });
      const count = broker.publish('test.topic', msg);

      expect(count).toBe(1);
      expect(received).toBe(msg);
    });

    test('delivers to all subscribers', () => {
      const broker = createPubSub<EventMsg>();
      const received: EventMsg[] = [];

      const cap1 = createCapability<EventMsg>((msg) => received.push(msg));
      const cap2 = createCapability<EventMsg>((msg) => received.push(msg));
      const cap3 = createCapability<EventMsg>((msg) => received.push(msg));

      broker.subscribe('test.topic', cap1);
      broker.subscribe('test.topic', cap2);
      broker.subscribe('test.topic', cap3);

      const msg = createMessage('event', { name: 'test', data: {} });
      const count = broker.publish('test.topic', msg);

      expect(count).toBe(3);
      expect(received.length).toBe(3);
      expect(received[0]).toBe(msg);
    });

    test('returns 0 for topic with no subscribers', () => {
      const broker = createPubSub<EventMsg>();

      const msg = createMessage('event', { name: 'test', data: {} });
      const count = broker.publish('nonexistent.topic', msg);

      expect(count).toBe(0);
    });

    test('only delivers to specific topic', () => {
      const broker = createPubSub<EventMsg>();
      const received: string[] = [];

      broker.subscribe('topic1', createCapability<EventMsg>(() => received.push('topic1')));
      broker.subscribe('topic2', createCapability<EventMsg>(() => received.push('topic2')));

      const msg = createMessage('event', { name: 'test', data: {} });
      broker.publish('topic1', msg);

      expect(received).toEqual(['topic1']);
    });
  });

  describe('subscriberCount', () => {
    test('returns correct count', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      expect(broker.subscriberCount('test.topic')).toBe(0);

      broker.subscribe('test.topic', cap);
      expect(broker.subscriberCount('test.topic')).toBe(1);

      broker.subscribe('test.topic', cap);
      expect(broker.subscriberCount('test.topic')).toBe(2);
    });

    test('decreases when unsubscribing', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const sub1 = broker.subscribe('test.topic', cap);
      const sub2 = broker.subscribe('test.topic', cap);

      expect(broker.subscriberCount('test.topic')).toBe(2);

      sub1.unsubscribe();
      expect(broker.subscriberCount('test.topic')).toBe(1);

      sub2.unsubscribe();
      expect(broker.subscriberCount('test.topic')).toBe(0);
    });
  });

  describe('topics', () => {
    test('returns empty array initially', () => {
      const broker = createPubSub<EventMsg>();

      expect(broker.topics()).toEqual([]);
    });

    test('returns active topics', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      broker.subscribe('topic1', cap);
      broker.subscribe('topic2', cap);
      broker.subscribe('topic3', cap);

      const topics = broker.topics();
      expect(topics).toContain('topic1');
      expect(topics).toContain('topic2');
      expect(topics).toContain('topic3');
      expect(topics.length).toBe(3);
    });

    test('removes topic after all unsubscribe', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const sub = broker.subscribe('test.topic', cap);
      expect(broker.topics()).toContain('test.topic');

      sub.unsubscribe();
      expect(broker.topics()).not.toContain('test.topic');
    });
  });

  describe('clear', () => {
    test('removes all subscriptions', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      broker.subscribe('topic1', cap);
      broker.subscribe('topic2', cap);
      broker.subscribe('topic3', cap);

      expect(broker.topics().length).toBe(3);

      broker.clear();

      expect(broker.topics().length).toBe(0);
      expect(broker.subscriberCount('topic1')).toBe(0);
    });

    test('deactivates all subscriptions', () => {
      const broker = createPubSub<EventMsg>();
      const cap = createCapability<EventMsg>(() => {});

      const sub1 = broker.subscribe('topic1', cap);
      const sub2 = broker.subscribe('topic2', cap);

      broker.clear();

      expect(sub1.isActive()).toBe(false);
      expect(sub2.isActive()).toBe(false);
    });
  });

  describe('integration', () => {
    test('event bus scenario', () => {
      const broker = createPubSub<EventMsg>();
      const events: string[] = [];

      // Logger subscriber
      broker.subscribe('app.events', createCapability<EventMsg>((msg) => {
        events.push(`LOG: ${msg.name}`);
      }));

      // Metrics subscriber
      broker.subscribe('app.events', createCapability<EventMsg>((msg) => {
        events.push(`METRIC: ${msg.name}`);
      }));

      // Analytics subscriber (different topic)
      broker.subscribe('analytics', createCapability<EventMsg>((msg) => {
        events.push(`ANALYTICS: ${msg.name}`);
      }));

      // Publish to app.events
      broker.publish('app.events', createMessage('event', { name: 'user.login', data: {} }));

      expect(events).toEqual([
        'LOG: user.login',
        'METRIC: user.login',
      ]);

      events.length = 0;

      // Publish to analytics
      broker.publish('analytics', createMessage('event', { name: 'page.view', data: {} }));

      expect(events).toEqual(['ANALYTICS: page.view']);
    });

    test('unsubscribe during iteration', () => {
      const broker = createPubSub<EventMsg>();
      let count = 0;

      const sub1 = broker.subscribe('test', createCapability<EventMsg>(() => {
        count++;
      }));

      broker.subscribe('test', createCapability<EventMsg>(() => {
        count++;
      }));

      // First publish - both receive
      broker.publish('test', createMessage('event', { name: 'test1', data: {} }));
      expect(count).toBe(2);

      // Unsubscribe one
      sub1.unsubscribe();

      // Second publish - only one receives
      broker.publish('test', createMessage('event', { name: 'test2', data: {} }));
      expect(count).toBe(3); // 2 + 1
    });
  });
});
