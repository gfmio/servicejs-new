/**
 * @module @servicejs/capability-env
 *
 * Environment capability for ServiceJS.
 *
 * Provides platform-agnostic access to environment variables and platform metadata.
 * All implementations return Option<string> instead of throwing exceptions.
 */

import type { Option } from '@servicejs/option';

/**
 * Platform identifier
 *
 * Identifies the runtime environment.
 */
export type Platform =
  | 'node'
  | 'node-worker'
  | 'browser'
  | 'web-worker'
  | 'shared-worker'
  | 'service-worker'
  | 'cloudflare-worker'
  | 'deno'
  | 'bun'
  | 'test'; // For testing environments

/**
 * Environment capability interface
 *
 * Provides read-only access to environment variables and platform metadata.
 * Never throws exceptions - missing keys return None.
 *
 * @example
 * ```typescript
 * const env: EnvironmentCapability = createInMemoryEnv({
 *   API_KEY: 'secret',
 *   NODE_ENV: 'production',
 * });
 *
 * const apiKey = env.get('API_KEY'); // Some('secret')
 * const missing = env.get('MISSING'); // None
 * const all = env.getAll(); // { API_KEY: 'secret', NODE_ENV: 'production' }
 * ```
 */
export interface EnvironmentCapability {
  /**
   * Get environment variable by key
   *
   * @param key - The environment variable name
   * @returns Some(value) if exists, None if not found
   *
   * @example
   * ```typescript
   * const port = env.get('PORT')
   *   .map(parseInt)
   *   .unwrapOr(3000);
   * ```
   */
  get(key: string): Option<string>;

  /**
   * Get all environment variables
   *
   * Returns a snapshot of all environment variables at the time of the call.
   * The returned object is immutable (frozen).
   *
   * @returns Frozen object with all environment variables
   *
   * @example
   * ```typescript
   * const allVars = env.getAll();
   * console.log(Object.keys(allVars));
   * ```
   */
  getAll(): Readonly<Record<string, string>>;

  /**
   * Platform identifier
   *
   * Identifies which runtime environment this capability represents.
   */
  readonly platform: Platform;

  /**
   * Platform version string
   *
   * Format depends on platform:
   * - Node.js: process.version (e.g., "v20.0.0")
   * - Deno: Deno.version.deno (e.g., "1.40.0")
   * - Browser: navigator.userAgent
   * - In-memory/test: "in-memory" or "test"
   */
  readonly version: string;
}
