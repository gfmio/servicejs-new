/**
 * Browser runtime for ServiceJS
 *
 * Provides complete browser platform integration as explicit capabilities.
 */

export { bootstrap } from './bootstrap';
export type {
  BrowserRuntimeCapabilities,
  BrowserBootstrapOptions,
  WindowCapability,
  StorageCapability,
  StorageError,
} from './types';
