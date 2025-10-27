/**
 * Component Factory from Class
 *
 * Creates ServiceJS components from decorated classes.
 */

import 'reflect-metadata';
import type { URN, Message, Capability, Reducer, Effect } from '@servicejs/core';
import { createComponent as coreCreateComponent, stay, become } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err } from '@servicejs/result';
import { METADATA_KEYS, type HandlerMetadata, type InjectionMetadata } from './metadata.js';

/**
 * Error types for component factory
 */
export type FactoryError =
  | { type: 'NO_COMPONENT_DECORATOR'; className: string }
  | { type: 'MISSING_INJECTION'; capabilityName: string }
  | { type: 'HANDLER_ERROR'; methodName: string; error: unknown };

/**
 * Component factory configuration
 */
export interface ComponentFactoryConfig<TState> {
  /** Capabilities to inject (capability name -> capability) */
  readonly capabilities?: Record<string, Capability<any>>;
  /** Initial state (overrides @Component state) */
  readonly initialState?: TState;
}

/**
 * Component factory result
 */
export interface ComponentFactoryResult<TState, TMsg extends Message> {
  /** The ServiceJS component */
  readonly component: ReturnType<typeof coreCreateComponent<TState, TMsg>>['component'];
  /** The component capability */
  readonly capability: Capability<TMsg>;
  /** The class instance */
  readonly instance: any;
}

/**
 * Create a component from a decorated class
 *
 * @example
 * ```typescript
 * @Component({ urn: 'urn:app:counter' })
 * class CounterComponent {
 *   @Handler('increment')
 *   handleIncrement(state: CounterState, message: IncrementMessage) {
 *     return stay({ count: state.count + message.amount });
 *   }
 * }
 *
 * const result = createComponentFromClass(
 *   CounterComponent,
 *   { count: 0 }
 * );
 *
 * if (result.isOk()) {
 *   const { component, capability } = result.value;
 *   // Use component and capability
 * }
 * ```
 */
export const createComponentFromClass = <TState, TMsg extends Message>(
  ClassConstructor: new (...args: any[]) => any,
  initialState: TState,
  config?: ComponentFactoryConfig<TState>
): Result<ComponentFactoryResult<TState, TMsg>, FactoryError> => {
  // Extract URN from metadata
  const urn: URN | undefined = Reflect.getMetadata(
    METADATA_KEYS.COMPONENT_URN,
    ClassConstructor
  );

  if (!urn) {
    return err({
      type: 'NO_COMPONENT_DECORATOR',
      className: ClassConstructor.name,
    });
  }

  // Extract handlers from metadata
  const handlers: HandlerMetadata[] =
    Reflect.getMetadata(METADATA_KEYS.COMPONENT_HANDLERS, ClassConstructor) || [];

  // Extract injections from metadata
  const injections: InjectionMetadata[] =
    Reflect.getMetadata(METADATA_KEYS.COMPONENT_INJECTIONS, ClassConstructor) || [];

  // Extract lifecycle hooks
  const onInitMethod: string | undefined = Reflect.getMetadata(
    METADATA_KEYS.COMPONENT_ON_INIT,
    ClassConstructor
  );

  const onShutdownMethod: string | undefined = Reflect.getMetadata(
    METADATA_KEYS.COMPONENT_ON_SHUTDOWN,
    ClassConstructor
  );

  // Extract state factory from metadata
  const stateFactory: (() => TState) | undefined = Reflect.getMetadata(
    METADATA_KEYS.COMPONENT_STATE,
    ClassConstructor
  );

  // Prepare constructor arguments (capability injections)
  const constructorArgs: any[] = [];

  // Sort injections by parameter index
  const sortedInjections = [...injections].sort(
    (a, b) => a.parameterIndex - b.parameterIndex
  );

  // Resolve injections
  for (const injection of sortedInjections) {
    const capability = config?.capabilities?.[injection.capabilityName];

    if (!capability) {
      return err({
        type: 'MISSING_INJECTION',
        capabilityName: injection.capabilityName,
      });
    }

    constructorArgs[injection.parameterIndex] = capability;
  }

  // Create class instance
  const instance = new ClassConstructor(...constructorArgs);

  // Call @OnInit if present
  if (onInitMethod && typeof instance[onInitMethod] === 'function') {
    try {
      instance[onInitMethod]();
    } catch (error) {
      return err({
        type: 'HANDLER_ERROR',
        methodName: onInitMethod,
        error,
      });
    }
  }

  // Create reducer from handlers
  const reducer: Reducer<TState, TMsg> = (state, message) => {
    // Find matching handler
    const handler = handlers.find(
      (h) => !h.messageType || h.messageType === message.type
    );

    if (!handler) {
      // No handler found, stay with current state
      return stay(state, reducer);
    }

    // Call handler method
    try {
      const method = instance[handler.methodName];

      if (typeof method !== 'function') {
        return stay(state, reducer);
      }

      // Call handler with state and message
      const result = method.call(instance, state, message);

      // If result is a transition (stay/become), return it
      // Otherwise, assume it's the new state
      if (result && typeof result === 'object' && 'state' in result) {
        return result;
      }

      // Treat as new state
      return stay(result as TState, reducer);
    } catch (error) {
      // Handler threw error, stay with current state
      console.error(`Error in handler ${handler.methodName}:`, error);
      return stay(state, reducer);
    }
  };

  // Use provided initial state, or state from factory, or provided state
  const actualInitialState = config?.initialState ?? (stateFactory?.() ?? initialState);

  // Create component
  const { component, capability } = coreCreateComponent<TState, TMsg>(
    urn,
    actualInitialState,
    reducer
  );

  // Store shutdown hook if present (would need lifecycle integration)
  if (onShutdownMethod && typeof instance[onShutdownMethod] === 'function') {
    // Note: This would integrate with @servicejs/lifecycle package
    // For now, we just store it for potential future use
    (instance as any).__onShutdown = () => instance[onShutdownMethod]();
  }

  return ok({
    component,
    capability,
    instance,
  });
};
