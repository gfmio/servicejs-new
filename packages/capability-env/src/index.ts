/**
 * @servicejs/capability-env
 *
 * Environment capability for ServiceJS - platform-agnostic environment variable access.
 *
 * This package provides:
 * - Type-safe environment variable access
 * - Platform identification
 * - In-memory implementations for testing
 * - No exceptions - returns Option<T>
 *
 * @packageDocumentation
 */

export type { EnvironmentCapability, Platform } from './types.js';
export { createInMemoryEnv, createEmptyEnv } from './in-memory.js';
