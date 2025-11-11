/**
 * Node.js Worker Threads runtime bootstrap
 *
 * Wraps Node.js worker_threads environment and provides explicit capabilities.
 */

import { some, none } from '@servicejs/option';
import { ok, err } from '@servicejs/result';
import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability, ShutdownHandler } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability, ReadFileOptions, WriteFileOptions, MkdirOptions, RemoveOptions } from '@servicejs/capability-fs';
import type { HTTPCapability, HTTPResponse } from '@servicejs/capability-http';
import type { StreamsCapability, StdinCapability, StdoutCapability, StderrCapability } from '@servicejs/capability-streams';
import type { CryptoCapability, HashAlgorithm, HMACAlgorithm } from '@servicejs/capability-crypto';
import type { NodeWorkerRuntimeCapabilities, NodeWorkerBootstrapOptions, ParentPortCapability, MessageError } from './types';
import { promises as fsPromises } from 'node:fs';
import * as crypto from 'node:crypto';
import { parentPort, workerData } from 'node:worker_threads';
import { fetch } from 'undici';

export function bootstrap(options: NodeWorkerBootstrapOptions = {}): NodeWorkerRuntimeCapabilities {
  const {
    captureUncaughtErrors = true,
    captureUnhandledRejections = true,
  } = options;

  // Shutdown handlers
  const shutdownHandlers: ShutdownHandler[] = [];
  let shuttingDown = false;

  // Environment capability (uses workerData passed from main thread)
  const env: EnvironmentCapability = {
    get(key: string) {
      // First check workerData, then fall back to process.env
      const value = workerData?.[key] ?? process.env[key];
      return value !== undefined ? some(value) : none();
    },

    getAll() {
      // Merge workerData with process.env, workerData takes precedence
      return Object.freeze({ ...process.env, ...workerData }) as Readonly<Record<string, string>>;
    },

    platform: 'node-worker',
    version: process.version,
  };

  // Time capability
  const time: TimeCapability = {
    now(): number {
      return Date.now();
    },

    setTimeout(callback: () => void, ms: number) {
      if (ms < 0) {
        return err({
          code: 'INVALID_DELAY',
          message: `Delay must be non-negative, got ${ms}`,
        });
      }

      const id = setTimeout(callback, ms);
      const cancel = () => clearTimeout(id);
      return ok(cancel);
    },

    setInterval(callback: () => void, ms: number) {
      if (ms < 0) {
        return err({
          code: 'INVALID_DELAY',
          message: `Interval must be non-negative, got ${ms}`,
        });
      }

      const id = setInterval(callback, ms);
      const cancel = () => clearInterval(id);
      return ok(cancel);
    },

    hrtime(): bigint {
      return process.hrtime.bigint();
    },
  };

  // Lifecycle capability
  const lifecycle: LifecycleCapability = {
    onShutdown(handler: ShutdownHandler) {
      if (shuttingDown) {
        return err({
          code: 'ALREADY_SHUTDOWN',
          message: 'Already shutting down',
        });
      }

      shutdownHandlers.push(handler);

      const unregister = () => {
        const index = shutdownHandlers.indexOf(handler);
        if (index >= 0) {
          shutdownHandlers.splice(index, 1);
        }
      };

      return ok(unregister);
    },

    async shutdown(reason = 'shutdown') {
      if (shuttingDown) {
        return err({
          code: 'ALREADY_SHUTDOWN',
          message: 'Already shutting down',
        });
      }

      shuttingDown = true;

      const signal = {
        reason,
        timestamp: Date.now(),
      };

      // Run shutdown handlers in reverse order
      for (let i = shutdownHandlers.length - 1; i >= 0; i--) {
        const handler = shutdownHandlers[i];
        if (handler) {
          try {
            await handler(signal);
          } catch (error) {
            console.error('Error in shutdown handler:', error);
          }
        }
      }

      return ok(undefined);
    },

    isShuttingDown() {
      return shuttingDown;
    },
  };

  if (captureUncaughtErrors) {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });
  }

  if (captureUnhandledRejections) {
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
    });
  }

  // Console capability
  const consoleCapability: ConsoleCapability = {
    log(...args: any[]) {
      console.log(...args);
      return ok(undefined);
    },

    info(...args: any[]) {
      console.info(...args);
      return ok(undefined);
    },

    warn(...args: any[]) {
      console.warn(...args);
      return ok(undefined);
    },

    error(...args: any[]) {
      console.error(...args);
      return ok(undefined);
    },

    debug(...args: any[]) {
      console.debug(...args);
      return ok(undefined);
    },
  };

  // Filesystem capability (copied from runtime-node)
  const fs: FilesystemCapability = {
    async readFile(path: string, options: ReadFileOptions = {}) {
      try {
        const encoding = options.encoding || 'utf8';
        
        if (encoding === 'binary') {
          const buffer = await fsPromises.readFile(path);
          return ok(new Uint8Array(buffer));
        } else {
          const content = await fsPromises.readFile(path, encoding);
          return ok(content);
        }
      } catch (error: any) {
        return err({
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' :
                error.code === 'EISDIR' ? 'NOT_A_FILE' : 'READ_ERROR',
          message: error.message,
          path,
        });
      }
    },

    async writeFile(path: string, data: string | Uint8Array, options: WriteFileOptions = {}) {
      try {
        const encoding = options.encoding || 'utf8';

        // Create parent directories if requested
        if (options.createDirs) {
          const pathModule = await import('node:path');
          const dir = pathModule.dirname(path);
          try {
            await fsPromises.mkdir(dir, { recursive: true });
          } catch (mkdirError: any) {
            if (mkdirError.code !== 'EEXIST') {
              return err({
                code: 'WRITE_ERROR',
                message: `Failed to create parent directory: ${mkdirError.message}`,
                path: dir,
              });
            }
          }
        }

        if (encoding === 'binary') {
          await fsPromises.writeFile(path, data);
        } else {
          await fsPromises.writeFile(path, data, encoding);
        }
        return ok(undefined);
      } catch (error: any) {
        return err({
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' :
                error.code === 'ENOTDIR' ? 'NOT_A_DIRECTORY' : 'WRITE_ERROR',
          message: error.message,
          path,
        });
      }
    },

    async exists(path: string) {
      try {
        await fsPromises.access(path);
        return ok(true);
      } catch {
        return ok(false);
      }
    },

    async stat(path: string) {
      try {
        const stats = await fsPromises.stat(path);
        return ok({
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          isSymlink: stats.isSymbolicLink(),
          size: stats.size,
          createdAt: stats.birthtimeMs,
          modifiedAt: stats.mtimeMs,
          accessedAt: stats.atimeMs,
        });
      } catch (error: any) {
        return err({
          code: error.code === 'ENOENT' ? 'NOT_FOUND' : 'UNKNOWN',
          message: error.message,
          path,
        });
      }
    },

    async readdir(path: string) {
      try {
        const entries = await fsPromises.readdir(path, { withFileTypes: true });
        return ok(entries.map(entry => ({
          name: entry.name,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
        })));
      } catch (error: any) {
        return err({
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'ENOTDIR' ? 'NOT_A_DIRECTORY' : 'READ_ERROR',
          message: error.message,
          path,
        });
      }
    },

    async mkdir(path: string, options: MkdirOptions = {}) {
      try {
        await fsPromises.mkdir(path, { recursive: options.recursive });
        return ok(undefined);
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          return ok(undefined); // Already exists is OK
        }
        return err({
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'ENOTDIR' ? 'NOT_A_DIRECTORY' : 'UNKNOWN',
          message: error.message,
          path,
        });
      }
    },

    async remove(path: string, options: RemoveOptions = {}) {
      try {
        const stats = await fsPromises.stat(path);
        if (stats.isDirectory()) {
          await fsPromises.rm(path, { recursive: options.recursive, force: false });
        } else {
          await fsPromises.unlink(path);
        }
        return ok(undefined);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          return ok(undefined); // Already doesn't exist is OK
        }
        return err({
          code: error.code === 'ENOTEMPTY' ? 'NOT_EMPTY' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'UNKNOWN',
          message: error.message,
          path,
        });
      }
    },
  };

  // HTTP capability (using undici for fetch)
  const http: HTTPCapability = {
    async request(url: string, options: any = {}) {
      try {
        const response = await fetch(url, options);

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const httpResponse: HTTPResponse = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.freeze(headers),
          ok: response.ok,
          async text() {
            try {
              const text = await response.text();
              return ok(text);
            } catch (error: any) {
              return err({
                code: 'BODY_READ_ERROR',
                message: error.message,
              });
            }
          },
          async json<T = unknown>() {
            try {
              const json = await response.json();
              return ok(json as T);
            } catch (error: any) {
              return err({
                code: 'BODY_READ_ERROR',
                message: error.message,
              });
            }
          },
          async arrayBuffer() {
            try {
              const buffer = await response.arrayBuffer();
              return ok(buffer);
            } catch (error: any) {
              return err({
                code: 'BODY_READ_ERROR',
                message: error.message,
              });
            }
          },
          async blob() {
            try {
              const blob = await response.blob();
              return ok(blob as any);
            } catch (error: any) {
              return err({
                code: 'BODY_READ_ERROR',
                message: error.message,
              });
            }
          },
        };

        return ok(httpResponse);
      } catch (error: any) {
        return err({
          code: error.name === 'TypeError' ? 'NETWORK_ERROR' :
                error.name === 'AbortError' ? 'REQUEST_ABORTED' :
                'REQUEST_FAILED',
          message: error.message,
        });
      }
    },

    async get(url: string, options) {
      return this.request(url, { ...options, method: 'GET' });
    },

    async post(url: string, options) {
      return this.request(url, { ...options, method: 'POST' });
    },

    async put(url: string, options) {
      return this.request(url, { ...options, method: 'PUT' });
    },

    async patch(url: string, options) {
      return this.request(url, { ...options, method: 'PATCH' });
    },

    async delete(url: string, options) {
      return this.request(url, { ...options, method: 'DELETE' });
    },

    async head(url: string, options) {
      return this.request(url, { ...options, method: 'HEAD' });
    },
  };

  // Crypto capability
  const cryptoCapability: CryptoCapability = {
    randomBytes(length: number) {
      try {
        const bytes = crypto.randomBytes(length);
        return ok(new Uint8Array(bytes));
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED',
          message: error.message,
        });
      }
    },

    randomUUID() {
      try {
        const uuid = crypto.randomUUID();
        return ok(uuid);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED',
          message: error.message,
        });
      }
    },

    randomInt(min: number, max: number) {
      try {
        const value = crypto.randomInt(min, max);
        return ok(value);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED',
          message: error.message,
        });
      }
    },

    async hash(algorithm: HashAlgorithm, data: string | Uint8Array, encoding: 'hex' | 'base64' = 'hex') {
      try {
        const hash = crypto.createHash(algorithm);
        hash.update(typeof data === 'string' ? data : Buffer.from(data));
        const result = hash.digest(encoding);
        
        if (encoding === 'hex') {
          return ok(result);
        } else {
          return ok(new Uint8Array(Buffer.from(result, 'base64')));
        }
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED',
          message: error.message,
        });
      }
    },

    async hmac(algorithm: HMACAlgorithm, key: string | Uint8Array, data: string | Uint8Array, encoding: 'hex' | 'base64' = 'hex') {
      try {
        const hmac = crypto.createHmac(algorithm, typeof key === 'string' ? key : Buffer.from(key));
        hmac.update(typeof data === 'string' ? data : Buffer.from(data));
        const result = hmac.digest(encoding);
        
        if (encoding === 'hex') {
          return ok(result);
        } else {
          return ok(new Uint8Array(Buffer.from(result, 'base64')));
        }
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED',
          message: error.message,
        });
      }
    },

    timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array) {
      try {
        const bufferA = typeof a === 'string' ? Buffer.from(a) : Buffer.from(a);
        const bufferB = typeof b === 'string' ? Buffer.from(b) : Buffer.from(b);
        const result = crypto.timingSafeEqual(bufferA, bufferB);
        return ok(result);
      } catch (error: any) {
        // Buffers must be same length
        return ok(false);
      }
    },
  };

  // Streams capability (no stdin in workers, but keep interface)
  const stdin: StdinCapability = {
    async readLine() {
      return err({
        code: 'READ_ERROR',
        message: 'stdin not available in worker threads',
      });
    },
    
    async readAll() {
      return err({
        code: 'READ_ERROR',
        message: 'stdin not available in worker threads',
      });
    },
    
    isTTY() {
      return false;
    },
  };

  const stdout: StdoutCapability = {
    async write(data: string) {
      console.log(data);
      return ok(undefined);
    },
    
    async writeLine(data: string) {
      console.log(data);
      return ok(undefined);
    },
    
    isTTY() {
      return false;
    },
  };

  const stderr: StderrCapability = {
    async write(data: string) {
      console.error(data);
      return ok(undefined);
    },
    
    async writeLine(data: string) {
      console.error(data);
      return ok(undefined);
    },
    
    isTTY() {
      return false;
    },
  };

  const streams: StreamsCapability = {
    stdin,
    stdout,
    stderr,
  };

  // Parent Port capability (for communication with main thread)
  const messageHandlers: Array<(message: any) => void> = [];

  const parentPortCapability: ParentPortCapability = {
    postMessage(message: any, transferList?: any[]) {
      if (!parentPort) {
        const error: MessageError = {
          code: 'NO_PARENT_PORT',
          message: 'parentPort is not available (not in worker thread?)',
        };
        return err(error);
      }

      try {
        if (transferList) {
          parentPort.postMessage(message, transferList);
        } else {
          parentPort.postMessage(message);
        }
        return ok(undefined);
      } catch (error: any) {
        const messageError: MessageError = {
          code: 'POST_FAILED',
          message: error.message,
        };
        return err(messageError);
      }
    },

    onMessage(handler: (message: any) => void) {
      if (!parentPort) {
        return () => {}; // No-op if no parent port
      }

      messageHandlers.push(handler);

      const wrappedHandler = (message: any) => {
        handler(message);
      };

      parentPort.on('message', wrappedHandler);

      return () => {
        const index = messageHandlers.indexOf(handler);
        if (index !== -1) {
          messageHandlers.splice(index, 1);
        }
        if (parentPort) {
          parentPort.off('message', wrappedHandler);
        }
      };
    },

    close() {
      // Worker threads don't have an explicit close for parentPort
      // The worker can just exit
      process.exit(0);
    },
  };

  return {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    http,
    crypto: cryptoCapability,
    fs,
    streams,
    parentPort: parentPortCapability,
  };
}
