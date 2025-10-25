/**
 * Node.js runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability } from '@servicejs/capability-fs';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { StreamsCapability } from '@servicejs/capability-streams';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface NodeProcessCapability {
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

export interface WorkerThreadCapability {
  postMessage(message: any, transferList?: any[]): Result<void, WorkerError>;
  onMessage(handler: (message: any) => void): () => void;
  terminate(): void;
  readonly threadId: number;
  readonly isMainThread: boolean;
}

export interface WorkerError {
  readonly code: 'POST_FAILED' | 'WORKER_ERROR';
  readonly message: string;
}

export interface NodeRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly fs: FilesystemCapability;
  readonly http: HTTPCapability;
  readonly streams: StreamsCapability;
  readonly crypto: CryptoCapability;
  readonly process: NodeProcessCapability;
  readonly worker?: WorkerThreadCapability;
}

export interface NodeBootstrapOptions {
  captureShutdownSignals?: boolean;
  signals?: Partial<Record<NodeJS.Signals, boolean>>;
  captureUncaughtErrors?: boolean;
  captureUnhandledRejections?: boolean;
}
