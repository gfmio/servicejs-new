/**
 * Web Worker runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface MessagePortCapability {
  postMessage(message: any, transfer?: Transferable[]): Result<void, MessageError>;
  onMessage(handler: (event: MessageEvent) => void): () => void;
  close(): void;
}

export interface MessageError {
  readonly code: 'POST_FAILED';
  readonly message: string;
}

export interface WebWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly messagePort: MessagePortCapability;
}

export interface WebWorkerBootstrapOptions {
  /**
   * Configuration passed from main thread
   */
  config?: Record<string, string>;

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
