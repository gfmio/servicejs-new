import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface CacheCapability {
  open(cacheName: string): Promise<Result<Cache, CacheError>>;
  has(cacheName: string): Promise<Result<boolean, CacheError>>;
  delete(cacheName: string): Promise<Result<boolean, CacheError>>;
  keys(): Promise<Result<readonly string[], CacheError>>;
  match(request: RequestInfo): Promise<Result<Response | undefined, CacheError>>;
}

export interface CacheError {
  readonly code: 'CACHE_ERROR';
  readonly message: string;
}

export interface ServiceWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly cache: CacheCapability;
  readonly clients: Clients;
}

export interface ServiceWorkerBootstrapOptions {
  config?: Record<string, string>;
  captureUncaughtErrors?: boolean;
  captureUnhandledRejections?: boolean;
}
