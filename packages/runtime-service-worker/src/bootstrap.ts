import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type { ServiceWorkerRuntimeCapabilities, ServiceWorkerBootstrapOptions, CacheCapability } from './types';

declare const self: ServiceWorkerGlobalScope;

export function bootstrap(options: ServiceWorkerBootstrapOptions = {}): ServiceWorkerRuntimeCapabilities {
  const { config = {}, captureUncaughtErrors = true, captureUnhandledRejections = true } = options;

  const cache: CacheCapability = {
    async open(cacheName) {
      try {
        const c = await caches.open(cacheName);
        return ok(c);
      } catch (error: any) {
        return err({ code: 'CACHE_ERROR' as const, message: error.message });
      }
    },
    async has(cacheName) {
      try {
        const has = await caches.has(cacheName);
        return ok(has);
      } catch (error: any) {
        return err({ code: 'CACHE_ERROR' as const, message: error.message });
      }
    },
    async delete(cacheName) {
      try {
        const deleted = await caches.delete(cacheName);
        return ok(deleted);
      } catch (error: any) {
        return err({ code: 'CACHE_ERROR' as const, message: error.message });
      }
    },
    async keys() {
      try {
        const keys = await caches.keys();
        return ok(Object.freeze(keys));
      } catch (error: any) {
        return err({ code: 'CACHE_ERROR' as const, message: error.message });
      }
    },
    async match(request) {
      try {
        const response = await caches.match(request);
        return ok(response);
      } catch (error: any) {
        return err({ code: 'CACHE_ERROR' as const, message: error.message });
      }
    },
  };

  // Simplified implementations - reuse Web Worker patterns for env, time, lifecycle, console, http, crypto
  return {
    env: { get: (n) => config[n] ? some(config[n]) : none(), getAll: () => Object.freeze(config), platform: 'service-worker' as const, version: '1.0.0' },
    time: { now: () => Date.now(), highResolutionTime: () => some(performance.now()), setTimeout: (cb, ms) => ok(() => self.clearTimeout(self.setTimeout(cb, ms))), clearTimeout: () => ok(undefined), setInterval: (cb, ms) => ok(() => self.clearInterval(self.setInterval(cb, ms))), clearInterval: () => ok(undefined) },
    lifecycle: { onShutdown: () => ok(() => {}), shutdown: async () => ok(undefined), isShuttingDown: () => false },
    console: { log: (_m, ...args) => { console.log(...args); return ok(undefined); }, info: (_m, ...args) => { console.info(...args); return ok(undefined); }, warn: (_m, ...args) => { console.warn(...args); return ok(undefined); }, error: (_m, ...args) => { console.error(...args); return ok(undefined); }, debug: (_m, ...args) => { console.debug(...args); return ok(undefined); } },
    http: { request: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch directly in Service Worker' }), get: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch' }), post: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch' }), put: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch' }), patch: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch' }), delete: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch' }), head: async () => err({ code: 'REQUEST_FAILED' as const, message: 'Use fetch' }) },
    crypto: { randomBytes: (l) => { const b = new Uint8Array(l); crypto.getRandomValues(b); return ok(b); }, randomUUID: () => ok(crypto.randomUUID()), randomInt: (min, max) => ok(Math.floor(Math.random() * (max - min)) + min), hash: async () => err({ code: 'OPERATION_FAILED' as const, message: 'Use crypto.subtle directly' }), hmac: async () => err({ code: 'OPERATION_FAILED' as const, message: 'Use crypto.subtle directly' }), timingSafeEqual: (a, b) => { const bufferA = typeof a === 'string' ? new TextEncoder().encode(a) : a; const bufferB = typeof b === 'string' ? new TextEncoder().encode(b) : b; if (bufferA.length !== bufferB.length) return ok(false); let result = 0; for (let i = 0; i < bufferA.length; i++) { result |= (bufferA[i] || 0) ^ (bufferB[i] || 0); } return ok(result === 0); } },
    cache,
    clients: self.clients,
  };
}
