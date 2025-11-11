/**
 * Bun Worker runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { FilesystemCapability } from '@servicejs/capability-fs';
import type { StreamsCapability } from '@servicejs/capability-streams';
import type { Result } from '@servicejs/result';

export interface WorkerSelfCapability {
  postMessage(message: any): Result<void, MessageError>;
  onMessage(handler: (message: any) => void): () => void;
  close(): void;
}

export interface MessageError {
  readonly code: 'POST_FAILED' | 'NO_WORKER_CONTEXT';
  readonly message: string;
}

export interface BunWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly fs: FilesystemCapability;
  readonly streams: StreamsCapability;
  readonly self: WorkerSelfCapability;
}

export interface BunWorkerBootstrapOptions {
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
