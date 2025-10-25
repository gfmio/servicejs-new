/**
 * Writer Monad - Logging/Accumulation
 *
 * Represents a computation that produces a value and accumulates a log.
 */

/**
 * Writer - Computation with accumulated log
 */
export class Writer<W, A> {
  constructor(
    private readonly value: A,
    private readonly log: readonly W[]
  ) {}

  /**
   * Create a Writer with a value and empty log
   */
  static of<W, A>(value: A): Writer<W, A> {
    return new Writer(value, []);
  }

  /**
   * Create a Writer with a value and log entries
   */
  static make<W, A>(value: A, ...log: W[]): Writer<W, A> {
    return new Writer(value, log);
  }

  /**
   * Create a Writer that just logs (returns unit/undefined)
   */
  static tell<W>(...log: W[]): Writer<W, void> {
    return new Writer(undefined, log);
  }

  /**
   * Map over the value
   */
  map<B>(fn: (value: A) => B): Writer<W, B> {
    return new Writer(fn(this.value), this.log);
  }

  /**
   * Map over the log
   */
  mapLog<W2>(fn: (log: readonly W[]) => readonly W2[]): Writer<W2, A> {
    return new Writer(this.value, fn(this.log));
  }

  /**
   * FlatMap (chain Writer-returning operations)
   */
  flatMap<B>(fn: (value: A) => Writer<W, B>): Writer<W, B> {
    const next = fn(this.value);
    return new Writer(next.value, [...this.log, ...next.log]);
  }

  /**
   * Alias for flatMap
   */
  andThen<B>(fn: (value: A) => Writer<W, B>): Writer<W, B> {
    return this.flatMap(fn);
  }

  /**
   * Add log entries without changing value
   */
  tell(...entries: W[]): Writer<W, A> {
    return new Writer(this.value, [...this.log, ...entries]);
  }

  /**
   * Clear the log
   */
  clearLog(): Writer<W, A> {
    return new Writer(this.value, []);
  }

  /**
   * Extract value and log
   */
  run(): readonly [A, readonly W[]] {
    return [this.value, this.log] as const;
  }

  /**
   * Extract just the value
   */
  getValue(): A {
    return this.value;
  }

  /**
   * Extract just the log
   */
  getLog(): readonly W[] {
    return this.log;
  }

  /**
   * Listen to the log (pass log to function)
   */
  listen(): Writer<W, readonly [A, readonly W[]]> {
    return new Writer([this.value, this.log] as const, this.log);
  }

  /**
   * Censor the log (filter/transform log entries)
   */
  censor(fn: (log: readonly W[]) => readonly W[]): Writer<W, A> {
    return new Writer(this.value, fn(this.log));
  }
}

/**
 * Create a Writer (convenience function)
 */
export function writer<W, A>(value: A, ...log: W[]): Writer<W, A> {
  return Writer.make(value, ...log);
}

/**
 * Just log without a meaningful value
 */
export function tell<W>(...log: W[]): Writer<W, void> {
  return Writer.tell(...log);
}
