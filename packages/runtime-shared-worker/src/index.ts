/**
 * Shared Worker runtime for ServiceJS
 *
 * Provides Shared Worker platform integration as explicit capabilities.
 */

export { bootstrap } from './bootstrap';
export type {
  SharedWorkerRuntimeCapabilities,
  SharedWorkerBootstrapOptions,
  SharedWorkerPortCapability,
  BroadcastError,
  MessageError,
} from './types';
