/**
 * In-memory environment capability implementation
 *
 * Provides a test-friendly environment capability backed by an in-memory map.
 * Perfect for testing and development.
 */

import { some, none, type Option } from '@servicejs/option';
import type { EnvironmentCapability, Platform } from './types.js';

/**
 * Create an in-memory environment capability
 *
 * Creates an environment capability backed by an in-memory map of variables.
 * The vars object is copied (not referenced), so subsequent mutations won't affect the capability.
 *
 * @param vars - Initial environment variables (will be copied)
 * @param platform - Platform identifier (defaults to 'test')
 * @param version - Platform version string (defaults to 'in-memory')
 * @returns Environment capability backed by in-memory storage
 *
 * @example
 * ```typescript
 * const env = createInMemoryEnv({
 *   NODE_ENV: 'test',
 *   API_URL: 'http://localhost:3000',
 * });
 *
 * const nodeEnv = env.get('NODE_ENV'); // Some('test')
 * const missing = env.get('MISSING'); // None
 * ```
 *
 * @example Testing with different platforms
 * ```typescript
 * const browserEnv = createInMemoryEnv(
 *   { PUBLIC_KEY: 'abc123' },
 *   'browser',
 *   'Chrome/120.0.0'
 * );
 *
 * console.log(browserEnv.platform); // 'browser'
 * console.log(browserEnv.version); // 'Chrome/120.0.0'
 * ```
 */
export function createInMemoryEnv(
  vars: Record<string, string> = {},
  platform: Platform = 'test',
  version: string = 'in-memory'
): EnvironmentCapability {
  // Copy vars to prevent external mutations
  const envVars = { ...vars };

  // Freeze the vars to make them immutable
  const frozenVars = Object.freeze(envVars);

  return {
    get(key: string): Option<string> {
      const value = envVars[key];
      if (value !== undefined) {
        return some(value);
      }
      return none();
    },

    getAll(): Readonly<Record<string, string>> {
      return frozenVars;
    },

    platform,
    version,
  };
}

/**
 * Create an empty environment capability
 *
 * Convenience function for creating an environment with no variables.
 * Useful for testing code that should work without any environment variables.
 *
 * @param platform - Platform identifier (defaults to 'test')
 * @returns Environment capability with no variables
 *
 * @example
 * ```typescript
 * const emptyEnv = createEmptyEnv();
 * const any = emptyEnv.get('ANY_KEY'); // Always None
 * const all = emptyEnv.getAll(); // {}
 * ```
 */
export function createEmptyEnv(platform: Platform = 'test'): EnvironmentCapability {
  return createInMemoryEnv({}, platform, 'empty');
}
