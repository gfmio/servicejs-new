import type { URN } from '@actor-framework/core';
import type { Message } from '@actor-framework/core';
import type { Component, ComponentConfig, Reducer } from '@actor-framework/core';

/**
 * Async FIFO mailbox that processes messages asynchronously
 * Useful when message processing involves async operations
 */
export class AsyncFIFOMailboxComponent<TState, TMessage extends Message, TEmit extends Message = never>
  implements Component<TState, TMessage, TEmit>
{
  public readonly urn: URN;
  private _state: TState;
  private _reducer: Reducer<TState, TMessage, TEmit>;
  private readonly queue: TMessage[] = [];
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
    this.queue.push(message);
    
    if (!this.processing) {
      // Process asynchronously to avoid blocking
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue.shift()!;
      
      // Allow other tasks to run between messages
      await new Promise(resolve => queueMicrotask(resolve));
      
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
 * Factory function to create an async FIFO mailbox component
 */
export const createAsyncFIFOMailboxComponent = <
  TState,
  TMessage extends Message,
  TEmit extends Message = never
>(
  config: ComponentConfig<TState, TMessage, TEmit>
): Component<TState, TMessage, TEmit> => {
  return new AsyncFIFOMailboxComponent(config);
};
