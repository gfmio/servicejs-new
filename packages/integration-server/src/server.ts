/**
 * Server Adapter Framework
 *
 * Base interfaces for HTTP/WebSocket/TCP server integrations
 *
 * Note: Actual server implementations are in runtime-specific packages:
 * - @servicejs/runtime-node - Node.js HTTP/TCP/WebSocket
 * - @servicejs/runtime-bun - Bun.serve for HTTP/WebSocket
 * - @servicejs/runtime-cloudflare - Workers fetch handler
 */

import { type Result } from '@servicejs/result';
import { type Integration, type IntegrationMetadata, createIntegration } from '@servicejs/integrations';

// ============================================================================
// Types
// ============================================================================

/**
 * Server configuration
 */
export interface ServerConfig {
  /** Host to bind to */
  host?: string;

  /** Port to listen on */
  port?: number;

  /** TLS/SSL configuration */
  tls?: {
    cert: string;
    key: string;
  };

  /** Additional server-specific options */
  [key: string]: unknown;
}

/**
 * HTTP request
 */
export interface ServerRequest {
  /** HTTP method */
  readonly method: string;

  /** Request URL */
  readonly url: string;

  /** Request headers */
  readonly headers: ReadonlyMap<string, string>;

  /** Request body */
  readonly body?: unknown;
}

/**
 * HTTP response
 */
export interface ServerResponse {
  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Map<string, string>;

  /** Response body */
  body?: unknown;
}

/**
 * Server connection (for WebSocket/TCP)
 */
export interface ServerConnection {
  /** Connection ID */
  readonly id: string;

  /** Send data to connection */
  send(data: unknown): Promise<Result<void, Error>>;

  /** Close connection */
  close(): Promise<Result<void, Error>>;
}

/**
 * Server adapter interface
 */
export interface ServerAdapter extends Integration {
  /**
   * Handle incoming requests
   */
  onRequest?(handler: (request: ServerRequest) => Promise<ServerResponse>): void;

  /**
   * Handle WebSocket connections
   */
  onConnection?(handler: (connection: ServerConnection) => Promise<void>): void;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a server adapter
 *
 * @example
 * ```typescript
 * const server = createServerAdapter(
 *   {
 *     name: 'http-server',
 *     version: '1.0.0',
 *     type: 'server',
 *     platforms: ['node']
 *   },
 *   {
 *     onInit: async (config) => {
 *       // Initialize server
 *       return ok(undefined);
 *     },
 *     onStart: async () => {
 *       // Start listening
 *       return ok(undefined);
 *     }
 *   }
 * );
 * ```
 */
export const createServerAdapter = (
  metadata: IntegrationMetadata,
  handlers: Parameters<typeof createIntegration>[1]
): ServerAdapter => {
  const base = createIntegration(metadata, handlers);

  return {
    ...base,
    // Server-specific methods would be added here
  };
};
