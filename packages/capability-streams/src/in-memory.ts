/**
 * In-memory streams implementation for testing.
 */

import { ok, err } from '@servicejs/result';
import type { Result } from '@servicejs/result';
import type {
  StreamsCapability,
  StdinCapability,
  StdoutCapability,
  StderrCapability,
  StreamError,
} from './types.js';

/**
 * In-memory stdin implementation.
 */
export interface InMemoryStdin extends StdinCapability {
  /**
   * Add lines to stdin buffer.
   */
  addLines(...lines: string[]): void;

  /**
   * Add raw data to stdin buffer.
   */
  addData(data: string): void;

  /**
   * Check if buffer is empty.
   */
  isEmpty(): boolean;

  /**
   * Clear the buffer.
   */
  clear(): void;
}

/**
 * In-memory stdout implementation.
 */
export interface InMemoryStdout extends StdoutCapability {
  /**
   * Get all written lines.
   */
  getLines(): readonly string[];

  /**
   * Get all written data (including partial writes).
   */
  getData(): string;

  /**
   * Clear the output.
   */
  clear(): void;
}

/**
 * In-memory stderr implementation.
 */
export interface InMemoryStderr extends StderrCapability {
  /**
   * Get all written lines.
   */
  getLines(): readonly string[];

  /**
   * Get all written data (including partial writes).
   */
  getData(): string;

  /**
   * Clear the output.
   */
  clear(): void;
}

/**
 * In-memory streams capability.
 */
export interface InMemoryStreamsCapability extends StreamsCapability {
  readonly stdin: InMemoryStdin;
  readonly stdout: InMemoryStdout;
  readonly stderr: InMemoryStderr;
}

/**
 * Create an in-memory stdin for testing.
 *
 * @param initialLines - Optional initial lines in the buffer
 * @returns In-memory stdin capability
 */
export function createInMemoryStdin(initialLines: string[] = []): InMemoryStdin {
  const lines: string[] = [...initialLines];
  let buffer = '';

  return {
    async readLine(): Promise<Result<string, StreamError>> {
      // First check if there's a complete line in the buffer
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        return ok(line);
      }

      // Otherwise get next line from queue
      if (lines.length > 0) {
        const line = lines.shift()!;
        return ok(line);
      }

      // Check if there's remaining data in buffer without newline
      if (buffer.length > 0) {
        const line = buffer;
        buffer = '';
        return ok(line);
      }

      return err({
        code: 'READ_ERROR',
        message: 'No data available',
      });
    },

    async readAll(): Promise<Result<string, StreamError>> {
      const allLines = [...lines];
      lines.length = 0;

      const result = buffer + (allLines.length > 0 ? allLines.join('\n') : '');
      buffer = '';

      return ok(result);
    },

    isTTY(): boolean {
      return false; // In-memory streams are not TTY
    },

    addLines(...newLines: string[]): void {
      lines.push(...newLines);
    },

    addData(data: string): void {
      buffer += data;
    },

    isEmpty(): boolean {
      return lines.length === 0 && buffer.length === 0;
    },

    clear(): void {
      lines.length = 0;
      buffer = '';
    },
  };
}

/**
 * Create an in-memory stdout for testing.
 *
 * @returns In-memory stdout capability
 */
export function createInMemoryStdout(): InMemoryStdout {
  const lines: string[] = [];
  let data = '';

  return {
    async write(text: string): Promise<Result<void, StreamError>> {
      data += text;
      return ok(undefined);
    },

    async writeLine(text: string): Promise<Result<void, StreamError>> {
      lines.push(text);
      data += text + '\n';
      return ok(undefined);
    },

    isTTY(): boolean {
      return false;
    },

    getLines(): readonly string[] {
      return [...lines];
    },

    getData(): string {
      return data;
    },

    clear(): void {
      lines.length = 0;
      data = '';
    },
  };
}

/**
 * Create an in-memory stderr for testing.
 *
 * @returns In-memory stderr capability
 */
export function createInMemoryStderr(): InMemoryStderr {
  const lines: string[] = [];
  let data = '';

  return {
    async write(text: string): Promise<Result<void, StreamError>> {
      data += text;
      return ok(undefined);
    },

    async writeLine(text: string): Promise<Result<void, StreamError>> {
      lines.push(text);
      data += text + '\n';
      return ok(undefined);
    },

    isTTY(): boolean {
      return false;
    },

    getLines(): readonly string[] {
      return [...lines];
    },

    getData(): string {
      return data;
    },

    clear(): void {
      lines.length = 0;
      data = '';
    },
  };
}

/**
 * Create in-memory streams capability for testing.
 *
 * @param options - Optional initial configuration
 * @returns In-memory streams capability
 *
 * @example
 * ```typescript
 * const streams = createInMemoryStreams({
 *   stdinLines: ['Alice', 'Bob', 'Charlie'],
 * });
 *
 * const name = await streams.stdin.readLine();
 * if (name.ok) {
 *   await streams.stdout.writeLine(`Hello, ${name.value}!`);
 * }
 *
 * const output = streams.stdout.getLines();
 * expect(output).toEqual(['Hello, Alice!']);
 * ```
 */
export function createInMemoryStreams(options: {
  stdinLines?: string[];
} = {}): InMemoryStreamsCapability {
  return {
    stdin: createInMemoryStdin(options.stdinLines),
    stdout: createInMemoryStdout(),
    stderr: createInMemoryStderr(),
  };
}

/**
 * Create no-op streams capability where all operations fail or succeed silently.
 *
 * @returns No-op streams capability
 */
export function createNoOpStreams(): StreamsCapability {
  const readError: StreamError = {
    code: 'NOT_READABLE',
    message: 'Stream access disabled',
  };

  return {
    stdin: {
      async readLine() {
        return err(readError);
      },
      async readAll() {
        return err(readError);
      },
      isTTY() {
        return false;
      },
    },
    stdout: {
      async write() {
        return ok(undefined);
      },
      async writeLine() {
        return ok(undefined);
      },
      isTTY() {
        return false;
      },
    },
    stderr: {
      async write() {
        return ok(undefined);
      },
      async writeLine() {
        return ok(undefined);
      },
      isTTY() {
        return false;
      },
    },
  };
}
