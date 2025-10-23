import type { URN } from '@actor-framework/core';
import type { Message } from '@actor-framework/core';
import type { Component, ComponentConfig, Reducer } from '@actor-framework/core';

/**
 * Message with priority for priority queue
 */
export interface PriorityMessage extends Message {
  readonly priority: number; // Higher number = higher priority
}

/**
 * Priority queue implementation
 */
class PriorityQueue<T extends PriorityMessage> {
  private items: T[] = [];

  enqueue(item: T): void {
    if (this.items.length === 0) {
      this.items.push(item);
      return;
    }

    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  get length(): number {
    return this.items.length;
  }
}

/**
 * Priority mailbox that processes higher priority messages first
 */
export class PriorityMailboxComponent<
  TState,
  TMessage extends PriorityMessage,
  TEmit extends Message = never
> implements Component<TState, TMessage, TEmit>
{
  public readonly urn: URN;
  private _state: TState;
  private _reducer: Reducer<TState, TMessage, TEmit>;
  private readonly queue = new PriorityQueue<TMessage>();
  private processing: boolean = false;

  constructor(config: ComponentConfig<TState, TMessage, TEmit>) {
    this.urn = config.urn;
    this._state = config.initialState;
    this._reducer = config.reducer;
  }

  get state(): TState {
    return this._state;
  }

  get reducer(): Reducer<TState, TMessage, TEmit> {
    return this._reducer;
  }

  process(message: TMessage): void {
    this.queue.enqueue(message);

    if (!this.processing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue.dequeue()!;
      const result = this._reducer(this._state, message);

      // Update state and reducer
      this._state = result.state;
      this._reducer = result.reducer;

      // Emit any outgoing messages
      for (const emit of result.emit) {
        emit.target.process(emit.message);
      }
    }

    this.processing = false;
  }
}

/**
 * Factory function to create a priority mailbox component
 */
export const createPriorityMailboxComponent = <
  TState,
  TMessage extends PriorityMessage,
  TEmit extends Message = never
>(
  config: ComponentConfig<TState, TMessage, TEmit>
): Component<TState, TMessage, TEmit> => {
  return new PriorityMailboxComponent(config);
};
