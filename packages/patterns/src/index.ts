/**
 * @servicejs/patterns
 *
 * Advanced architectural patterns for ServiceJS
 */

// Saga Pattern
export type {
  SagaStep,
  SagaOutcome,
  SagaStatus,
  SagaState,
  Saga,
  SagaBuilder,
  CompleteSagaBuilder,
} from './saga.js';

export {
  executeSaga,
  createSagaBuilder,
  createStep,
  createIdempotentStep,
} from './saga.js';

// CQRS Pattern
export type {
  Command,
  CommandMetadata,
  Query,
  QueryMetadata,
  CommandHandler,
  QueryHandler,
  CommandBus,
  QueryBus,
} from './cqrs.js';

export {
  createCommandBus,
  createQueryBus,
  createCommand,
  createQuery,
  isCommand,
  isQuery,
} from './cqrs.js';

// Event Sourcing
export type {
  Event,
  EventMetadata,
  EventStore,
  Snapshot,
  SnapshotStore,
  Projection,
} from './event-sourcing.js';

export {
  createInMemoryEventStore,
  createInMemorySnapshotStore,
  replayEvents,
  rebuildFromEventStore,
  rebuildWithSnapshot,
  buildProjection,
  createEvent,
  createSnapshot,
} from './event-sourcing.js';

// Actor Mobility
export type {
  SerializedState,
  SerializedStateMetadata,
  MobileComponent,
  MobileComponentFactory,
  MigrationManager,
  MigrationHandle,
  MigrationStatus,
} from './mobility.js';

export {
  createSerializedState,
  validateSerializedState,
  cloneSerializedState,
  createInMemoryMigrationManager,
  createMobileComponentFactory,
} from './mobility.js';

// Plugin System
export type {
  PluginMetadata,
  PluginHooks,
  Plugin,
  PluginState,
  RegisteredPlugin,
  PluginManager,
} from './plugin.js';

export {
  createPluginManager,
  createPlugin,
  validatePluginDependencies,
} from './plugin.js';
