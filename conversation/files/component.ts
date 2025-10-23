import type { URN } from './urn.js';
import type { Message } from './channel.js';

/**
 * A reducer function that processes a message and returns the next state and reducer,
 * along with any messages to emit.
 * 
 * This enables session types / protocol types where the component can transition
 * between different states with different message types accepted.
 */
export type Reducer<TState, TMessage extends Message, TEmit extends Message = never> = (
  state: TState,
  message: TMessage
) => ReducerResult<TState, TMessage, TEmit>;

/**
 * Result of processing a message - contains new state, new reducer, and messages to emit
 */
export interface ReducerResult<TState, TMessage extends Message, TEmit extends Message = never> {
  readonly state: TState;
  readonly reducer: Reducer<TState, TMessage, TEmit>;
  readonly emit: ReadonlyArray<EmitMessage<TEmit>>;
}

/**
 * A message to emit to another component
 */
export interface EmitMessage<TMessage extends Message> {
  readonly target: Component<any, TMessage, any>;
  readonly message: TMessage;
}

/**
 * Core component interface - represents an addressable entity that processes messages
 */
export interface Component<TState, TMessage extends Message, TEmit extends Message = never> {
  readonly urn: URN;
  readonly state: TState;
  readonly reducer: Reducer<TState, TMessage, TEmit>;
  
  /**
   * Process a message - this is the entry point for message delivery
   */
  process(message: TMessage): void;
}

/**
 * Component configuration for initialization
 */
export interface ComponentConfig<TState, TMessage extends Message, TEmit extends Message = never> {
  readonly urn: URN;
  readonly initialState: TState;
  readonly reducer: Reducer<TState, TMessage, TEmit>;
}

/**
 * Create a reducer result
 */
export const reducerResult = <TState, TMessage extends Message, TEmit extends Message = never>(
  state: TState,
  reducer: Reducer<TState, TMessage, TEmit>,
  emit: ReadonlyArray<EmitMessage<TEmit>> = []
): ReducerResult<TState, TMessage, TEmit> => ({
  state,
  reducer,
  emit,
});

/**
 * Helper to create an emit message
 */
export const emitTo = <TMessage extends Message>(
  target: Component<any, TMessage, any>,
  message: TMessage
): EmitMessage<TMessage> => ({
  target,
  message,
});

/**
 * Helper to stay in the same state with the same reducer
 */
export const stay = <TState, TMessage extends Message, TEmit extends Message = never>(
  state: TState,
  reducer: Reducer<TState, TMessage, TEmit>,
  emit: ReadonlyArray<EmitMessage<TEmit>> = []
): ReducerResult<TState, TMessage, TEmit> => reducerResult(state, reducer, emit);

/**
 * Helper to transition to a new state with a new reducer
 */
export const transition = <TState, TMessage extends Message, TEmit extends Message = never>(
  state: TState,
  reducer: Reducer<TState, TMessage, TEmit>,
  emit: ReadonlyArray<EmitMessage<TEmit>> = []
): ReducerResult<TState, TMessage, TEmit> => reducerResult(state, reducer, emit);
