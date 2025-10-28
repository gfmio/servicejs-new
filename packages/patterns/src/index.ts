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
