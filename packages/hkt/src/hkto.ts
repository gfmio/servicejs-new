/**
 * HKTO (Higher-Kinded Type Objects)
 *
 * Type-level objects that dispatch messages to methods.
 * HKTOs are built by combining a tuple of methods.
 */

import * as HKTF from './hktf.js';
import * as Method from './method.js';
import * as Errors from './errors.js';

/**
 * Symbol for methods tuple
 */
export declare const MethodsSymbol: unique symbol;

/**
 * Base interface for HKTOs
 *
 * HKTOs are message dispatchers built from method tuples.
 * They correspond to event-sourced reducer objects in ServiceJS.
 */
export interface Base extends HKTF.Base {
  [HKTF.ArgsSymbol]: unknown; // Accepted message types
  [HKTF.ResultSymbol]: unknown; // Result based on message
  [MethodsSymbol]: readonly Method.Base[]; // Tuple of methods
}

/**
 * Send a message to an HKTO - dispatches to methods
 */
export type Send<
  O extends Base,
  Message extends O[typeof HKTF.ArgsSymbol]
> = Message extends { type: string }
  ? SendToMethods<O[typeof MethodsSymbol], Message> extends never
    ? Errors.MethodNotFoundError<Message['type'], O>
    : SendToMethods<O[typeof MethodsSymbol], Message>
  : Errors.InvalidMessageError<Message>;

/**
 * Helper: Send message to a tuple of methods
 *
 * Recursively searches through the method tuple to find a method
 * that can handle the given message type.
 */
type SendToMethods<
  Methods extends readonly Method.Base[],
  Message
> = Methods extends readonly []
  ? never
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Message extends Method.MessageOf<M>
      ? HKTF.Apply<M, Message>
      : Rest extends readonly Method.Base[]
      ? SendToMethods<Rest, Message>
      : never
    : never
  : never;

/**
 * Combine method HKTFs into an HKTO using a tuple
 *
 * This is the main way to create HKTOs.
 *
 * @example
 * ```typescript
 * interface CounterHKTO extends HKTO.Combine<readonly [
 *   IncrementMethod,
 *   DecrementMethod,
 *   GetMethod
 * ]> {}
 * ```
 */
export interface Combine<Methods extends readonly Method.Base[]> extends Base {
  [HKTF.ArgsSymbol]: ExtractMessages<Methods>;
  [HKTF.ResultSymbol]: Send<this, HKTF.Args<this>>;
  [MethodsSymbol]: Methods;
}

/**
 * Extract all message types from a tuple of methods
 */
export type ExtractMessages<Methods extends readonly Method.Base[]> =
  Methods extends readonly []
    ? never
    : Methods extends readonly [infer M, ...infer Rest]
    ? M extends Method.Base
      ? Rest extends readonly Method.Base[]
        ? Method.MessageOf<M> | ExtractMessages<Rest>
        : Method.MessageOf<M>
      : never
    : never;

/**
 * Convert HKTO to runtime object type
 *
 * Derives the runtime object interface from the HKTO type definition.
 * Methods with `type` fields become object methods named after the type.
 *
 * @example
 * ```typescript
 * type OptionObject<T> = ToObject<OptionHKTO<T>>;
 * // Result: { map: (msg) => OptionObject<U>, get: () => T, ... }
 * ```
 */
export type ToObject<O extends Base> = {
  readonly _tag?: string;
} & MethodsToObject<O[typeof MethodsSymbol]>;

/**
 * Convert method tuple to object method signatures
 */
type MethodsToObject<Methods extends readonly Method.Base[]> =
  Methods extends readonly []
    ? {}
    : Methods extends readonly [infer M, ...infer Rest]
    ? M extends Method.Base
      ? Rest extends readonly Method.Base[]
        ? MethodToObjectMethod<M> & MethodsToObject<Rest>
        : MethodToObjectMethod<M>
      : {}
    : {};

/**
 * Convert single method to object method signature
 */
type MethodToObjectMethod<M extends Method.Base> = {
  readonly [K in ExtractMethodName<Method.MessageOf<M>>]: (
    message: Method.MessageOf<M>
  ) => HKTF.Result<M>;
};

/**
 * Extract method name from message
 *
 * If message has a `type` field, use that as the method name.
 * Otherwise, default to 'send'.
 */
type ExtractMethodName<Msg> = Msg extends { type: infer Name extends string }
  ? Name
  : 'send';
