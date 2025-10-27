/**
 * Component Builder
 *
 * Fluent API for building ServiceJS components without decorators.
 */

import type { URN, Message, Capability, Reducer } from '@servicejs/core';
import { createComponent as coreCreateComponent } from '@servicejs/core';
import type { Mailbox } from '@servicejs/mailbox';
import { createFIFOMailbox } from '@servicejs/mailbox';
import type { LifecycleHooks } from '@servicejs/lifecycle';

/**
 * Component builder for fluent component creation
 *
 * @example
 * ```typescript
 * const { component, capability } = new ComponentBuilder<CounterState, CounterMessage>()
 *   .withURN('urn:app:counter')
 *   .withState({ count: 0 })
 *   .withReducer((state, message) => {
 *     if (message.type === 'increment') {
 *       return stay({ count: state.count + message.amount });
 *     }
 *     return stay(state);
 *   })
 *   .build();
 * ```
 */
export class ComponentBuilder<TState, TMsg extends Message> {
  private urn?: URN;
  private state?: TState;
  private reducer?: Reducer<TState, TMsg>;
  private mailbox?: Mailbox<TMsg>;
  private hooks?: LifecycleHooks;

  /**
   * Set the component URN
   */
  withURN(urn: URN): this {
    this.urn = urn;
    return this;
  }

  /**
   * Set the initial state
   */
  withState(state: TState): this {
    this.state = state;
    return this;
  }

  /**
   * Set the reducer function
   */
  withReducer(reducer: Reducer<TState, TMsg>): this {
    this.reducer = reducer;
    return this;
  }

  /**
   * Set the mailbox
   */
  withMailbox(mailbox: Mailbox<TMsg>): this {
    this.mailbox = mailbox;
    return this;
  }

  /**
   * Set lifecycle hooks
   */
  withLifecycle(hooks: LifecycleHooks): this {
    this.hooks = hooks;
    return this;
  }

  /**
   * Build the component
   *
   * @throws Error if required fields are missing
   */
  build(): {
    component: ReturnType<typeof coreCreateComponent<TState, TMsg>>['component'];
    capability: Capability<TMsg>;
  } {
    if (!this.urn) {
      throw new Error('ComponentBuilder: URN is required');
    }

    if (this.state === undefined) {
      throw new Error('ComponentBuilder: Initial state is required');
    }

    if (!this.reducer) {
      throw new Error('ComponentBuilder: Reducer is required');
    }

    // Call onInit if present
    if (this.hooks?.onInit) {
      this.hooks.onInit();
    }

    // Create component
    const { component, capability } = coreCreateComponent<TState, TMsg>(
      this.urn,
      this.state,
      this.reducer
    );

    // Note: Mailbox integration would happen here
    // For now, we just use the default behavior

    // Note: onShutdown would be registered with lifecycle manager here

    return { component, capability };
  }
}

/**
 * Create a new component builder
 *
 * @example
 * ```typescript
 * const builder = createComponentBuilder<CounterState, CounterMessage>();
 *
 * builder
 *   .withURN('urn:app:counter')
 *   .withState({ count: 0 })
 *   .withReducer(counterReducer)
 *   .build();
 * ```
 */
export const createComponentBuilder = <TState, TMsg extends Message>(): ComponentBuilder<
  TState,
  TMsg
> => {
  return new ComponentBuilder<TState, TMsg>();
};
