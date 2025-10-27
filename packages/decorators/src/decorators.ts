/**
 * Component Decorators
 *
 * Class and method decorators for ergonomic component creation.
 */

import 'reflect-metadata';
import type { URN } from '@servicejs/core';
import { METADATA_KEYS, type HandlerMetadata, type InjectionMetadata } from './metadata.js';

/**
 * Component decorator configuration
 */
export interface ComponentConfig {
  /** URN or namespace for the component */
  readonly urn?: URN;
  /** Initial state factory */
  readonly state?: () => unknown;
}

/**
 * @Component decorator
 *
 * Marks a class as a ServiceJS component.
 *
 * @example
 * ```typescript
 * @Component({ urn: 'urn:app:counter' })
 * class CounterComponent {
 *   // ...
 * }
 * ```
 */
export function Component(config?: ComponentConfig): ClassDecorator {
  return (target: Function) => {
    // Generate URN if not provided
    const urn = config?.urn || `urn:component:${target.name.toLowerCase()}`;

    // Store URN in metadata
    Reflect.defineMetadata(METADATA_KEYS.COMPONENT_URN, urn, target);

    // Store state factory if provided
    if (config?.state) {
      Reflect.defineMetadata(METADATA_KEYS.COMPONENT_STATE, config.state, target);
    }
  };
}

/**
 * @Handler decorator
 *
 * Marks a method as a message handler.
 *
 * @example
 * ```typescript
 * class CounterComponent {
 *   @Handler('increment')
 *   handleIncrement(state: CounterState, message: IncrementMessage) {
 *     return { ...state, count: state.count + message.amount };
 *   }
 * }
 * ```
 */
export function Handler(messageType?: string): MethodDecorator {
  return (target: Object, propertyKey: string | symbol) => {
    const methodName = String(propertyKey);

    // Get existing handlers or initialize
    const handlers: HandlerMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.COMPONENT_HANDLERS, target.constructor) || [];

    // Add this handler
    handlers.push({
      methodName,
      messageType,
    });

    // Store updated handlers
    Reflect.defineMetadata(METADATA_KEYS.COMPONENT_HANDLERS, handlers, target.constructor);
  };
}

/**
 * @Inject decorator
 *
 * Marks a constructor parameter for capability injection.
 *
 * @example
 * ```typescript
 * class UserService {
 *   constructor(
 *     @Inject('database') private db: Capability<DbMessage>
 *   ) {}
 * }
 * ```
 */
export function Inject(capabilityName: string): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // Get existing injections or initialize
    const injections: InjectionMetadata[] =
      Reflect.getMetadata(METADATA_KEYS.COMPONENT_INJECTIONS, target) || [];

    // Add this injection
    injections.push({
      parameterIndex,
      capabilityName,
    });

    // Store updated injections
    Reflect.defineMetadata(METADATA_KEYS.COMPONENT_INJECTIONS, injections, target);
  };
}

/**
 * @OnInit decorator
 *
 * Marks a method to be called during component initialization.
 *
 * @example
 * ```typescript
 * class MyComponent {
 *   @OnInit
 *   initialize() {
 *     console.log('Component initialized');
 *   }
 * }
 * ```
 */
export function OnInit(target: Object, propertyKey: string | symbol): void {
  const methodName = String(propertyKey);
  Reflect.defineMetadata(METADATA_KEYS.COMPONENT_ON_INIT, methodName, target.constructor);
}

/**
 * @OnShutdown decorator
 *
 * Marks a method to be called during component shutdown.
 *
 * @example
 * ```typescript
 * class MyComponent {
 *   @OnShutdown
 *   cleanup() {
 *     console.log('Component shutting down');
 *   }
 * }
 * ```
 */
export function OnShutdown(target: Object, propertyKey: string | symbol): void {
  const methodName = String(propertyKey);
  Reflect.defineMetadata(METADATA_KEYS.COMPONENT_ON_SHUTDOWN, methodName, target.constructor);
}
