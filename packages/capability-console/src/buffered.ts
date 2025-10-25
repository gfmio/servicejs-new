import { ok, type Result } from '@servicejs/result';
import type { ConsoleCapability, ConsoleError, LogEntry, LogLevel } from './types.js';

export interface BufferedConsoleCapability extends ConsoleCapability {
  getLogs(): readonly LogEntry[];
  clear(): void;
}

export function createBufferedConsole(): BufferedConsoleCapability {
  const logs: LogEntry[] = [];

  const log = (level: LogLevel) => (message: string, ...args: unknown[]): Result<void, ConsoleError> => {
    logs.push({
      level,
      message,
      args,
      timestamp: Date.now(),
    });
    return ok(undefined);
  };

  return {
    log: log('log'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    debug: log('debug'),
    getLogs: () => [...logs],
    clear: () => { logs.length = 0; },
  };
}

export function createNoOpConsole(): ConsoleCapability {
  const noop = () => ok(undefined);
  return {
    log: noop,
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
  };
}
