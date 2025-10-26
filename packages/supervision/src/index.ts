/**
 * @servicejs/supervision - Supervision Pattern
 *
 * Provides Erlang/Akka-style supervision for fault-tolerant components.
 */

export {
  type SupervisionStrategy,
  type ErrorNotification,
  type SupervisorConfig,
  type ChildInfo,
  type Supervisor,
  type SupervisionError,
  createSupervisor,
} from './supervision.js';
