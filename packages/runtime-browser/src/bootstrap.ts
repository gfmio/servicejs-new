/**
 * Browser runtime bootstrap
 */

import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type {
  BrowserRuntimeCapabilities,
  BrowserBootstrapOptions,
  WindowCapability,
  StorageCapability,
  StorageError,
} from './types';
import type { EnvironmentCapability, Platform } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability, ShutdownHandler } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability, HTTPResponse, HTTPError } from '@servicejs/capability-http';
import type { CryptoCapability, HashAlgorithm, HMACAlgorithm } from '@servicejs/capability-crypto';

/**
 * Bootstrap the browser runtime with all capabilities
 */
export function bootstrap(
  options: BrowserBootstrapOptions = {}
): BrowserRuntimeCapabilities {
  const {
    captureBeforeUnload = true,
    captureUnhandledErrors = true,
    captureUnhandledRejections = true,
  } = options;

  // Environment capability (limited in browser)
  const env: EnvironmentCapability = {
    get(name) {
      // Browsers don't have environment variables
      // Could check for specific values like NODE_ENV in bundler config
      return none();
    },
    getAll() {
      return Object.freeze({});
    },
    platform: 'browser' as Platform,
    version: '1.0.0',
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
      const timerId = window.setTimeout(() => {
        timeouts.delete(id);
        callback();
      }, ms);
      timeouts.set(id, timerId);
      const cancelFn = () => {
        window.clearTimeout(timerId);
        timeouts.delete(id);
      };
      return ok(cancelFn);
    },
    clearTimeout(id) {
      const timerId = timeouts.get(id as number);
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
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
      const timerId = window.setInterval(callback, ms);
      intervals.set(id, timerId);
      const cancelFn = () => {
        window.clearInterval(timerId);
        intervals.delete(id);
      };
      return ok(cancelFn);
    },
    clearInterval(id) {
      const timerId = intervals.get(id as number);
      if (timerId !== undefined) {
        window.clearInterval(timerId);
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

  if (captureBeforeUnload) {
    window.addEventListener('beforeunload', (event) => {
      lifecycle.shutdown();
    });
  }

  if (captureUnhandledErrors) {
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
    });
  }

  if (captureUnhandledRejections) {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  // Console capability
  const consoleCapability: ConsoleCapability = {
    log(...args) {
      console.log(...args);
      return ok(undefined);
    },
    info(...args) {
      console.info(...args);
      return ok(undefined);
    },
    warn(...args) {
      console.warn(...args);
      return ok(undefined);
    },
    error(...args) {
      console.error(...args);
      return ok(undefined);
    },
    debug(...args) {
      console.debug(...args);
      return ok(undefined);
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
                'REQUEST_FAILED',
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
        window.crypto.getRandomValues(bytes);
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
        const uuid = window.crypto.randomUUID();
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
        window.crypto.getRandomValues(randomBytes);
        const randomValue = randomBytes[0] / (0xffffffff + 1);
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
          'md5': 'MD5', // Not supported in Web Crypto, would need polyfill
        };

        if (algorithm === 'md5') {
          return err({
            code: 'INVALID_ALGORITHM' as const,
            message: 'MD5 is not supported in Web Crypto API',
          });
        }

        const encoder = new TextEncoder();
        const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
        const hashBuffer = await window.crypto.subtle.digest(algoMap[algorithm], dataBuffer as BufferSource);
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

        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer as BufferSource,
          { name: 'HMAC', hash: algoMap[algorithm] },
          false,
          ['sign']
        );

        const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, dataBuffer as BufferSource);
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

  // Window capability
  const windowCapability: WindowCapability = {
    location: Object.freeze({
      href: window.location.href,
      protocol: window.location.protocol,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    }),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    reload() {
      window.location.reload();
    },
    navigate(url) {
      window.location.href = url;
    },
  };

  // Storage capability factory
  const createStorageCapability = (storage: Storage): StorageCapability => ({
    get(key) {
      try {
        const value = storage.getItem(key);
        return ok(value);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'OPERATION_FAILED',
          message: error.message,
        };
        return err(storageError);
      }
    },
    set(key, value) {
      try {
        storage.setItem(key, value);
        return ok(undefined);
      } catch (error: any) {
        const storageError: StorageError = {
          code: error.name === 'QuotaExceededError' ? 'QUOTA_EXCEEDED' : 'OPERATION_FAILED',
          message: error.message,
        };
        return err(storageError);
      }
    },
    remove(key) {
      try {
        storage.removeItem(key);
        return ok(undefined);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'OPERATION_FAILED',
          message: error.message,
        };
        return err(storageError);
      }
    },
    clear() {
      try {
        storage.clear();
        return ok(undefined);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'OPERATION_FAILED',
          message: error.message,
        };
        return err(storageError);
      }
    },
    keys() {
      try {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key !== null) {
            keys.push(key);
          }
        }
        return ok(Object.freeze(keys));
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'OPERATION_FAILED',
          message: error.message,
        };
        return err(storageError);
      }
    },
  });

  return {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    http,
    crypto: cryptoCapability,
    window: windowCapability,
    localStorage: createStorageCapability(window.localStorage),
    sessionStorage: createStorageCapability(window.sessionStorage),
  };
}
