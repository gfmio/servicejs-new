import type { URN, Message, Channel, Component } from '@actor-framework/core';
import { generateURN, createSimpleComponent } from '@actor-framework/core';
import { stay } from '@actor-framework/core';

/**
 * Topic identifier
 */
export type Topic = string & { readonly __brand: 'Topic' };

export const createTopic = (name: string): Topic => name as Topic;

/**
 * Publication message
 */
export interface Publication<T> extends Message {
  readonly type: 'publication';
  readonly topic: Topic;
  readonly data: T;
}

/**
 * Subscription handle
 */
export interface Subscription {
  readonly id: string;
  unsubscribe(): void;
}

/**
 * Subscriber - receives publications for subscribed topics
 */
export type Subscriber<T> = (publication: Publication<T>) => void;

/**
 * Pub/Sub broker state
 */
interface BrokerState<T> {
  readonly subscriptions: Map<Topic, Map<string, Subscriber<T>>>;
}

/**
 * Pub/Sub broker messages
 */
export type BrokerMessage<T> =
  | { readonly type: 'subscribe'; readonly topic: Topic; readonly subscriber: Subscriber<T>; readonly replyTo: Channel<{ readonly subscriptionId: string }> }
  | { readonly type: 'unsubscribe'; readonly subscriptionId: string; readonly topic: Topic }
  | Publication<T>;

/**
 * Pub/Sub broker component
 */
export class PubSubBroker<T> {
  private readonly component: Component<BrokerState<T>, BrokerMessage<T>, never>;

  constructor(urn?: URN) {
    const initialState: BrokerState<T> = {
      subscriptions: new Map(),
    };

    this.component = createSimpleComponent({
      urn: urn ?? generateURN('pubsub-broker'),
      initialState,
      reducer: (state, message) => {
        switch (message.type) {
          case 'subscribe': {
            const { topic, subscriber, replyTo } = message;
            const subscriptionId = crypto.randomUUID();
            
            const topicSubs = state.subscriptions.get(topic) ?? new Map();
            topicSubs.set(subscriptionId, subscriber);
            
            const newSubscriptions = new Map(state.subscriptions);
            newSubscriptions.set(topic, topicSubs);
            
            const newState: BrokerState<T> = {
              subscriptions: newSubscriptions,
            };
            
            // Send subscription ID back
            replyTo.send({ subscriptionId });
            
            return stay(newState, this.component.reducer);
          }
          
          case 'unsubscribe': {
            const { subscriptionId, topic } = message;
            const topicSubs = state.subscriptions.get(topic);
            
            if (topicSubs) {
              const newTopicSubs = new Map(topicSubs);
              newTopicSubs.delete(subscriptionId);
              
              const newSubscriptions = new Map(state.subscriptions);
              if (newTopicSubs.size > 0) {
                newSubscriptions.set(topic, newTopicSubs);
              } else {
                newSubscriptions.delete(topic);
              }
              
              const newState: BrokerState<T> = {
                subscriptions: newSubscriptions,
              };
              
              return stay(newState, this.component.reducer);
            }
            
            return stay(state, this.component.reducer);
          }
          
          case 'publication': {
            const { topic, data } = message;
            const topicSubs = state.subscriptions.get(topic);
            
            if (topicSubs) {
              // Notify all subscribers
              for (const subscriber of topicSubs.values()) {
                subscriber(message);
              }
            }
            
            return stay(state, this.component.reducer);
          }
          
          default:
            return stay(state, this.component.reducer);
        }
      },
    });
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: Topic, subscriber: Subscriber<T>): Subscription {
    let subscriptionId: string | null = null;
    
    const replyChannel: Channel<{ readonly subscriptionId: string }> = {
      send: (reply) => {
        subscriptionId = reply.subscriptionId;
      },
    };
    
    this.component.process({
      type: 'subscribe',
      topic,
      subscriber,
      replyTo: replyChannel,
    });
    
    // Return subscription handle
    return {
      id: subscriptionId!,
      unsubscribe: () => {
        if (subscriptionId) {
          this.component.process({
            type: 'unsubscribe',
            subscriptionId,
            topic,
          });
        }
      },
    };
  }

  /**
   * Publish to a topic
   */
  publish(topic: Topic, data: T): void {
    this.component.process({
      type: 'publication',
      topic,
      data,
    });
  }

  get urn(): URN {
    return this.component.urn;
  }
}

/**
 * Factory function to create a pub/sub broker
 */
export const createPubSubBroker = <T>(urn?: URN): PubSubBroker<T> => {
  return new PubSubBroker<T>(urn);
};
