/**
 * Bun Worker runtime bootstrap
 *
 * Provides capability-based access to Bun worker environment using Web Worker API
 */

import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type {
  BunWorkerRuntimeCapabilities,
  BunWorkerBootstrapOptions,
  WorkerSelfCapability,
  MessageError,
} from './types';
import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability, ShutdownHandler } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability, FSError, FileStat, DirectoryEntry } from '@servicejs/capability-fs';
import type { HTTPCapability, HTTPResponse, HTTPError, HTTPRequestOptions } from '@servicejs/capability-http';
import type {
  StreamsCapability,
  StdinCapability,
  StdoutCapability,
  StderrCapability,
} from '@servicejs/capability-streams';
import type { CryptoCapability, HashAlgorithm, HMACAlgorithm, HashEncoding } from '@servicejs/capability-crypto';

/**
 * Bootstrap the Bun worker runtime with all capabilities
 */
export function bootstrap(
  options: BunWorkerBootstrapOptions = {}
): BunWorkerRuntimeCapabilities {
  const {
    captureUncaughtErrors = true,
    captureUnhandledRejections = true,
  } = options;

  // Check if we're in a worker context
  const isWorker = typeof globalThis !== 'undefined' && !Bun.isMainThread;

  // Environment capability - falls back to process.env
  const env: EnvironmentCapability = {
    get(key: string) {
      // In Bun workers, we just use process.env
      // Note: Bun doesn't have getEnvironmentData like Node.js
      const value = process.env[key];
      return value !== undefined ? some(value) : none();
    },
    getAll() {
      return Object.freeze({ ...process.env }) as Readonly<Record<string, string>>;
    },
    platform: 'web-worker',
    version: Bun.version,
  };

  // Time capability
  let nextTimerId = 1;
  const timeouts = new Map<number, Timer>();
  const intervals = new Map<number, Timer>();

  const time: TimeCapability = {
    now() {
      return Date.now();
    },
    highResolutionTime() {
      return some(performance.now());
    },
    setTimeout(callback, ms) {
      const id = nextTimerId++;
      const timerId = globalThis.setTimeout(() => {
        timeouts.delete(id);
        callback();
      }, ms);
      timeouts.set(id, timerId);
      const cancelFn = () => {
        globalThis.clearTimeout(timerId);
        timeouts.delete(id);
      };
      return ok(cancelFn);
    },
    clearTimeout(id) {
      const timerId = timeouts.get(id as number);
      if (timerId !== undefined) {
        globalThis.clearTimeout(timerId);
        timeouts.delete(id as number);
        return ok(undefined);
      }
      return err({
        code: 'INVALID_TIMER_ID' as const,
        message: `Invalid timer ID: ${id}`,
      });
    },
    setInterval(callback, ms) {
      const id = nextTimerId++;
      const timerId = globalThis.setInterval(callback, ms);
      intervals.set(id, timerId);
      const cancelFn = () => {
        globalThis.clearInterval(timerId);
        intervals.delete(id);
      };
      return ok(cancelFn);
    },
    clearInterval(id) {
      const timerId = intervals.get(id as number);
      if (timerId !== undefined) {
        globalThis.clearInterval(timerId);
        intervals.delete(id as number);
        return ok(undefined);
      }
      return err({
        code: 'INVALID_TIMER_ID' as const,
        message: `Invalid timer ID: ${id}`,
      });
    },
  };

  // Lifecycle capability
  const shutdownHandlers: Array<ShutdownHandler> = [];
  let isShuttingDown = false;

  const lifecycle: LifecycleCapability = {
    onShutdown(handler: ShutdownHandler) {
      if (isShuttingDown) {
        return err({
          code: 'ALREADY_SHUTDOWN' as const,
          message: 'Already shutting down',
        });
      }
      if (handler) {
        shutdownHandlers.push(handler);
      }
      const unregister = () => {
        const index = shutdownHandlers.indexOf(handler);
        if (index !== -1) {
          shutdownHandlers.splice(index, 1);
        }
      };
      return ok(unregister);
    },
    async shutdown(reason = 'Manual shutdown') {
      if (isShuttingDown) {
        return err({
          code: 'ALREADY_SHUTDOWN' as const,
          message: 'Already shutting down',
        });
      }
      isShuttingDown = true;
      const signal = {
        reason,
        timestamp: Date.now(),
      };
      // Execute handlers in reverse order
      for (let i = shutdownHandlers.length - 1; i >= 0; i--) {
        try {
          const handler = shutdownHandlers[i];
          if (handler) {
            await handler(signal);
          }
        } catch (error) {
          console.error('Shutdown handler error:', error);
        }
      }
      return ok(undefined);
    },
    isShuttingDown() {
      return isShuttingDown;
    },
  };

  // Error handlers
  if (captureUncaughtErrors) {
    globalThis.addEventListener('error', (event: any) => {
      console.error('Uncaught error:', event.error || event.message);
      if (event.preventDefault) {
        event.preventDefault();
      }
    });
  }

  if (captureUnhandledRejections) {
    globalThis.addEventListener('unhandledrejection', (event: any) => {
      console.error('Unhandled rejection:', event.reason);
      if (event.preventDefault) {
        event.preventDefault();
      }
    });
  }

  // Console capability
  const consoleCapability: ConsoleCapability = {
    log(message: string, ...args: unknown[]) {
      console.log(message, ...args);
      return ok(undefined);
    },
    error(message: string, ...args: unknown[]) {
      console.error(message, ...args);
      return ok(undefined);
    },
    warn(message: string, ...args: unknown[]) {
      console.warn(message, ...args);
      return ok(undefined);
    },
    debug(message: string, ...args: unknown[]) {
      console.debug(message, ...args);
      return ok(undefined);
    },
    info(message: string, ...args: unknown[]) {
      console.info(message, ...args);
      return ok(undefined);
    },
  };

  // Filesystem capability - uses Bun's file APIs
  const fs: FilesystemCapability = {
    async readFile(path: string) {
      try {
        const file = Bun.file(path);
        const text = await file.text();
        return ok(text);
      } catch (error: any) {
        const fsError: FSError = {
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' :
                error.code === 'EISDIR' ? 'NOT_A_FILE' : 'READ_ERROR',
          message: error.message,
          path,
        };
        return err(fsError);
      }
    },
    async writeFile(path: string, content: string) {
      try {
        await Bun.write(path, content);
        return ok(undefined);
      } catch (error: any) {
        const fsError: FSError = {
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' :
                error.code === 'EISDIR' ? 'NOT_A_FILE' : 'WRITE_ERROR',
          message: error.message,
          path,
        };
        return err(fsError);
      }
    },
    async exists(path: string) {
      try {
        const file = Bun.file(path);
        const exists = await file.exists();
        return ok(exists);
      } catch (error: any) {
        return ok(false);
      }
    },
    async stat(path: string) {
      try {
        const file = Bun.file(path);
        const exists = await file.exists();
        if (!exists) {
          const fsError: FSError = {
            code: 'NOT_FOUND',
            message: `File not found: ${path}`,
            path,
          };
          return err(fsError);
        }

        const size = file.size;
        const lastModified = file.lastModified;

        // Bun.file doesn't provide full stat info, use minimal stat
        const stat: FileStat = {
          isFile: true,
          isDirectory: false,
          isSymlink: false,
          size,
          createdAt: lastModified,
          modifiedAt: lastModified,
          accessedAt: lastModified,
        };
        return ok(stat);
      } catch (error: any) {
        const fsError: FSError = {
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'READ_ERROR',
          message: error.message,
          path,
        };
        return err(fsError);
      }
    },
    async readdir(path: string) {
      try {
        const { readdirSync } = await import('fs');

        const entries = readdirSync(path, { withFileTypes: true });
        const result: DirectoryEntry[] = entries.map((entry) => ({
          name: entry.name,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
        }));
        return ok(result);
      } catch (error: any) {
        const fsError: FSError = {
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'ENOTDIR' ? 'NOT_A_DIRECTORY' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'READ_ERROR',
          message: error.message,
          path,
        };
        return err(fsError);
      }
    },
    async mkdir(path: string, options?: { recursive?: boolean }) {
      try {
        const { mkdirSync } = await import('fs');
        mkdirSync(path, { recursive: options?.recursive ?? false });
        return ok(undefined);
      } catch (error: any) {
        const fsError: FSError = {
          code: error.code === 'EEXIST' ? 'ALREADY_EXISTS' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' :
                error.code === 'ENOENT' ? 'NOT_FOUND' : 'WRITE_ERROR',
          message: error.message,
          path,
        };
        return err(fsError);
      }
    },
    async remove(path: string) {
      try {
        const { rmSync } = await import('fs');
        rmSync(path, { recursive: true, force: true });
        return ok(undefined);
      } catch (error: any) {
        const fsError: FSError = {
          code: error.code === 'ENOENT' ? 'NOT_FOUND' :
                error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'WRITE_ERROR',
          message: error.message,
          path,
        };
        return err(fsError);
      }
    },
  };

  // HTTP capability - uses native fetch
  const http: HTTPCapability = {
    async request(url: string, options: HTTPRequestOptions = {}) {
      try {
        const response = await fetch(url, {
          method: options.method || 'GET',
          headers: options.headers,
          body: options.body,
          signal: options.signal || null,
        });

        const httpResponse: HTTPResponse = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          async text() {
            try {
              const text = await response.text();
              return ok(text);
            } catch (error: any) {
              const httpError: HTTPError = {
                code: 'BODY_READ_ERROR' as const,
                message: error.message,
                url,
              };
              return err(httpError);
            }
          },
          async json<T = unknown>() {
            try {
              const json = await response.json();
              return ok(json as T);
            } catch (error: any) {
              const httpError: HTTPError = {
                code: 'INVALID_RESPONSE' as const,
                message: error.message,
                url,
              };
              return err(httpError);
            }
          },
          async arrayBuffer() {
            try {
              const buffer = await response.arrayBuffer();
              return ok(buffer);
            } catch (error: any) {
              const httpError: HTTPError = {
                code: 'BODY_READ_ERROR' as const,
                message: error.message,
                url,
              };
              return err(httpError);
            }
          },
          async blob() {
            try {
              const blob = await response.blob();
              return ok(blob as any as Blob);
            } catch (error: any) {
              const httpError: HTTPError = {
                code: 'BODY_READ_ERROR' as const,
                message: error.message,
                url,
              };
              return err(httpError);
            }
          },
        };

        return ok(httpResponse);
      } catch (error: any) {
        const httpError: HTTPError = {
          code: error.name === 'AbortError' ? 'ABORTED' :
                error.name === 'TypeError' ? 'INVALID_URL' : 'NETWORK_ERROR',
          message: error.message,
          url,
        };
        return err(httpError);
      }
    },
    async get(url: string, options: HTTPRequestOptions = {}) {
      return http.request(url, { ...options, method: 'GET' });
    },
    async post(url: string, options: HTTPRequestOptions = {}) {
      return http.request(url, { ...options, method: 'POST' });
    },
    async put(url: string, options: HTTPRequestOptions = {}) {
      return http.request(url, { ...options, method: 'PUT' });
    },
    async patch(url: string, options: HTTPRequestOptions = {}) {
      return http.request(url, { ...options, method: 'PATCH' });
    },
    async delete(url: string, options: HTTPRequestOptions = {}) {
      return http.request(url, { ...options, method: 'DELETE' });
    },
    async head(url: string, options: HTTPRequestOptions = {}) {
      return http.request(url, { ...options, method: 'HEAD' });
    },
  };

  // Crypto capability - uses Bun's crypto APIs
  const crypto: CryptoCapability = {
    randomBytes(length: number) {
      try {
        const bytes = new Uint8Array(length);
        globalThis.crypto.getRandomValues(bytes);
        return ok(bytes);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    randomUUID() {
      try {
        const uuid = globalThis.crypto.randomUUID();
        return ok(uuid);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    randomInt(min: number, max: number) {
      try {
        const range = max - min;
        if (range <= 0) {
          return err({
            code: 'INVALID_LENGTH' as const,
            message: 'max must be greater than min',
          });
        }
        const randomBytes = new Uint32Array(1);
        if (globalThis.crypto) {
          globalThis.crypto.getRandomValues(randomBytes);
        }
        const randomValue = randomBytes[0]! / (0xFFFFFFFF + 1);
        const result = Math.floor(randomValue * range) + min;
        return ok(result);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    async hash(algorithm: HashAlgorithm, data: string | Uint8Array, encoding: HashEncoding = 'hex') {
      try {
        const hasher = new Bun.CryptoHasher(algorithm);
        hasher.update(data);

        if (encoding === 'buffer') {
          const hashBuffer = hasher.digest();
          return ok(new Uint8Array(hashBuffer));
        }
        const hashString = hasher.digest(encoding as 'hex' | 'base64');
        return ok(hashString);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    async hmac(algorithm: HMACAlgorithm, key: string | Uint8Array, data: string | Uint8Array, encoding: HashEncoding = 'hex') {
      try {
        const hasher = new Bun.CryptoHasher(algorithm, key);
        hasher.update(data);

        if (encoding === 'buffer') {
          const hmacBuffer = hasher.digest();
          return ok(new Uint8Array(hmacBuffer));
        }
        const hmacString = hasher.digest(encoding as 'hex' | 'base64');
        return ok(hmacString);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    timingSafeEqual(a: string | Uint8Array, b: string | Uint8Array) {
      try {
        const aBytes = typeof a === 'string' ? new TextEncoder().encode(a) : a;
        const bBytes = typeof b === 'string' ? new TextEncoder().encode(b) : b;

        if (aBytes.length !== bBytes.length) {
          return ok(false);
        }

        let result = 0;
        for (let i = 0; i < aBytes.length; i++) {
          result |= aBytes[i]! ^ bBytes[i]!;
        }
        return ok(result === 0);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
  };

  // Streams capability (no stdin in workers, stdout/stderr to console)
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

  // Worker self capability for communication
  const messageHandlers: Array<(message: any) => void> = [];

  const workerSelf: WorkerSelfCapability = {
    postMessage(message: any) {
      if (!isWorker || typeof globalThis === 'undefined') {
        const error: MessageError = {
          code: 'NO_WORKER_CONTEXT',
          message: 'Not in worker context',
        };
        return err(error);
      }
      try {
        (globalThis as any).postMessage(message);
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
      messageHandlers.push(handler);

      const wrappedHandler = (event: MessageEvent) => {
        handler(event.data);
      };

      globalThis.addEventListener('message', wrappedHandler);

      return () => {
        const index = messageHandlers.indexOf(handler);
        if (index !== -1) {
          messageHandlers.splice(index, 1);
        }
        globalThis.removeEventListener('message', wrappedHandler);
      };
    },
    close() {
      process.exit(0);
    },
  };

  return {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    http,
    crypto,
    fs,
    streams,
    self: workerSelf,
  };
}
