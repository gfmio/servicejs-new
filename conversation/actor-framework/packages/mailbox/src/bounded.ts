import type { URN } from '@actor-framework/core';
import type { Message } from '@actor-framework/core';
import type { Component, ComponentConfig, Reducer } from '@actor-framework/core';

/**
 * Configuration for bounded mailbox
 */
export interface BoundedMailboxConfig<TState, TMessage extends Message, TEmit extends Message = never>
  extends ComponentConfig<TState, TMessage, TEmit> {
  readonly maxQueueSize: number;
  readonly onOverflow?: (message: TMessage) => void;
}

/**
 * Bounded mailbox that rejects messages when queue is full
 * Provides natural backpressure
 */
export class BoundedMailboxComponent<TState, TMessage extends Message, TEmit extends Message = never>
  implements Component<TState, TMessage, TEmit>
{
  public readonly urn: URN;
  private _state: TState;
  private _reducer: Reducer<TState, TMessage, TEmit>;
  private readonly queue: TMessage[] = [];
  private readonly maxQueueSize: number;
  private readonly onOverflow?: (message: TMessage) => void;
  private processing: boolean = false;

  constructor(config: BoundedMailboxConfig<TState, TMessage, TEmit>) {
    this.urn = config.urn;
    this._state = config.initialState;
    this._reducer = config.reducer;
    this.maxQueueSize = config.maxQueueSize;
    this.onOverflow = config.onOverflow;
  }

  get state(): TState {
    return this._state;
  }

  get reducer(): Reducer<TState, TMessage, TEmit> {
    return this._reducer;
  }

  get queueSize(): number {
    return this.queue.length;
  }

  get isFull(): boolean {
    return this.queue.length >= this.maxQueueSize;
  }

  process(message: TMessage): void {
    if (this.queue.length >= this.maxQueueSize) {
      // Queue is full - reject message
      if (this.onOverflow) {
        this.onOverflow(message);
      }
      return;
    }

    this.queue.push(message);

    if (!this.processing) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
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
 * Factory function to create a bounded mailbox component
 */
export const createBoundedMailboxComponent = <
  TState,
  TMessage extends Message,
  TEmit extends Message = never
>(
  config: BoundedMailboxConfig<TState, TMessage, TEmit>
): Component<TState, TMessage, TEmit> => {
  return new BoundedMailboxComponent(config);
};
