import type { Result } from '@servicejs/result';
import type { Option } from '@servicejs/option';

/**
 * A unique identifier for a dependency (port/interface).
 * Uses symbols for type safety and uniqueness.
 */
export type Token<T> = symbol & { readonly __type: T };

/**
 * Creates a typed token for dependency injection.
 *
 * @param description - Human-readable description of the dependency
 * @returns A unique token for this dependency type
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 * const LoggerToken = token<Logger>('Logger');
 * ```
 */
export const token = <T>(description: string): Token<T> => {
  return Symbol(description) as Token<T>;
};

/**
 * Scope of a dependency's lifetime.
 */
export type Scope = 'transient' | 'singleton' | 'scoped';

/**
 * Factory function that creates an instance of a dependency.
 * Receives resolved dependencies as a record.
 */
export type Factory<T, TDeps extends Record<string, any> = {}> = (
  deps: TDeps
) => T | Promise<T>;

/**
 * Registration of a dependency in the container.
 */
export interface Registration<T, TDeps extends Record<string, any> = {}> {
  readonly token: Token<T>;
  readonly factory: Factory<T, TDeps>;
  readonly scope: Scope;
  readonly dependencies: Token<any>[];
}

/**
 * Error that occurs during dependency resolution.
 */
export interface ResolutionError {
  readonly token: symbol;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Lifecycle hook for managing resource cleanup.
 */
export type DisposeFn = () => void | Promise<void>;

/**
 * A resolved dependency with optional cleanup.
 */
export interface Resolved<T> {
  readonly value: T;
  readonly dispose?: DisposeFn;
}
