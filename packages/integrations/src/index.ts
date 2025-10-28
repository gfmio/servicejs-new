/**
 * @servicejs/integrations
 *
 * Base integration framework for ServiceJS
 *
 * This package provides the foundational integration lifecycle management:
 * - Standard lifecycle (init, start, stop, destroy)
 * - State tracking and validation
 * - Health monitoring
 * - Error handling
 *
 * Specific adapter types are in separate packages:
 * - @servicejs/integration-server - HTTP/WebSocket/TCP server adapters
 * - @servicejs/integration-database - SQL/NoSQL database adapters
 * - @servicejs/integration-mq - Message queue adapters
 */

// Base integration interfaces
export type {
  Integration,
  IntegrationConfig,
  IntegrationMetadata,
  IntegrationLifecycle,
  IntegrationState,
  HealthStatus,
} from './base.js';

export {
  createIntegration,
} from './base.js';
