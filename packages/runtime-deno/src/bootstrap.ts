/**
 * Deno runtime bootstrap
 */

import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type {
  DenoRuntimeCapabilities,
  DenoBootstrapOptions,
  DenoProcessCapability,
  DenoWorkerCapability,
  WorkerError,
} from './types';
import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability, ShutdownHandler } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type {
  FilesystemCapability,
  ReadFileOptions,
  WriteFileOptions,
  FileStat,
  DirectoryEntry,
  FSErrorCode,
} from '@servicejs/capability-fs';
import type { HTTPCapability, HTTPResponse, HTTPError } from '@servicejs/capability-http';
import type { CryptoCapability, HashAlgorithm, HMACAlgorithm } from '@servicejs/capability-crypto';

// Declare Deno global
declare const Deno: any;

/**
 * Bootstrap the Deno runtime with all capabilities
 */
export function bootstrap(
  options: DenoBootstrapOptions = {}
): DenoRuntimeCapabilities {
  const {
    captureShutdownSignals = true,
    signals = ['SIGINT', 'SIGTERM'],
    captureUncaughtErrors = true,
    captureUnhandledRejections = true,
  } = options;

  // Environment capability
  const env: EnvironmentCapability = {
    get(name) {
      const value = Deno.env.get(name);
      return value !== undefined ? some(value) : none();
    },
    getAll() {
      const envVars = Deno.env.toObject();
      return Object.freeze({ ...envVars });
    },
    platform: 'deno' as const,
    version: Deno.version.deno,
  };

  // Time capability
  let nextTimerId = 1;
  const timeouts = new Map<number, number>();
  const intervals = new Map<number, number>();

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
      }, ms) as unknown as number;
      timeouts.set(id, timerId);
      const cancelFn = () => {
        globalThis.clearTimeout(timerId as any);
        timeouts.delete(id);
      };
      return ok(cancelFn);
    },
    clearTimeout(id) {
      const timerId = timeouts.get(id as number);
      if (timerId !== undefined) {
        globalThis.clearTimeout(timerId as any);
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
      const timerId = globalThis.setInterval(callback, ms) as unknown as number;
      intervals.set(id, timerId);
      const cancelFn = () => {
        globalThis.clearInterval(timerId as any);
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
  const shutdownHandlers: ShutdownHandler[] = [];
  let isShuttingDown = false;

  const lifecycle: LifecycleCapability = {
    onShutdown(handler) {
      shutdownHandlers.push(handler);
      const unregister = () => {
        const index = shutdownHandlers.indexOf(handler);
        if (index !== -1) {
          shutdownHandlers.splice(index, 1);
        }
      };
      return ok(unregister);
    },
    async shutdown(reason = 'shutdown') {
      if (isShuttingDown) {
        return err({
          code: 'ALREADY_SHUTDOWN' as const,
          message: 'Shutdown already in progress',
        });
      }
      isShuttingDown = true;

      const signal = {
        reason,
        timestamp: Date.now(),
      };

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
      return isShuttingDown;
    },
  };

  if (captureShutdownSignals) {
    for (const signal of signals) {
      Deno.addSignalListener(signal, () => {
        lifecycle.shutdown().then(() => {
          Deno.exit(0);
        });
      });
    }
  }

  if (captureUncaughtErrors) {
    globalThis.addEventListener('error', (event: any) => {
      console.error('Uncaught error:', event.error);
    });
  }

  if (captureUnhandledRejections) {
    globalThis.addEventListener('unhandledrejection', (event: any) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  // Console capability
  const consoleCapability: ConsoleCapability = {
    log(_message, ...args) {
      console.log(...args);
      return ok(undefined);
      return ok(undefined);
    },
    info(_message, ...args) {
      console.info(...args);
      return ok(undefined);
      return ok(undefined);
    },
    warn(_message, ...args) {
      console.warn(...args);
      return ok(undefined);
      return ok(undefined);
    },
    error(_message, ...args) {
      console.error(...args);
      return ok(undefined);
      return ok(undefined);
    },
    debug(_message, ...args) {
      console.debug(...args);
      return ok(undefined);
      return ok(undefined);
    },
  };

  // Filesystem capability
  const filesystem: FilesystemCapability = {
    async readFile(path, options: ReadFileOptions = {}) {
      try {
        const encoding = options.encoding || 'utf8';
        if (encoding === 'binary') {
          const data = await Deno.readFile(path);
          return ok(new Uint8Array(data));
        } else {
          const data = await Deno.readTextFile(path);
          return ok(data);
        }
      } catch (error: any) {
        return err({
          code: error.name === 'NotFound' ? 'NOT_FOUND' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                'READ_ERROR' as const,
          message: error.message,
          path,
        });
      }
    },
    async writeFile(path, data, options: WriteFileOptions = {}) {
      try {
        const encoding = options.encoding || 'utf8';
        const createDirs = options.createDirs || false;

        if (createDirs) {
          const dir = path.substring(0, path.lastIndexOf('/'));
          if (dir) {
            await Deno.mkdir(dir, { recursive: true });
          }
        }

        if (encoding === 'binary') {
          await Deno.writeFile(path, data as Uint8Array);
        } else {
          await Deno.writeTextFile(path, data as string);
        }
        return ok(undefined);
      } catch (error: any) {
        return err({
          code: error.name === 'NotFound' ? 'NOT_FOUND' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                'WRITE_ERROR' as const,
          message: error.message,
          path,
        });
      }
    },
    async exists(path) {
      try {
        await Deno.stat(path);
        return ok(true);
      } catch (error: any) {
        if (error.name === 'NotFound') {
          return ok(false);
        }
        return err({
          code: 'UNKNOWN' as FSErrorCode,
          message: error.message,
          path,
        });
      }
    },
    async stat(path) {
      try {
        const info = await Deno.stat(path);
        const stat: FileStat = {
          size: info.size,
          isFile: info.isFile,
          isDirectory: info.isDirectory,
          isSymlink: info.isSymlink,
          createdAt: info.birthtime?.getTime() || Date.now(),
          modifiedAt: info.mtime?.getTime() || Date.now(),
          accessedAt: info.atime?.getTime() || Date.now(),
        };
        return ok(stat);
      } catch (error: any) {
        const code: FSErrorCode = error.name === 'NotFound' ? 'NOT_FOUND' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                'UNKNOWN';
        return err({
          code,
          message: error.message,
          path,
        });
      }
    },
    async readdir(path) {
      try {
        const entries: DirectoryEntry[] = [];
        for await (const entry of Deno.readDir(path)) {
          entries.push({
            name: entry.name,
            isFile: entry.isFile,
            isDirectory: entry.isDirectory,
            isSymlink: entry.isSymlink,
          });
        }
        return ok(Object.freeze(entries));
      } catch (error: any) {
        return err({
          code: error.name === 'NotFound' ? 'NOT_FOUND' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                error.name === 'NotDirectory' ? 'NOT_A_DIRECTORY' :
                'READ_ERROR' as const,
          message: error.message,
          path,
        });
      }
    },
    async mkdir(path, options = {}) {
      try {
        const recursive = options.recursive || false;
        await Deno.mkdir(path, { recursive });
        return ok(undefined);
      } catch (error: any) {
        return err({
          code: error.name === 'AlreadyExists' ? 'ALREADY_EXISTS' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                'WRITE_ERROR' as const,
          message: error.message,
          path,
        });
      }
    },
    async remove(path, options = {}) {
      try {
        const recursive = options.recursive || false;
        await Deno.remove(path, { recursive });
        return ok(undefined as void);
      } catch (error: any) {
        const code: FSErrorCode = error.name === 'NotFound' ? 'NOT_FOUND' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                'UNKNOWN';
        return err({
          code,
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
        const fetchOptions: any = {
          method: options.method || 'GET',
        };
        if (options.headers) {
          fetchOptions.headers = options.headers;
        }
        if (options.body) {
          fetchOptions.body = options.body;
        }

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
                code: 'BODY_READ_ERROR' as const,
                message: error.message,
              });
            }
          },
          async json() {
            try {
              const json = await response.json();
              return ok(json);
            } catch (error: any) {
              return err({
                code: 'BODY_READ_ERROR' as const,
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
                code: 'BODY_READ_ERROR' as const,
                message: error.message,
              });
            }
          },
          async blob() {
            try {
              const blob = await response.blob();
              return ok(blob);
            } catch (error: any) {
              return err({
                code: 'BODY_READ_ERROR' as const,
                message: error.message,
              });
            }
          },
        };

        return ok(httpResponse);
      } catch (error: any) {
        const httpError: HTTPError = {
          code: error.name === 'TypeError' ? 'NETWORK_ERROR' :
                error.name === 'AbortError' ? 'REQUEST_ABORTED' :
                'REQUEST_FAILED' as const,
          message: error.message,
        };
        return err(httpError);
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

  // Crypto capability
  const cryptoCapability: CryptoCapability = {
    randomBytes(length) {
      try {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
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
        const uuid = crypto.randomUUID();
        return ok(uuid);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    randomInt(min, max) {
      try {
        const range = max - min;
        const randomBytes = new Uint32Array(1);
        crypto.getRandomValues(randomBytes);
        const firstByte = randomBytes[0];
        if (firstByte === undefined) {
          return err({
            code: 'OPERATION_FAILED' as const,
            message: 'Failed to generate random bytes',
          });
        }
        const randomValue = firstByte / (0xffffffff + 1);
        return ok(Math.floor(randomValue * range) + min);
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    async hash(algorithm, data, encoding = 'hex') {
      try {
        const algoMap: Record<HashAlgorithm, string> = {
          'sha1': 'SHA-1',
          'sha256': 'SHA-256',
          'sha384': 'SHA-384',
          'sha512': 'SHA-512',
          'md5': 'MD5',
        };

        if (algorithm === 'md5') {
          return err({
            code: 'INVALID_ALGORITHM' as const,
            message: 'MD5 is not supported in Web Crypto API (Deno)',
          });
        }

        const encoder = new TextEncoder();
        const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
        const hashBuffer = await crypto.subtle.digest(algoMap[algorithm], dataBuffer as BufferSource);
        const hashArray = new Uint8Array(hashBuffer);

        if (encoding === 'hex') {
          const hashHex = Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          return ok(hashHex);
        } else {
          return ok(hashArray);
        }
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    async hmac(algorithm, key, data, encoding = 'hex') {
      try {
        const algoMap: Record<HMACAlgorithm, string> = {
          'sha1': 'SHA-1',
          'sha256': 'SHA-256',
          'sha384': 'SHA-384',
          'sha512': 'SHA-512',
        };

        const encoder = new TextEncoder();
        const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
        const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;

        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          keyBuffer as BufferSource,
          { name: 'HMAC', hash: algoMap[algorithm] },
          false,
          ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer as BufferSource);
        const signatureArray = new Uint8Array(signatureBuffer);

        if (encoding === 'hex') {
          const signatureHex = Array.from(signatureArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          return ok(signatureHex);
        } else {
          return ok(signatureArray);
        }
      } catch (error: any) {
        return err({
          code: 'OPERATION_FAILED' as const,
          message: error.message,
        });
      }
    },
    timingSafeEqual(a, b) {
      const bufferA = typeof a === 'string' ? new TextEncoder().encode(a) : a;
      const bufferB = typeof b === 'string' ? new TextEncoder().encode(b) : b;

      if (bufferA.length !== bufferB.length) {
        return ok(false);
      }

      let result = 0;
      for (let i = 0; i < bufferA.length; i++) {
        result |= (bufferA[i] || 0) ^ (bufferB[i] || 0);
      }

      return ok(result === 0);
    },
  };

  // Process capability
  const processCapability: DenoProcessCapability = {
    get pid() {
      return Deno.pid;
    },
    get ppid() {
      return Deno.ppid;
    },
    get argv() {
      return Object.freeze([...Deno.args]);
    },
    get cwd() {
      return Deno.cwd();
    },
    get platform() {
      return Deno.build.os;
    },
    get arch() {
      return Deno.build.arch;
    },
    exit(code): never {
      Deno.exit(code);
      throw new Error('unreachable'); // TypeScript needs this for 'never' return type
    },
    chdir(directory) {
      try {
        Deno.chdir(directory);
        return ok(undefined);
      } catch (error: any) {
        return err({
          code: error.name === 'NotFound' ? 'INVALID_DIRECTORY' :
                error.name === 'PermissionDenied' ? 'PERMISSION_DENIED' :
                'INVALID_DIRECTORY' as const,
          message: error.message,
        });
      }
    },
  };

  // Worker capability (only in worker context)
  let worker: DenoWorkerCapability | undefined;
  // @ts-ignore - Deno.Worker is not in all contexts
  if (typeof self !== 'undefined' && 'postMessage' in self && typeof Deno !== 'undefined') {
    const messageHandlers: Array<(event: MessageEvent) => void> = [];

    worker = {
      postMessage(message, transfer) {
        try {
          if (transfer) {
            self.postMessage(message, transfer as any);
          } else {
            self.postMessage(message);
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

        const wrappedHandler = (event: MessageEvent) => {
          handler(event);
        };

        self.addEventListener('message', wrappedHandler);

        return () => {
          const index = messageHandlers.indexOf(handler);
          if (index !== -1) {
            messageHandlers.splice(index, 1);
          }
          self.removeEventListener('message', wrappedHandler);
        };
      },
      terminate() {
        self.close();
      },
    };
  }

  const capabilities: DenoRuntimeCapabilities = {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    fs: filesystem,
    http,
    crypto: cryptoCapability,
    process: processCapability,
  };

  if (worker) {
    (capabilities as any).worker = worker;
  }

  return capabilities;
}
