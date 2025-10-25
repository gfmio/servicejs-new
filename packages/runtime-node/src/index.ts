/**
 * @servicejs/runtime-node
 *
 * Node.js runtime for ServiceJS.
 *
 * Provides complete Node.js platform integration as explicit capabilities.
 *
 * @example
 * ```typescript
 * import { bootstrap } from '@servicejs/runtime-node';
 *
 * const runtime = bootstrap({
 *   captureShutdownSignals: true,
 *   captureUncaughtErrors: true,
 * });
 *
 * // Use capabilities
 * const apiKey = runtime.env.get('API_KEY').unwrapOr('default');
 * runtime.console.log('Starting...', { apiKey });
 *
 * // Register shutdown handler
 * runtime.lifecycle.onShutdown(async (signal) => {
 *   runtime.console.log('Shutting down', { reason: signal.reason });
 * });
 * ```
 *
 * @packageDocumentation
 */

export type {
  NodeRuntimeCapabilities,
  NodeProcessCapability,
  NodeBootstrapOptions,
  ProcessError,
} from './types.js';

export { bootstrap } from './bootstrap.js';
