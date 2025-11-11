/**
 * @servicejs/runtime-bun-worker
 *
 * Bun Worker runtime for ServiceJS
 * Provides capability-based access to Bun worker environment
 */

export { bootstrap } from './bootstrap';
export type {
  BunWorkerRuntimeCapabilities,
  BunWorkerBootstrapOptions,
  WorkerSelfCapability,
  MessageError,
} from './types';
