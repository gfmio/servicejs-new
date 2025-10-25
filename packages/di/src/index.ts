/**
 * @servicejs/di
 *
 * Dependency injection and inversion of control for ServiceJS.
 *
 * Features:
 * - **Type-safe DI**: Strongly typed tokens and resolution
 * - **Capability-based**: Designed for ports and adapters architecture
 * - **Easy adapters**: Utilities for creating small adapter functions
 * - **Flexible scopes**: Transient, singleton, and scoped lifetimes
 * - **Modular**: Compose applications from modules
 * - **Async support**: Factories can be async
 * - **Resource management**: Automatic cleanup and disposal
 *
 * @example
 * ```typescript
 * import { token, createContainer, adapt } from '@servicejs/di';
 *
 * // Define ports (interfaces)
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create tokens
 * const LoggerToken = token<Logger>('Logger');
 *
 * // Create container and register dependencies
 * const container = createContainer();
 * container.singleton(LoggerToken, () => ({
 *   log: (msg) => console.log(msg)
 * }));
 *
 * // Resolve and use
 * const result = await container.resolve(LoggerToken);
 * if (result._tag === 'Ok') {
 *   result.value.log('Hello, world!');
 * }
 * ```
 *
 * @packageDocumentation
 */

// Core types
export type {
  Token,
  Scope,
  Factory,
  Registration,
  ResolutionError,
  DisposeFn,
  Resolved,
} from './types.js';

export { token } from './types.js';

// Container
export { Container, createContainer } from './container.js';

// Adapters
export {
  adapt,
  wrap,
  composite,
  adaptMethod,
  asyncAdapter,
  capabilityAdapter,
  lazy,
  memoize,
} from './adapter.js';

// Modules
export type { Module } from './module.js';
export {
  createModule,
  composeModules,
  ModuleBuilder,
  moduleBuilder,
} from './module.js';
