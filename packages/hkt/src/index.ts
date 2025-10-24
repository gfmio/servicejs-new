/**
 * @servicejs/hkt
 *
 * Higher-Kinded Types foundation for ServiceJS.
 *
 * This package provides type-level programming infrastructure:
 * - HKTF: Higher-Kinded Type Functions
 * - HKTO: Higher-Kinded Type Objects
 * - Method: Message handlers
 * - Protocol: Reducer protocol helpers
 *
 * All code in this package is type-level only with zero runtime overhead.
 *
 * @example
 * ```typescript
 * import { HKTF, HKTO, Method } from '@servicejs/hkt';
 *
 * // Define a method
 * interface IncrementMethod extends Method.Base<
 *   { type: 'increment'; amount: number },
 *   CounterHKTO
 * > {}
 *
 * // Combine methods into HKTO
 * interface CounterHKTO extends HKTO.Combine<readonly [IncrementMethod]> {}
 *
 * // Send a message
 * type Result = HKTO.Send<CounterHKTO, { type: 'increment'; amount: 5 }>;
 * ```
 */

export * as Arithmetic from './arithmetic/index.js';
export * as Combinator from './combinator/index.js';
export * as Compose from './compose/index.js';
export * as Errors from './errors.js';
export * as FunctionHKTF from './function.js';
export * as HKTF from './hktf.js';
export * as HKTO from './hkto.js';
export * as Method from './method.js';
export * as ObjectHKTF from './object/index.js';
export * as Protocol from './protocol.js';
export * as StringHKTF from './string/index.js';
export * as TupleHKTF from './tuple/index.js';
export * as Util from './util/index.js';

