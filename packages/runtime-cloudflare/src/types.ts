/**
 * Cloudflare Workers runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface KVNamespaceCapability {
  get(key: string): Promise<Result<string | null, KVError>>;
  getWithMetadata<M = unknown>(key: string): Promise<Result<{ value: string | null; metadata: M | null }, KVError>>;
  put(key: string, value: string, options?: KVPutOptions): Promise<Result<void, KVError>>;
  delete(key: string): Promise<Result<void, KVError>>;
  list(options?: KVListOptions): Promise<Result<KVListResult, KVError>>;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: unknown;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: readonly { name: string; expiration?: number; metadata?: unknown }[];
  listComplete: boolean;
  cursor?: string;
}

export interface KVError {
  readonly code: 'OPERATION_FAILED' | 'NOT_FOUND';
  readonly message: string;
}

export interface CloudflareRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly kv?: KVNamespaceCapability;
}

export interface CloudflareBootstrapOptions {
  /**
   * Cloudflare Workers environment bindings
   */
  bindings?: Record<string, unknown>;

  /**
   * KV namespace binding (if available)
   */
  kvNamespace?: any; // KVNamespace type from @cloudflare/workers-types

  /**
   * Capture unhandled errors
   * @default true
   */
  captureUncaughtErrors?: boolean;

  /**
   * Capture unhandled promise rejections
   * @default true
   */
  captureUnhandledRejections?: boolean;
}
