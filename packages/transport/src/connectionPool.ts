/**
 * Connection Pool
 *
 * Manages a pool of reusable TCP connections for efficient resource usage.
 */

import type { URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err, isErr, type Ok } from '@servicejs/result';
import type { Transport, TransportError } from './transport.js';
import type { TCPTransportConfig } from './tcpTransport.js';
import { createTCPTransport } from './tcpTransport.js';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /**
   * Maximum connections per host:port (default: 10)
   */
  readonly maxConnectionsPerHost?: number;

  /**
   * Maximum idle time before closing connection in ms (default: 60000 - 1 minute)
   */
  readonly maxIdleTime?: number;

  /**
   * Timeout for acquiring a connection in ms (default: 5000)
   */
  readonly acquireTimeout?: number;

  /**
   * Interval for idle connection cleanup in ms (default: 30000)
   */
  readonly cleanupInterval?: number;

  /**
   * Base URN for pooled connections
   */
  readonly baseUrn: URN;

  /**
   * Default TCP transport config options
   */
  readonly defaultTransportConfig?: Partial<Omit<TCPTransportConfig, 'localUrn' | 'host' | 'port'>>;
}

/**
 * Pool statistics for a specific destination
 */
export interface PoolStats {
  readonly total: number;
  readonly idle: number;
  readonly active: number;
  readonly waiting: number;
}

/**
 * Connection info tracked by the pool
 */
interface PooledConnection {
  transport: Transport;
  host: string;
  port: number;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
}

/**
 * Pending acquire request
 */
interface AcquireRequest {
  host: string;
  port: number;
  resolve: (transport: Transport) => void;
  reject: (error: TransportError) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
}

/**
 * Connection pool for managing reusable TCP connections
 */
export class ConnectionPool {
  private readonly config: Required<ConnectionPoolConfig>;
  private readonly connections = new Map<string, PooledConnection[]>();
  private readonly waitQueue: AcquireRequest[] = [];
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private nextConnectionId = 0;
  private shuttingDown = false;

  constructor(config: ConnectionPoolConfig) {
    this.config = {
      maxConnectionsPerHost: config.maxConnectionsPerHost ?? 10,
      maxIdleTime: config.maxIdleTime ?? 60000,
      acquireTimeout: config.acquireTimeout ?? 5000,
      cleanupInterval: config.cleanupInterval ?? 30000,
      baseUrn: config.baseUrn,
      defaultTransportConfig: config.defaultTransportConfig ?? {},
    };

    // Start idle connection cleanup
    this.startCleanup();
  }

  /**
   * Get pool key for a destination
   */
  private getPoolKey(host: string, port: number): string {
    return `${host}:${port}`;
  }

  /**
   * Get connections for a destination
   */
  private getConnections(host: string, port: number): PooledConnection[] {
    const key = this.getPoolKey(host, port);
    let conns = this.connections.get(key);
    if (!conns) {
      conns = [];
      this.connections.set(key, conns);
    }
    return conns;
  }

  /**
   * Create a new connection
   */
  private async createConnection(
    host: string,
    port: number
  ): Promise<Result<PooledConnection, TransportError>> {
    const connectionId = this.nextConnectionId++;
    const localUrn = `${this.config.baseUrn}:conn-${connectionId}` as unknown as URN;

    const transport = createTCPTransport({
      ...this.config.defaultTransportConfig,
      localUrn,
      host,
      port,
    });

    const connectResult = await transport.connect();
    if (isErr(connectResult)) {
      return connectResult;
    }

    const pooledConn: PooledConnection = {
      transport,
      host,
      port,
      inUse: false,
      lastUsed: Date.now(),
      createdAt: Date.now(),
    };

    return ok(pooledConn);
  }

  /**
   * Find an idle connection or create a new one
   */
  private async getOrCreateConnection(
    host: string,
    port: number
  ): Promise<Result<PooledConnection, TransportError>> {
    const conns = this.getConnections(host, port);

    // Try to find an idle connection
    const idle = conns.find((c) => !c.inUse && c.transport.isConnected());
    if (idle) {
      idle.inUse = true;
      idle.lastUsed = Date.now();
      return ok(idle);
    }

    // Check if we can create a new connection
    if (conns.length < this.config.maxConnectionsPerHost) {
      const result = await this.createConnection(host, port);
      if (isErr(result)) {
        return result;
      }
      const conn = (result as Ok<PooledConnection>).value;
      conn.inUse = true;
      conns.push(conn);
      return ok(conn);
    }

    // Pool is full
    return err({
      type: 'CONNECTION_FAILED',
      error: new Error(`Connection pool full for ${host}:${port}`),
    });
  }

