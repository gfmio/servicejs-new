/**
 * Console adapter - pretty-print events to console
 */

import type { ObservabilityEvent } from '../types.js';
import { isSpanStartEvent, isSpanEndEvent, isMetricEvent, isLogEvent } from '../types.js';

export interface ConsoleAdapterOptions {
  /** Use colors in output */
  colors?: boolean;

  /** Pretty print (multi-line) */
  pretty?: boolean;

  /** Include timestamps */
  timestamps?: boolean;

  /** Custom output function (defaults to console.log) */
  output?: (line: string) => void;
}

/**
 * Console adapter for development/debugging
 * Pretty-prints events to console
 */
export const createConsoleAdapter = (
  options: ConsoleAdapterOptions = {}
): ((event: ObservabilityEvent) => void) => {
  const { colors = true, pretty = true, timestamps = true, output = console.log } = options;

  // ANSI color codes
  const colorCodes = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  };

  const c = (color: keyof typeof colorCodes, text: string) =>
    colors ? `${colorCodes[color]}${text}${colorCodes.reset}` : text;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toISOString();
  };

  return (event: ObservabilityEvent) => {
    const ts = timestamps && 'timestamp' in event
      ? c('gray', `[${formatTimestamp(event.timestamp)}] `)
      : '';

    if (isSpanStartEvent(event)) {
      const parentInfo = event.parentSpanId ? ` parent=${event.parentSpanId}` : '';
      output(
        `${ts}${c('cyan', '▶ SPAN START')} ${c('bright', event.operation)} ` +
        `trace=${event.traceId} span=${event.spanId}${parentInfo}`
      );
      if (pretty && event.attributes) {
        output(`${c('gray', '  attributes:')} ${JSON.stringify(event.attributes)}`);
      }
    } else if (isSpanEndEvent(event)) {
      const statusColor = event.status === 'ok' ? 'green' : 'red';
      const statusIcon = event.status === 'ok' ? '✓' : '✗';
      output(
        `${ts}${c(statusColor, `${statusIcon} SPAN END`)} ` +
        `span=${event.spanId} ${c('gray', `(${event.duration}ms)`)} ${c(statusColor, event.status)}`
      );
      if (pretty && event.error) {
        output(`${c('red', '  error:')} ${event.error.message}`);
        if (event.error.stack) {
          output(c('dim', event.error.stack));
        }
      }
    } else if (isMetricEvent(event)) {
      const kindIcon = event.kind === 'counter' ? '↑' : event.kind === 'gauge' ? '⊙' : '📊';
      const labels = event.labels
        ? ' ' + c('gray', JSON.stringify(event.labels))
        : '';
      output(
        `${ts}${c('magenta', `${kindIcon} METRIC`)} ${c('bright', event.name)}=${event.value}${labels}`
      );
    } else if (isLogEvent(event)) {
      const levelColors = {
        debug: 'gray',
        info: 'blue',
        warn: 'yellow',
        error: 'red',
      } as const;
      const levelColor = levelColors[event.level] || 'gray';
      const levelText = event.level.toUpperCase().padEnd(5);

      output(
        `${ts}${c(levelColor, levelText)} ${event.message}`
      );
      if (pretty && event.context) {
        output(`${c('gray', '  context:')} ${JSON.stringify(event.context)}`);
      }
    } else {
      // Custom event
      output(
        `${ts}${c('yellow', '◆ EVENT')} ${c('bright', event.type)}`
      );
      if (pretty) {
        output(JSON.stringify(event));
      }
    }
  };
};
