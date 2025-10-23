import type { URN } from './urn.js';
import type { Message } from './channel.js';
import type { Component, ComponentConfig, Reducer } from './component.js';

/**
 * Simple component implementation that processes messages directly (no mailbox)
 * Suitable for stateless/immutable components that can handle concurrent messages
 */
export class SimpleComponent<TState, TMessage extends Message, TEmit extends Message = never>
  implements Component<TState, TMessage, TEmit>
{
  public readonly urn: URN;
  private _state: TState;
  private _reducer: Reducer<TState, TMessage, TEmit>;

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
    const result = this._reducer(this._state, message);
    
    // Update state and reducer
    this._state = result.state;
    this._reducer = result.reducer;
    
    // Emit any outgoing messages
    for (const emit of result.emit) {
      emit.target.process(emit.message);
    }
  }
}

/**
 * Factory function to create a simple component
 */
export const createSimpleComponent = <TState, TMessage extends Message, TEmit extends Message = never>(
  config: ComponentConfig<TState, TMessage, TEmit>
): Component<TState, TMessage, TEmit> => {
  return new SimpleComponent(config);
};