  /**
   * Process waiting queue
   */
  private async processWaitQueue(): Promise<void> {
    if (this.waitQueue.length === 0) {
      return;
    }

    const request = this.waitQueue.shift()!;
    const result = await this.getOrCreateConnection(request.host, request.port);

    if (isErr(result)) {
      clearTimeout(request.timeoutHandle);
      request.reject(result.error);
      // Try next request
      await this.processWaitQueue();
    } else {
      clearTimeout(request.timeoutHandle);
      const conn = (result as Ok<PooledConnection>).value;
      request.resolve(conn.transport);
    }
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(host: string, port: number): Promise<Result<Transport, TransportError>> {
    if (this.shuttingDown) {
      return err({
        type: 'CONNECTION_FAILED',
        error: new Error('Connection pool is shutting down'),
      });
    }

    // Try to get a connection immediately
    const result = await this.getOrCreateConnection(host, port);
    if (isErr(result)) {
      // If pool is full, wait for a connection to be released
      const error = result.error;
      const errorMessage =
        error.type === 'CONNECTION_FAILED' && error.error instanceof Error ? error.error.message : '';
      if (errorMessage.includes('pool full')) {
        return new Promise<Result<Transport, TransportError>>((resolve) => {
          const timeoutHandle = setTimeout(() => {
            // Remove from queue
            const index = this.waitQueue.findIndex((r) => r.timeoutHandle === timeoutHandle);
            if (index >= 0) {
              this.waitQueue.splice(index, 1);
            }
            resolve(
              err({
                type: 'CONNECTION_FAILED',
                error: new Error(`Acquire timeout after ${this.config.acquireTimeout}ms`),
              })
            );
          }, this.config.acquireTimeout);

          this.waitQueue.push({
            host,
            port,
            resolve: (transport) => resolve(ok(transport)),
            reject: (error) => resolve(err(error)),
            timeoutHandle,
          });
        });
      }

      return result;
    }

    const conn = (result as Ok<PooledConnection>).value;
    return ok(conn.transport);
  }

  /**
   * Release a connection back to the pool
   */
  async release(transport: Transport): Promise<Result<void, TransportError>> {
    // Find the connection
    for (const conns of this.connections.values()) {
      const conn = conns.find((c) => c.transport === transport);
      if (conn) {
        conn.inUse = false;
        conn.lastUsed = Date.now();

        // Process waiting queue
        await this.processWaitQueue();

        return ok(undefined);
      }
    }

    return err({
      type: 'SEND_FAILED',
      error: new Error('Connection not found in pool'),
    });
  }

  /**
   * Destroy a connection (remove from pool and disconnect)
   */
  async destroy(transport: Transport): Promise<Result<void, TransportError>> {
    // Find and remove the connection
    for (const [key, conns] of this.connections.entries()) {
      const index = conns.findIndex((c) => c.transport === transport);
      if (index >= 0) {
        const conn = conns[index];
        conns.splice(index, 1);

        // Clean up empty pools
        if (conns.length === 0) {
          this.connections.delete(key);
        }

        // Disconnect
        await conn.transport.disconnect();

        // Process waiting queue in case someone is waiting
        await this.processWaitQueue();

        return ok(undefined);
      }
    }

    return err({
      type: 'SEND_FAILED',
      error: new Error('Connection not found in pool'),
    });
  }

  /**
   * Get statistics for a specific destination
   */
  getStats(host: string, port: number): PoolStats {
    const conns = this.getConnections(host, port);

    const active = conns.filter((c) => c.inUse).length;
    const idle = conns.filter((c) => !c.inUse).length;
    const waiting = this.waitQueue.filter((r) => r.host === host && r.port === port).length;

    return {
      total: conns.length,
      idle,
      active,
      waiting,
    };
  }

  /**
   * Get all pool statistics
   */
  getAllStats(): Map<string, PoolStats> {
    const stats = new Map<string, PoolStats>();

    for (const [key, conns] of this.connections.entries()) {
      const [host, portStr] = key.split(':');
      const port = parseInt(portStr, 10);

      const active = conns.filter((c) => c.inUse).length;
      const idle = conns.filter((c) => !c.inUse).length;
      const waiting = this.waitQueue.filter((r) => r.host === host && r.port === port).length;

      stats.set(key, {
        total: conns.length,
        idle,
        active,
        waiting,
      });
    }

    return stats;
  }

  /**
   * Cleanup idle connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();

    for (const conns of this.connections.values()) {
      const toRemove: PooledConnection[] = [];

      for (const conn of conns) {
        // Remove idle connections that have exceeded max idle time
        if (!conn.inUse && now - conn.lastUsed > this.config.maxIdleTime) {
          toRemove.push(conn);
        }

        // Remove disconnected connections
        if (!conn.transport.isConnected()) {
          toRemove.push(conn);
        }
      }

      for (const conn of toRemove) {
        const index = conns.indexOf(conn);
        if (index >= 0) {
          conns.splice(index, 1);
          await conn.transport.disconnect();
        }
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.cleanupInterval);
  }

  /**
   * Shutdown the pool (close all connections)
   */
  async shutdown(): Promise<Result<void, TransportError>> {
    this.shuttingDown = true;

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Reject all waiting requests
    for (const request of this.waitQueue) {
      clearTimeout(request.timeoutHandle);
      request.reject({
        type: 'CONNECTION_FAILED',
        error: new Error('Connection pool shut down'),
      });
    }
    this.waitQueue.length = 0;

    // Close all connections
    const closePromises: Promise<Result<void, TransportError>>[] = [];
    for (const conns of this.connections.values()) {
      for (const conn of conns) {
        closePromises.push(conn.transport.disconnect());
      }
    }

    await Promise.all(closePromises);
    this.connections.clear();

    return ok(undefined);
  }
}

/**
 * Create a connection pool
 */
export const createConnectionPool = (config: ConnectionPoolConfig): ConnectionPool => {
  return new ConnectionPool(config);
};
