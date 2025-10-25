/**
 * Method Pattern
 *
 * Methods are type-level functions that handle specific message types.
 * They are the building blocks for HKTOs (Higher-Kinded Type Objects).
 */

import * as HKTF from './hktf.js';

/**
 * Base interface for method types
 *
 * A method takes a message and returns a result.
 * State is captured in the method's type parameters (closure-based state).
 *
 * @example
 * ```typescript
 * interface IncrementMethod<Count extends number> extends Method.Base<
 *   { type: 'increment'; amount: number },
 *   CounterHKTO<Count>
 * > {}
 * ```
 */
export interface Base<Message = unknown, Result = unknown>
  extends HKTF.Base {
  [HKTF.ArgsSymbol]: Message;
  [HKTF.ResultSymbol]: Result;
}

/**
 * Extract the message type from a method
 */
export type MessageOf<M extends Base> = M[typeof HKTF.ArgsSymbol];

/**
 * Extract the result type from a method
 */
export type ResultOf<M extends Base> = M[typeof HKTF.ResultSymbol];
