// Bun runtime uses similar capabilities to Node.js with Bun-specific enhancements
import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { FilesystemCapability } from '@servicejs/capability-fs';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { StreamsCapability } from '@servicejs/capability-streams';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface BunProcessCapability {
  readonly pid: number;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly platform: string;
  readonly arch: string;
  readonly version: string; // Bun version
  exit(code: number): never;
  chdir(directory: string): Result<void, ProcessError>;
}

export interface ProcessError {
  readonly code: 'INVALID_DIRECTORY' | 'PERMISSION_DENIED';
  readonly message: string;
}

export interface BunRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly fs: FilesystemCapability;
  readonly http: HTTPCapability;
  readonly streams: StreamsCapability;
  readonly crypto: CryptoCapability;
  readonly process: BunProcessCapability;
}

export interface BunBootstrapOptions {
  captureShutdownSignals?: boolean;
  signals?: ('SIGTERM' | 'SIGINT' | 'SIGUSR2')[];
  captureUncaughtErrors?: boolean;
  captureUnhandledRejections?: boolean;
}
