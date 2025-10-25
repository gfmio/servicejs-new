/**
 * @servicejs/core
 *
 * Pure core of ServiceJS - message passing, capabilities, reducers, components.
 *
 * This package provides the fundamental building blocks:
 * - URN: Unique identifiers for components
 * - Message: Immutable communication units
 * - Capability: Secure references for interaction
 * - Reducer: Pure functions for behavior
 * - Effect: Side effect descriptions
 * - Component: Stateful entities with behavior
 *
 * @example
 * ```typescript
 * import { createComponent, createURN, stay, emitTo } from '@servicejs/core';
 *
 * type CounterState = { count: number };
 * type CounterMsg = { type: 'increment'; amount: number };
 *
 * const counterReducer = (state: CounterState, msg: CounterMsg) => {
 *   return stay({ count: state.count + msg.amount }, counterReducer, []);
 * };
 *
 * const { component, capability } = createComponent(
 *   createURN('app', 'counter'),
 *   { count: 0 },
 *   counterReducer
 * );
 * ```
 */

// URN
export {
  createURN,
  safeCreateURN,
  parseURN,
  validateURN,
  equalURN,
  type URN,
  type URNError,
} from './urn.js';

// Message
export {
  createMessage,
  isMessageType,
  matchMessage,
  type Message,
  type MessageType,
  type MessageOf,
  type MessageTypes,
  type FilterMessage,
} from './message.js';

// Capability
export {
  createCapability,
  mapCapability,
  filterCapability,
  composeCapabilities,
  interceptCapability,
  nullCapability,
  readonlyCapability,
  type Capability,
} from './capability.js';

// Reducer
export {
  stay,
  become,
  initialResult,
  type Reducer,
  type ReducerResult,
} from './reducer.js';

// Effect
export {
  emitTo,
  batch,
  none,
  executeEffect,
  executeEffects,
  type Effect,
  type EmitEffect,
  type BatchEffect,
  type NoneEffect,
} from './effect.js';

// Component
export {
  createComponent,
  type Component,
} from './component.js';
