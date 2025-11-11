/**
 * @servicejs/runtime-node-worker
 *
 * Node.js Worker Threads runtime for ServiceJS
 * Provides capability-based access to worker_threads environment
 */

export { bootstrap } from './bootstrap';
export type {
  NodeWorkerRuntimeCapabilities,
  NodeWorkerBootstrapOptions,
  ParentPortCapability,
  MessageError,
} from './types';
