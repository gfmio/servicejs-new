/**
 * @servicejs/lifecycle - Lifecycle and Resource Management
 *
 * Provides lifecycle hooks, shutdown coordination, and resource management
 * for ServiceJS components.
 */

export {
  type LifecycleHooks,
  type LifecycleError,
  type ManagedComponent,
  withLifecycle,
} from './lifecycle.js';

export {
  type ShutdownCoordinator,
  type ShutdownError,
  type ShutdownOptions,
  createShutdownCoordinator,
} from './shutdown.js';

export {
  type Resource,
  type ResourceOwner,
  type ResourceError,
  withResource,
  createResourceOwner,
} from './resources.js';
