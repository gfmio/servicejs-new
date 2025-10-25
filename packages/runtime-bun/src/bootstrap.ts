/**
 * Bun runtime bootstrap - uses Bun's optimized APIs where available
 */

import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type { BunRuntimeCapabilities, BunBootstrapOptions, BunProcessCapability, ProcessError } from './types';
import type { EnvironmentCapability, Platform } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability, ShutdownHandler } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability, FSError, FileStat, DirectoryEntry } from '@servicejs/capability-fs';
import type { HTTPCapability, HTTPResponse, HTTPError } from '@servicejs/capability-http';
import type { StreamsCapability, StdinCapability, StdoutCapability, StderrCapability } from '@servicejs/capability-streams';
import type { CryptoCapability, HashAlgorithm, HMACAlgorithm } from '@servicejs/capability-crypto';
import * as readline from 'readline';

/**
 * Bootstrap the Bun runtime with all capabilities
 */
export function bootstrap(
  options: BunBootstrapOptions = {}
): BunRuntimeCapabilities {
  const {
    captureShutdownSignals = true,
    signals = ['SIGTERM', 'SIGINT'],
    captureUncaughtErrors = true,
    captureUnhandledRejections = true,
  } = options;

  // Environment capability
  const env: EnvironmentCapability = {
    get(name) {
      const value = process.env[name];
      return value !== undefined ? some(value) : none();
    },
    getAll() {
      const envVars = { ...process.env };
      return Object.freeze(envVars as Record<string, string>);
    },
    platform: 'bun' as Platform,
    version: Bun.version,
  };

  // Time capability
  let nextTimerId = 1;
  const timeouts = new Map<number, NodeJS.Timeout>();
  const intervals = new Map<number, NodeJS.Timeout>();

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

  // Setup signal handlers
  if (captureShutdownSignals) {
    for (const signal of signals) {
      process.on(signal, async () => {
        await lifecycle.shutdown(signal);
        process.exit(0);
      });
    }
  }

  if (captureUncaughtErrors) {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });
  }

  if (captureUnhandledRejections) {
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
    });
  }

  // Console capability
  const consoleCapability: ConsoleCapability = {
    log(_message, ...args) {
      console.log(...args);
      return ok(undefined);
    },
    info(_message, ...args) {
      console.info(...args);
      return ok(undefined);
    },
    warn(_message, ...args) {
      console.warn(...args);
      return ok(undefined);
    },
    error(_message, ...args) {
      console.error(...args);
      return ok(undefined);
    },
    debug(_message, ...args) {
      console.debug(...args);
      return ok(undefined);
    },
  };

  // Filesystem capability (using Bun.file API where beneficial)
  const filesystem: FilesystemCapability = {
    async readFile(path, options) {
      try {
        const file = Bun.file(path);
        if (options?.encoding === 'utf8' || options?.encoding === 'utf-8') {
          const text = await file.text();
          return ok(text);
        } else {
          const buffer = await file.arrayBuffer();
          return ok(new Uint8Array(buffer));
        }
      } catch (error: any) {
        const code: FSError['code'] =
          error.code === 'ENOENT' ? 'NOT_FOUND' :
          error.code === 'EACCES' ? 'PERMISSION_DENIED' :
          'UNKNOWN';
        return err({
          code,
          message: error.message,
        });
      }
    },
    async writeFile(path, data) {
      try {
        await Bun.write(path, data);
        return ok(undefined);
      } catch (error: any) {
        const code: FSError['code'] =
          error.code === 'EACCES' ? 'PERMISSION_DENIED' :
          'UNKNOWN';
        return err({
          code,
          message: error.message,
        });
      }
    },
    async exists(path) {
      try {
        const file = Bun.file(path);
        const exists = await file.exists();
        return ok(exists);
      } catch {
        return ok(false);
      }
    },
    async mkdir(path, options) {
      try {
        const fs = await import('fs/promises');
        await fs.mkdir(path, options);
        return ok(undefined);
      } catch (error: any) {
        const code: FSError['code'] =
          error.code === 'EEXIST' ? 'ALREADY_EXISTS' :
          error.code === 'EACCES' ? 'PERMISSION_DENIED' :
          'UNKNOWN';
        return err({
          code,
          message: error.message,
        });
      }
    },
    async readdir(path) {
      try {
        const fs = await import('fs/promises');
        const entries = await fs.readdir(path, { withFileTypes: true });
        const dirEntries: DirectoryEntry[] = entries.map((entry) => ({
          name: entry.name,
          isFile: entry.isFile(),
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
        }));
        return ok(Object.freeze(dirEntries));
      } catch (error: any) {
        const code: FSError['code'] =
          error.code === 'ENOENT' ? 'NOT_FOUND' :
          error.code === 'EACCES' ? 'PERMISSION_DENIED' :
          'UNKNOWN';
        return err({
          code,
          message: error.message,
        });
      }
    },
    async stat(path) {
      try {
        const fs = await import('fs/promises');
        const stats = await fs.stat(path);
        const fileStat: FileStat = {
          size: stats.size,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory(),
          isSymlink: stats.isSymbolicLink(),
          createdAt: stats.birthtime?.getTime() || Date.now(),
          modifiedAt: stats.mtime?.getTime() || Date.now(),
          accessedAt: stats.atime?.getTime() || Date.now(),
        };
        return ok(fileStat);
      } catch (error: any) {
        const code: FSError['code'] =
          error.code === 'ENOENT' ? 'NOT_FOUND' :
          error.code === 'EACCES' ? 'PERMISSION_DENIED' :
          'UNKNOWN';
        return err({
          code,
          message: error.message,
        });
      }
    },
    async remove(path, options) {
      try {
        const fs = await import('fs/promises');
        await fs.rm(path, { recursive: options?.recursive, force: true });
        return ok(undefined);
      } catch (error: any) {
        const code: FSError['code'] =
          error.code === 'ENOENT' ? 'NOT_FOUND' :
          error.code === 'EACCES' ? 'PERMISSION_DENIED' :
          'UNKNOWN';
        return err({
          code,
          message: error.message,
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
          async json<T = unknown>() {
            try {
              const json = await response.json();
              return ok(json as T);
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
              return ok(blob as unknown as Blob);
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
        const code: HTTPError['code'] =
          error.name === 'TypeError' ? 'NETWORK_ERROR' :
          error.name === 'AbortError' ? 'REQUEST_ABORTED' :
          'REQUEST_FAILED';
        const httpError: HTTPError = {
          code,
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
            code: 'READ_ERROR' as const,
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
            code: 'READ_ERROR' as const,
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
              code: 'WRITE_ERROR' as const,
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
              code: 'WRITE_ERROR' as const,
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
        const randomValue = (randomBytes[0] || 0) / (0xffffffff + 1);
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
          // Use Bun's built-in crypto for MD5
          const hasher = new Bun.CryptoHasher('md5');
          hasher.update(typeof data === 'string' ? data : data);
          const hash = hasher.digest();

          if (encoding === 'hex') {
            return ok(hash.toString('hex'));
          } else {
            return ok(new Uint8Array(hash));
          }
        }

        // Use Web Crypto API for other algorithms
        const encoder = new TextEncoder();
        const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
        const hashBuffer = await crypto.subtle.digest(algoMap[algorithm], dataBuffer as any);
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
          keyBuffer as any,
          { name: 'HMAC', hash: algoMap[algorithm] },
          false,
          ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer as any);
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
  const processCapability: BunProcessCapability = {
    get pid() {
      return process.pid;
    },
    get argv() {
      return Object.freeze([...process.argv]);
    },
    get cwd() {
      return process.cwd();
    },
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get version() {
      return Bun.version;
    },
    exit(code): never {
      process.exit(code);
      throw new Error('unreachable');
    },
    chdir(directory) {
      try {
        process.chdir(directory);
        return ok(undefined);
      } catch (error: any) {
        const code: ProcessError['code'] =
          error.code === 'ENOENT' ? 'INVALID_DIRECTORY' : 'PERMISSION_DENIED';
        return err({
          code,
          message: error.message,
        });
      }
    },
  };

  return {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    fs: filesystem,
    http,
    streams,
    crypto: cryptoCapability,
    process: processCapability,
  };
}
