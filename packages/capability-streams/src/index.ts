/**
 * @servicejs/capability-streams
 *
 * Standard I/O streams capability interface for ServiceJS.
 *
 * Provides platform-agnostic access to stdin, stdout, and stderr without ambient authority.
 *
 * @example
 * ```typescript
 * import { createInMemoryStreams } from '@servicejs/capability-streams';
 *
 * const streams = createInMemoryStreams({
 *   stdinLines: ['Hello', 'World'],
 * });
 *
 * const line = await streams.stdin.readLine();
 * if (line.ok) {
 *   await streams.stdout.writeLine(`Read: ${line.value}`);
 * }
 *
 * console.log(streams.stdout.getLines()); // ['Read: Hello']
 * ```
 *
 * @packageDocumentation
 */

export type {
  StreamsCapability,
  StdinCapability,
  StdoutCapability,
  StderrCapability,
  StreamError,
  StreamErrorCode,
} from './types.js';

export type {
  InMemoryStreamsCapability,
  InMemoryStdin,
  InMemoryStdout,
  InMemoryStderr,
} from './in-memory.js';

export {
  createInMemoryStreams,
  createInMemoryStdin,
  createInMemoryStdout,
  createInMemoryStderr,
  createNoOpStreams,
} from './in-memory.js';
