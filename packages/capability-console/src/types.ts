import type { Result } from '@servicejs/result';

export interface ConsoleError {
  readonly code: 'WRITE_ERROR';
  readonly message: string;
}

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly args: readonly unknown[];
  readonly timestamp: number;
}

export interface ConsoleCapability {
  log(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  info(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  warn(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  error(message: string, ...args: unknown[]): Result<void, ConsoleError>;
  debug(message: string, ...args: unknown[]): Result<void, ConsoleError>;
}
