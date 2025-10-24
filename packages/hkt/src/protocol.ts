/**
 * Protocol Helpers
 *
 * Utilities for converting HKTOs to ServiceJS reducers and verifying
 * protocol implementations.
 */

import * as HKTF from './hktf.js';
import * as HKTO from './hkto.js';

/**
 * Effect type (placeholder, will be defined in @servicejs/core)
 *
 * Effects are instructions to emit messages.
 */
export interface Effect {
  readonly send: (message: any) => void;
  readonly message: any;
}

/**
 * Convert HKTO protocol to reducer signature
 *
 * This derives the reducer function type from an HKTO protocol definition.
 *
 * @example
 * ```typescript
 * type CounterReducer = Protocol.ToReducer<CounterHKTO, CounterState>;
 * // Result: (state: CounterState, message: CounterMessage) => ReducerResult
 * ```
 */
export type ToReducer<O extends HKTO.Base, State> = (
  state: State,
  message: O[typeof HKTF.ArgsSymbol]
) => {
  readonly state: State;
  readonly reducer: ToReducer<HKTO.Send<O, typeof message>, State>;
  readonly effects: readonly Effect[];
};

/**
 * Verify that an implementation matches a protocol
 *
 * This is a type-level check that can be used to ensure a reducer
 * correctly implements an HKTO protocol.
 *
 * @example
 * ```typescript
 * type Check = Protocol.Implements<CounterProtocol, typeof myReducer>;
 * // Result: true (or compile error if mismatch)
 * ```
 */
export type Implements<Protocol extends HKTO.Base, Impl> = Impl extends ToReducer<
  Protocol,
  any
>
  ? true
  : false;

/**
 * Extract the state type from a reducer
 */
export type StateOf<R extends ToReducer<any, any>> = R extends ToReducer<
  any,
  infer State
>
  ? State
  : never;

/**
 * Extract the message type from a reducer
 */
export type MessageOf<R extends ToReducer<any, any>> = R extends ToReducer<
  infer Protocol extends HKTO.Base,
  any
>
  ? Protocol[typeof HKTF.ArgsSymbol]
  : never;
