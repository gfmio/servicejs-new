/**
 * Deno runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability } from '@servicejs/capability-fs';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface DenoProcessCapability {
  readonly pid: number;
  readonly ppid: number;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly platform: string;
  readonly arch: string;
  exit(code: number): never;
  chdir(directory: string): Result<void, ProcessError>;
}

export interface ProcessError {
  readonly code: 'INVALID_DIRECTORY' | 'PERMISSION_DENIED';
  readonly message: string;
}

export interface DenoWorkerCapability {
  postMessage(message: any, transfer?: Transferable[]): Result<void, WorkerError>;
  onMessage(handler: (event: MessageEvent) => void): () => void;
  terminate(): void;
}

export interface WorkerError {
  readonly code: 'POST_FAILED' | 'WORKER_ERROR';
  readonly message: string;
}

export interface DenoRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly fs: FilesystemCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly process: DenoProcessCapability;
  readonly worker?: DenoWorkerCapability;
}

export interface DenoBootstrapOptions {
  captureShutdownSignals?: boolean;
  signals?: ('SIGINT' | 'SIGTERM' | 'SIGQUIT')[];
  captureUncaughtErrors?: boolean;
  captureUnhandledRejections?: boolean;
}
