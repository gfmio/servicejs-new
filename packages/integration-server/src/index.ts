/**
 * @servicejs/integration-server
 *
 * Server adapter interfaces for ServiceJS
 *
 * Provides base interfaces for HTTP/WebSocket/TCP server integrations.
 * Actual server implementations are in runtime-specific packages:
 * - @servicejs/runtime-node - Node.js HTTP/TCP/WebSocket
 * - @servicejs/runtime-bun - Bun.serve for HTTP/WebSocket
 * - @servicejs/runtime-cloudflare - Workers fetch handler
 */

export type {
  ServerAdapter,
  ServerConfig,
  ServerRequest,
  ServerResponse,
  ServerConnection,
} from './server.js';

export {
  createServerAdapter,
} from './server.js';
