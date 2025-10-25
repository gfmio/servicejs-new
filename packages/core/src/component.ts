/**
 * @servicejs/core - Component
 *
 * Components tie together URN, state, reducer, and capability.
 * They encapsulate behavior and expose a capability for interaction.
 */

import type { URN } from './urn.js';
import type { Message } from './message.js';
import type { Capability } from './capability.js';
import type { Reducer } from './reducer.js';
import { executeEffects } from './effect.js';

/**
 * A component with state and behavior.
 *
 * Components are the building blocks of ServiceJS applications.
 * They encapsulate:
 * - URN (for identification)
 * - State (internal data)
 * - Reducer (behavior)
 * - Capability (interface for interaction)
 *
 * @typeParam TState - The state type
 * @typeParam TMsg - The message type
 */
export interface Component<TState, TMsg extends Message> {
  /**
   * The component's URN (for debugging/tracing)
   */
  readonly urn: URN;

  /**
   * Get the current state (for debugging/testing)
   *
   * IMPORTANT: Do not mutate the returned state!
   */
  getState(): TState;

  /**
   * Get the capability for this component.
   * This is the ONLY way other components should interact with this one.
   */
  getCapability(): Capability<TMsg>;
}

/**
 * Create a component.
 *
 * @param urn - The component's URN
 * @param initialState - The initial state
 * @param initialReducer - The initial reducer
 * @returns A component and its capability
 *
 * @example
 * ```typescript
 * type CounterState = { count: number };
 * type CounterMsg = { type: 'increment'; amount: number };
 *
 * const counterReducer: Reducer<CounterState, CounterMsg> = (state, msg) => {
 *   return stay({ count: state.count + msg.amount }, counterReducer, []);
 * };
 *
 * const { component, capability } = createComponent(
 *   createURN('app', 'counter-1'),
 *   { count: 0 },
 *   counterReducer
 * );
 *
 * capability.send({ type: 'increment', amount: 5 });
 * console.log(component.getState().count); // 5
 * ```
 */
export function createComponent<TState, TMsg extends Message>(
  urn: URN,
  initialState: TState,
  initialReducer: Reducer<TState, TMsg>
): {
  component: Component<TState, TMsg>;
  capability: Capability<TMsg>;
} {
  let state = initialState;
  let reducer = initialReducer;

  const capability: Capability<TMsg> = {
    send: (message: TMsg) => {
      // Process message with current reducer
      const result = reducer(state, message);

      // Update state and reducer
      state = result.state;
      reducer = result.reducer;

      // Execute effects
      executeEffects(result.effects);
    },
  };

  const component: Component<TState, TMsg> = {
    urn,
    getState: () => state,
    getCapability: () => capability,
  };

  return { component, capability };
}
