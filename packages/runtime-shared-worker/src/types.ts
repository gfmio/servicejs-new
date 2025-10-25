/**
 * Shared Worker runtime types
 */

import type { EnvironmentCapability } from '@servicejs/capability-env';
import type { TimeCapability } from '@servicejs/capability-time';
import type { LifecycleCapability } from '@servicejs/capability-lifecycle';
import type { ConsoleCapability } from '@servicejs/capability-console';
import type { HTTPCapability } from '@servicejs/capability-http';
import type { CryptoCapability } from '@servicejs/capability-crypto';
import type { Result } from '@servicejs/result';

export interface SharedWorkerPortCapability {
  readonly ports: ReadonlySet<MessagePort>;
  onConnect(handler: (port: MessagePort) => void): () => void;
  broadcast(message: any, transfer?: Transferable[]): Result<void, BroadcastError>;
  sendToPort(port: MessagePort, message: any, transfer?: Transferable[]): Result<void, MessageError>;
}

export interface BroadcastError {
  readonly code: 'BROADCAST_FAILED';
  readonly message: string;
  readonly failedPorts: ReadonlyArray<MessagePort>;
}

export interface MessageError {
  readonly code: 'POST_FAILED';
  readonly message: string;
}

export interface SharedWorkerRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly ports: SharedWorkerPortCapability;
}

export interface SharedWorkerBootstrapOptions {
  /**
   * Configuration passed at worker creation
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
