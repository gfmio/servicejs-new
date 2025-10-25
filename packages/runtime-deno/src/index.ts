/**
 * Deno runtime for ServiceJS
 *
 * Provides complete Deno platform integration as explicit capabilities.
 */

export { bootstrap } from './bootstrap';
export type {
  DenoRuntimeCapabilities,
  DenoBootstrapOptions,
  DenoProcessCapability,
  ProcessError,
} from './types';
