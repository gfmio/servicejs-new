/**
 * Web Worker runtime for ServiceJS
 *
 * Provides Web Worker platform integration as explicit capabilities.
 */

export { bootstrap } from './bootstrap';
export type {
  WebWorkerRuntimeCapabilities,
  WebWorkerBootstrapOptions,
  MessagePortCapability,
  MessageError,
} from './types';
