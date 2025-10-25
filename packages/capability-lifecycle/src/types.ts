/**
 * Lifecycle and shutdown capability types
 */

import type { Result } from '@servicejs/result';

export type ShutdownHandler = (signal: ShutdownSignal) => Promise<void> | void;
export type UnregisterFn = () => void;

export interface ShutdownSignal {
  readonly reason: string;
  readonly signal?: string;
  readonly timestamp: number;
}

export interface LifecycleError {
  readonly code: 'ALREADY_SHUTDOWN' | 'HANDLER_ERROR';
  readonly message: string;
}

export interface LifecycleCapability {
  onShutdown(handler: ShutdownHandler): Result<UnregisterFn, LifecycleError>;
  shutdown(reason?: string): Promise<Result<void, LifecycleError>>;
  isShuttingDown(): boolean;
}
