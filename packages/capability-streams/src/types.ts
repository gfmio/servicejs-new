/**
 * Standard I/O streams capability interface for ServiceJS.
 *
 * Provides platform-agnostic access to stdin, stdout, and stderr without ambient authority.
 *
 * @packageDocumentation
 */

import type { Result } from '@servicejs/result';

/**
 * Stream error codes.
 */
export type StreamErrorCode =
  | 'READ_ERROR' // Error reading from stream
  | 'WRITE_ERROR' // Error writing to stream
  | 'NOT_READABLE' // Stream is not readable
  | 'NOT_WRITABLE' // Stream is not writable
  | 'CLOSED' // Stream is closed
  | 'UNKNOWN'; // Unknown error

/**
 * Stream error type.
 */
export interface StreamError {
  readonly code: StreamErrorCode;
  readonly message: string;
}

/**
 * Standard input stream capability.
 *
 * Provides read-only access to stdin.
 */
export interface StdinCapability {
  /**
   * Read a line from stdin (up to newline character).
   *
   * @returns Result containing the line read (without newline) or error
   */
  readLine(): Promise<Result<string, StreamError>>;

  /**
   * Read all remaining data from stdin.
   *
   * @returns Result containing all data or error
   */
  readAll(): Promise<Result<string, StreamError>>;

  /**
   * Check if stdin is a TTY (interactive terminal).
   *
   * @returns true if stdin is a TTY
   */
  isTTY(): boolean;
}

/**
 * Standard output stream capability.
 *
 * Provides write-only access to stdout.
 */
export interface StdoutCapability {
  /**
   * Write data to stdout.
   *
   * @param data - Data to write
   * @returns Result indicating success or error
   */
  write(data: string): Promise<Result<void, StreamError>>;

  /**
   * Write data to stdout followed by a newline.
   *
   * @param data - Data to write
   * @returns Result indicating success or error
   */
  writeLine(data: string): Promise<Result<void, StreamError>>;

  /**
   * Check if stdout is a TTY (interactive terminal).
   *
   * @returns true if stdout is a TTY
   */
  isTTY(): boolean;
}

/**
 * Standard error stream capability.
 *
 * Provides write-only access to stderr.
 */
export interface StderrCapability {
  /**
   * Write data to stderr.
   *
   * @param data - Data to write
   * @returns Result indicating success or error
   */
  write(data: string): Promise<Result<void, StreamError>>;

  /**
   * Write data to stderr followed by a newline.
   *
   * @param data - Data to write
   * @returns Result indicating success or error
   */
  writeLine(data: string): Promise<Result<void, StreamError>>;

  /**
   * Check if stderr is a TTY (interactive terminal).
   *
   * @returns true if stderr is a TTY
   */
  isTTY(): boolean;
}

/**
 * Combined streams capability.
 *
 * Provides access to all standard streams.
 *
 * @example
 * ```typescript
 * const streams = runtime.streams;
 *
 * // Read from stdin
 * const line = await streams.stdin.readLine();
 * if (line.ok) {
 *   // Write to stdout
 *   await streams.stdout.writeLine(`You entered: ${line.value}`);
 * }
 *
 * // Write error to stderr
 * await streams.stderr.writeLine('An error occurred');
 * ```
 */
export interface StreamsCapability {
  readonly stdin: StdinCapability;
  readonly stdout: StdoutCapability;
  readonly stderr: StderrCapability;
}
