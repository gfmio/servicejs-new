/**
 * @servicejs/core - Effect
 *
 * Effects represent side effects that reducers want to perform.
 * Reducers are pure, so they return Effect objects instead of performing side effects directly.
 *
 * Effects are executed by the component runtime after state updates.
 */

import type { Message } from './message.js';
import type { Capability } from './capability.js';

/**
 * An effect to be executed.
 *
 * Effects represent side effects like:
 * - Sending messages to other components
 * - Performing I/O operations
 * - Scheduling timers
 *
 * Effects are created by reducers and executed by the component runtime.
 *
 * @example
 * ```typescript
 * const effect: Effect = {
 *   type: 'emit',
 *   capability: loggerCap,
 *   message: { type: 'log', text: 'Hello' },
 * };
 * ```
 */
export type Effect =
  | EmitEffect
  | BatchEffect
  | NoneEffect;

/**
 * Effect to emit a message to a capability.
 *
 * This is the most common effect - send a message to another component.
 */
export interface EmitEffect {
  readonly type: 'emit';
  readonly capability: Capability<any>;
  readonly message: Message;
}

/**
 * Effect to execute multiple effects.
 *
 * This is useful for composing effects.
 */
export interface BatchEffect {
  readonly type: 'batch';
  readonly effects: readonly Effect[];
}

/**
 * Effect that does nothing.
 *
 * Useful as a placeholder or default value.
 */
export interface NoneEffect {
  readonly type: 'none';
}

/**
 * Create an effect to emit a message to a capability.
 *
 * @param capability - The target capability
 * @param message - The message to send
 * @returns An emit effect
 *
 * @example
 * ```typescript
 * const effect = emitTo(loggerCap, { type: 'log', text: 'Hello' });
 * ```
 */
export function emitTo<TMsg extends Message>(
  capability: Capability<TMsg>,
  message: TMsg
): EmitEffect {
  return {
    type: 'emit',
    capability,
    message,
  };
}

/**
 * Create a batch effect from multiple effects.
 *
 * @param effects - The effects to batch
 * @returns A batch effect
 *
 * @example
 * ```typescript
 * const effect = batch([
 *   emitTo(loggerCap, { type: 'log', text: 'Start' }),
 *   emitTo(metricsCap, { type: 'inc', counter: 'requests' }),
 *   emitTo(loggerCap, { type: 'log', text: 'End' }),
 * ]);
 * ```
 */
export function batch(effects: readonly Effect[]): BatchEffect {
  return {
    type: 'batch',
    effects,
  };
}

/**
 * Create a none effect (does nothing).
 *
 * @returns A none effect
 *
 * @example
 * ```typescript
 * const effect = none();
 * // Useful as a placeholder or in conditional logic
 * ```
 */
export function none(): NoneEffect {
  return { type: 'none' };
}

/**
 * Execute an effect.
 *
 * This is typically called by the component runtime, not by user code.
 *
 * @param effect - The effect to execute
 *
 * @example
 * ```typescript
 * executeEffect(emitTo(cap, { type: 'test' }));
 * ```
 */
export function executeEffect(effect: Effect): void {
  switch (effect.type) {
    case 'emit':
      effect.capability.send(effect.message);
      break;
    case 'batch':
      for (const e of effect.effects) {
        executeEffect(e);
      }
      break;
    case 'none':
      // Do nothing
      break;
  }
}

/**
 * Execute multiple effects.
 *
 * @param effects - The effects to execute
 *
 * @example
 * ```typescript
 * executeEffects([
 *   emitTo(cap1, { type: 'msg1' }),
 *   emitTo(cap2, { type: 'msg2' }),
 * ]);
 * ```
 */
export function executeEffects(effects: readonly Effect[]): void {
  for (const effect of effects) {
    executeEffect(effect);
  }
}
