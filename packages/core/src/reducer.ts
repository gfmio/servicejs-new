/**
 * @servicejs/core - Reducer
 *
 * Reducers are pure functions that process messages and return new state.
 * They are the core of component behavior in ServiceJS.
 *
 * Reducers can:
 * - Update state immutably
 * - Replace themselves (for session types/state machines)
 * - Return effects to be executed
 */

import type { Message } from './message.js';
import type { Effect } from './effect.js';

/**
 * A reducer function that processes messages and updates state.
 *
 * Reducers must be pure functions - same input always produces same output.
 * They cannot have side effects directly, but can return Effect objects.
 *
 * @typeParam TState - The state type
 * @typeParam TMsg - The message type
 *
 * @param state - The current state
 * @param message - The message to process
 * @returns The reducer result with new state, next reducer, and effects
 *
 * @example
 * ```typescript
 * type CounterState = { count: number };
 * type CounterMessage = { type: 'increment'; amount: number };
 *
 * const counterReducer: Reducer<CounterState, CounterMessage> = (state, message) => {
 *   return stay({ count: state.count + message.amount }, counterReducer, []);
 * };
 * ```
 */
export type Reducer<TState, TMsg extends Message> = (
  state: TState,
  message: TMsg
) => ReducerResult<TState, TMsg>;

/**
 * The result of processing a message in a reducer.
 *
 * Contains:
 * - New state (immutable update)
 * - Next reducer (can change for session types)
 * - Effects to execute (side effects)
 *
 * @typeParam TState - The state type
 * @typeParam TMsg - The message type
 */
export interface ReducerResult<TState, TMsg extends Message> {
  /**
   * The new state after processing the message.
   * Must be a new object (immutable update).
   */
  readonly state: TState;

  /**
   * The reducer to use for the next message.
   * Can be different from current reducer (for session types/state machines).
   */
  readonly reducer: Reducer<TState, TMsg>;

  /**
   * Effects to execute after state update.
   * Effects are side effects like sending messages or performing I/O.
   */
  readonly effects: readonly Effect[];
}

/**
 * Stay in the current state with the same or different reducer.
 *
 * This is the most common reducer result - update state and optionally change behavior.
 *
 * @param state - The new state
 * @param reducer - The next reducer (often the same reducer for stateless behavior)
 * @param effects - Effects to execute
 * @returns A reducer result
 *
 * @example
 * ```typescript
 * const counterReducer: Reducer<CounterState, CounterMessage> = (state, message) => {
 *   return stay(
 *     { count: state.count + message.amount },
 *     counterReducer,  // Same reducer
 *     []  // No effects
 *   );
 * };
 * ```
 */
export function stay<TState, TMsg extends Message>(
  state: TState,
  reducer: Reducer<TState, TMsg>,
  effects: readonly Effect[] = []
): ReducerResult<TState, TMsg> {
  return { state, reducer, effects };
}

/**
 * Transition to a new reducer (for session types/state machines).
 *
 * This changes the component's behavior by replacing the reducer.
 *
 * @param state - The new state
 * @param reducer - The new reducer to transition to
 * @param effects - Effects to execute
 * @returns A reducer result
 *
 * @example
 * ```typescript
 * // Transition from 'connecting' to 'connected' state
 * const connectingReducer: Reducer<State, Message> = (state, message) => {
 *   if (message.type === 'connected') {
 *     return become(
 *       { ...state, status: 'connected' },
 *       connectedReducer,  // Different reducer!
 *       []
 *     );
 *   }
 *   return stay(state, connectingReducer, []);
 * };
 * ```
 */
export function become<TState, TMsg extends Message>(
  state: TState,
  reducer: Reducer<TState, TMsg>,
  effects: readonly Effect[] = []
): ReducerResult<TState, TMsg> {
  return { state, reducer, effects };
}

/**
 * Helper to create an initial reducer result.
 *
 * @param state - The initial state
 * @param reducer - The initial reducer
 * @param effects - Initial effects to execute
 * @returns A reducer result
 *
 * @example
 * ```typescript
 * const initial = initialResult(
 *   { count: 0 },
 *   counterReducer,
 *   [emitTo(loggerCap, { type: 'initialized' })]
 * );
 * ```
 */
export function initialResult<TState, TMsg extends Message>(
  state: TState,
  reducer: Reducer<TState, TMsg>,
  effects: readonly Effect[] = []
): ReducerResult<TState, TMsg> {
  return { state, reducer, effects };
}
