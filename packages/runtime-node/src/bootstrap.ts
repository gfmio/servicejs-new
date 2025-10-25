/**
 * Node.js runtime bootstrap
 *
 * Wraps Node.js globals and provides them as explicit capabilities.
 */

import { some, none } from '@servicejs/option';
import { ok, err } from '@servicejs/result';
import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability, ShutdownHandler, ShutdownSignal } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability } from '@servicejs/capability-fs';
import type { HTTPCapability, HTTPResponse } from '@servicejs/capability-http';
import type { StreamsCapability, StdinCapability, StdoutCapability, StderrCapability } from '@servicejs/capability-streams';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { NodeRuntimeCapabilities, NodeBootstrapOptions, NodeProcessCapability, WorkerThreadCapability, WorkerError } from './types.js';
import { promises as fsPromises } from 'node:fs';
import * as crypto from 'node:crypto';
import * as readline from 'node:readline';
import { isMainThread, parentPort, threadId } from 'node:worker_threads';

export function bootstrap(options: NodeBootstrapOptions = {}): NodeRuntimeCapabilities {
  const {
    captureShutdownSignals = true,
    signals = { SIGTERM: true, SIGINT: true, SIGUSR2: true },
    captureUncaughtErrors = true,
    captureUnhandledRejections = true,
  } = options;

  // Shutdown handlers
  const shutdownHandlers: ShutdownHandler[] = [];
  let shuttingDown = false;

  // Environment capability
  const env: EnvironmentCapability = {
    get(key: string) {
      const value = process.env[key];
      return value !== undefined ? some(value) : none();
    },

    getAll() {
      return Object.freeze({ ...process.env }) as Readonly<Record<string, string>>;
    },

    platform: 'node',
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
        if (index !== -1) {
          shutdownHandlers.splice(index, 1);
        }
      };

      return ok(unregister);
    },

    async shutdown(reason = 'manual shutdown') {
      if (shuttingDown) {
        return err({
          code: 'ALREADY_SHUTDOWN',
          message: 'Already shutting down',
        });
      }

      shuttingDown = true;

      const signal: ShutdownSignal = {
        reason,
        timestamp: Date.now(),
      };

      // Call handlers in reverse order
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

      // Exit process
      process.exit(0);
    },

    isShuttingDown() {
      return shuttingDown;
    },
  };

  // Console capability
  const console: ConsoleCapability = {
    log(message: string, ...args: unknown[]) {
      globalThis.console.log(message, ...args);
      return ok(undefined);
    },

    info(message: string, ...args: unknown[]) {
      globalThis.console.info(message, ...args);
      return ok(undefined);
    },

    warn(message: string, ...args: unknown[]) {
      globalThis.console.warn(message, ...args);
      return ok(undefined);
    },

    error(message: string, ...args: unknown[]) {
      globalThis.console.error(message, ...args);
      return ok(undefined);
    },

    debug(message: string, ...args: unknown[]) {
      globalThis.console.debug(message, ...args);
      return ok(undefined);
    },
  };

  // Filesystem capability
  const filesystem: FilesystemCapability = {
    async readFile(path, options = {}) {
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

    async writeFile(path, data, options = {}) {
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

    async exists(path) {
      try {
        await fsPromises.access(path);
        return ok(true);
      } catch {
        return ok(false);
      }
    },

    async stat(path) {
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

    async readdir(path) {
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

    async mkdir(path, options = {}) {
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

    async remove(path, options = {}) {
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

  // HTTP capability
  const http: HTTPCapability = {
    async request(url, options = {}) {
      try {
        const fetchOptions: RequestInit = {
          method: options.method || 'GET',
          ...(options.headers && { headers: options.headers }),
          ...(options.body && { body: options.body }),
          ...(options.redirect && { redirect: options.redirect }),
          ...(options.credentials && { credentials: options.credentials }),
          ...(options.signal && { signal: options.signal }),
        };

        const response = await fetch(url, fetchOptions);

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
                code: 'INVALID_RESPONSE',
                message: `Failed to read response as text: ${error.message}`,
                url,
              });
            }
          },

          async json<T = unknown>() {
            try {
              const data = await response.json();
              return ok(data as T);
            } catch (error: any) {
              return err({
                code: 'INVALID_RESPONSE',
                message: `Failed to parse JSON: ${error.message}`,
                url,
              });
            }
          },

          async arrayBuffer() {
            try {
              const buffer = await response.arrayBuffer();
              return ok(buffer);
            } catch (error: any) {
              return err({
                code: 'INVALID_RESPONSE',
                message: `Failed to read response as array buffer: ${error.message}`,
                url,
              });
            }
          },

          async blob() {
            try {
              const blob = await response.blob();
              return ok(blob);
            } catch (error: any) {
              return err({
                code: 'INVALID_RESPONSE',
                message: `Failed to read response as blob: ${error.message}`,
                url,
              });
            }
          },
        };

        return ok(httpResponse);
      } catch (error: any) {
        return err({
          code: error.name === 'AbortError' ? 'ABORTED' :
                error.name === 'TypeError' ? 'INVALID_URL' : 'NETWORK_ERROR',
          message: error.message,
          url,
        });
      }
    },

    async get(url, options) {
      return this.request(url, { ...options, method: 'GET' });
    },

    async post(url, options) {
      return this.request(url, { ...options, method: 'POST' });
    },

    async put(url, options) {
      return this.request(url, { ...options, method: 'PUT' });
    },

    async patch(url, options) {
      return this.request(url, { ...options, method: 'PATCH' });
    },

    async delete(url, options) {
      return this.request(url, { ...options, method: 'DELETE' });
    },

    async head(url, options) {
      return this.request(url, { ...options, method: 'HEAD' });
    },
  };

  // Streams capability
  const stdin: StdinCapability = {
    async readLine() {
      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false,
        });

        rl.once('line', (line) => {
          rl.close();
          resolve(ok(line));
        });

        rl.once('close', () => {
          resolve(err({
            code: 'READ_ERROR',
            message: 'stdin closed',
          }));
        });
      });
    },

    async readAll() {
      return new Promise((resolve) => {
        const chunks: string[] = [];

        process.stdin.on('data', (chunk) => {
          chunks.push(chunk.toString());
        });

        process.stdin.on('end', () => {
          resolve(ok(chunks.join('')));
        });

        process.stdin.on('error', (error) => {
          resolve(err({
            code: 'READ_ERROR',
            message: error.message,
          }));
        });
      });
    },

    isTTY() {
      return process.stdin.isTTY || false;
    },
  };

  const stdout: StdoutCapability = {
    async write(data) {
      return new Promise((resolve) => {
        process.stdout.write(data, (error) => {
          if (error) {
            resolve(err({
              code: 'WRITE_ERROR',
              message: error.message,
            }));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async writeLine(data) {
      return this.write(data + '\n');
    },

    isTTY() {
      return process.stdout.isTTY || false;
    },
  };

  const stderr: StderrCapability = {
    async write(data) {
      return new Promise((resolve) => {
        process.stderr.write(data, (error) => {
          if (error) {
            resolve(err({
              code: 'WRITE_ERROR',
              message: error.message,
            }));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async writeLine(data) {
      return this.write(data + '\n');
    },

    isTTY() {
      return process.stderr.isTTY || false;
    },
  };

  const streams: StreamsCapability = {
    stdin,
    stdout,
    stderr,
  };

  // Crypto capability
  const cryptoCapability: CryptoCapability = {
    randomBytes(length) {
      if (length < 0 || length > 65536) {
        return err({
          code: 'INVALID_LENGTH',
          message: `Invalid length: ${length}`,
        });
      }

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

    randomInt(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        return err({
          code: 'INVALID_DATA',
          message: 'min and max must be integers',
        });
      }

      if (min >= max) {
        return err({
          code: 'INVALID_DATA',
          message: `min must be less than max`,
        });
      }

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

    async hash(algorithm, data, encoding = 'hex') {
      try {
        const hash = crypto.createHash(algorithm);

        if (typeof data === 'string') {
          hash.update(data);
        } else {
          hash.update(data);
        }

        if (encoding === 'hex') {
          return ok(hash.digest('hex'));
        } else if (encoding === 'base64') {
          return ok(hash.digest('base64'));
        } else {
          return ok(new Uint8Array(hash.digest()));
        }
      } catch (error: any) {
        return err({
          code: 'INVALID_ALGORITHM',
          message: error.message,
        });
      }
    },

    async hmac(algorithm, key, data, encoding = 'hex') {
      try {
        const keyBuffer = typeof key === 'string' ? Buffer.from(key) : Buffer.from(key);
        const hmac = crypto.createHmac(algorithm, keyBuffer);

        if (typeof data === 'string') {
          hmac.update(data);
        } else {
          hmac.update(data);
        }

        if (encoding === 'hex') {
          return ok(hmac.digest('hex'));
        } else if (encoding === 'base64') {
          return ok(hmac.digest('base64'));
        } else {
          return ok(new Uint8Array(hmac.digest()));
        }
      } catch (error: any) {
        return err({
          code: 'INVALID_ALGORITHM',
          message: error.message,
        });
      }
    },

    timingSafeEqual(a, b) {
      try {
        const aBuffer = typeof a === 'string' ? Buffer.from(a) : Buffer.from(a);
        const bBuffer = typeof b === 'string' ? Buffer.from(b) : Buffer.from(b);

        if (aBuffer.length !== bBuffer.length) {
          return ok(false);
        }

        return ok(crypto.timingSafeEqual(aBuffer, bBuffer));
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED',
          message: error.message,
        });
      }
    },
  };

  // Process capability
  const processCapability: NodeProcessCapability = {
    pid: process.pid,
    ppid: process.ppid,
    argv: [...process.argv.slice(2)], // Remove node and script path
    cwd: process.cwd(),
    platform: process.platform,
    arch: process.arch,

    exit(code: number): never {
      process.exit(code);
    },

    chdir(directory: string) {
      try {
        process.chdir(directory);
        return ok(undefined);
      } catch (error: any) {
        return err({
          code: error.code === 'ENOENT' ? 'INVALID_DIRECTORY' : 'PERMISSION_DENIED',
          message: error.message,
        });
      }
    },
  };

  // Set up signal handlers
  if (captureShutdownSignals) {
    for (const [sig, enabled] of Object.entries(signals)) {
      if (enabled) {
        process.on(sig as NodeJS.Signals, async () => {
          await lifecycle.shutdown(`Received signal: ${sig}`);
        });
      }
    }
  }

  // Set up error handlers
  if (captureUncaughtErrors) {
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await lifecycle.shutdown('Uncaught exception');
    });
  }

  if (captureUnhandledRejections) {
    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await lifecycle.shutdown('Unhandled rejection');
    });
  }

  // Worker thread capability (only available in worker threads)
  let worker: WorkerThreadCapability | undefined;
  if (!isMainThread && parentPort) {
    const messageHandlers: Array<(message: any) => void> = [];

    worker = {
      postMessage(message, transferList) {
        try {
          if (transferList) {
            parentPort!.postMessage(message, transferList);
          } else {
            parentPort!.postMessage(message);
          }
          return ok(undefined);
        } catch (error: any) {
          const workerError: WorkerError = {
            code: 'POST_FAILED',
            message: error.message,
          };
          return err(workerError);
        }
      },
      onMessage(handler) {
        messageHandlers.push(handler);

        const wrappedHandler = (message: any) => {
          handler(message);
        };

        parentPort!.on('message', wrappedHandler);

        return () => {
          const index = messageHandlers.indexOf(handler);
          if (index !== -1) {
            messageHandlers.splice(index, 1);
          }
          parentPort!.off('message', wrappedHandler);
        };
      },
      terminate() {
        process.exit(0);
      },
      get threadId() {
        return threadId;
      },
      get isMainThread() {
        return isMainThread;
      },
    };
  }

  const capabilities: NodeRuntimeCapabilities = {
    env,
    time,
    lifecycle,
    console,
    fs: filesystem,
    http,
    streams,
    crypto: cryptoCapability,
    process: processCapability,
  };

  if (worker) {
    (capabilities as any).worker = worker;
  }

  return capabilities;
}
