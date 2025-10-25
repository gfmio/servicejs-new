/**
 * Browser runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface WindowCapability {
  readonly location: {
    readonly href: string;
    readonly protocol: string;
    readonly host: string;
    readonly hostname: string;
    readonly port: string;
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
  };
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly devicePixelRatio: number;
  reload(): void;
  navigate(url: string): void;
}

export interface StorageCapability {
  get(key: string): Result<string | null, StorageError>;
  set(key: string, value: string): Result<void, StorageError>;
  remove(key: string): Result<void, StorageError>;
  clear(): Result<void, StorageError>;
  keys(): Result<readonly string[], StorageError>;
}

export interface StorageError {
  readonly code: 'QUOTA_EXCEEDED' | 'STORAGE_DISABLED' | 'OPERATION_FAILED';
  readonly message: string;
}

export interface BrowserRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly window: WindowCapability;
  readonly localStorage: StorageCapability;
  readonly sessionStorage: StorageCapability;
}

export interface BrowserBootstrapOptions {
  captureBeforeUnload?: boolean;
  captureUnhandledErrors?: boolean;
  captureUnhandledRejections?: boolean;
}
