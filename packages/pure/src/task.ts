/**
 * Task Monad - Lazy/Deferred Computation
 *
 * Represents a computation that hasn't been executed yet.
 * Useful for building up complex async workflows without executing them.
 */

/**
 * Task - Lazy computation that produces a value
 */
export class Task<T> {
  constructor(private readonly computation: () => Promise<T>) {}

  /**
   * Create a Task from a computation
   */
  static of<T>(value: T): Task<T> {
    return new Task(() => Promise.resolve(value));
  }

  /**
   * Create a Task from an async function
   */
  static from<T>(fn: () => Promise<T>): Task<T> {
    return new Task(fn);
  }

  /**
   * Create a Task from a sync function
   */
  static fromSync<T>(fn: () => T): Task<T> {
    return new Task(() => Promise.resolve(fn()));
  }

  /**
   * Map over the result
   */
  map<U>(fn: (value: T) => U): Task<U> {
    return new Task(async () => fn(await this.computation()));
  }

  /**
   * FlatMap (chain Task-returning operations)
   */
  flatMap<U>(fn: (value: T) => Task<U>): Task<U> {
    return new Task(async () => {
      const value = await this.computation();
      return await fn(value).run();
    });
  }

  /**
   * Alias for flatMap
   */
  andThen<U>(fn: (value: T) => Task<U>): Task<U> {
    return this.flatMap(fn);
  }

  /**
   * Apply a Task-wrapped function
   */
  ap<U>(fn: Task<(value: T) => U>): Task<U> {
    return new Task(async () => {
      const [value, f] = await Promise.all([this.computation(), fn.run()]);
      return f(value);
    });
  }

  /**
   * Execute the Task and return the result
   */
  run(): Promise<T> {
    return this.computation();
  }

  /**
   * Execute and handle errors
   */
  async runCatch<E>(onError: (error: unknown) => E): Promise<T | E> {
    try {
      return await this.run();
    } catch (error) {
      return onError(error);
    }
  }

  /**
   * Delay execution
   */
  delay(ms: number): Task<T> {
    return new Task(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return await this.computation();
    });
  }

  /**
   * Execute with timeout
   */
  timeout(ms: number, onTimeout: () => T): Task<T> {
    return new Task(async () => {
      return await Promise.race([
        this.computation(),
        new Promise<T>(resolve => setTimeout(() => resolve(onTimeout()), ms)),
      ]);
    });
  }

  /**
   * Tap for side effects
   */
  tap(fn: (value: T) => void): Task<T> {
    return new Task(async () => {
      const value = await this.computation();
      fn(value);
      return value;
    });
  }

  /**
   * Recover from errors
   */
  catch<U>(fn: (error: unknown) => U): Task<T | U> {
    return new Task(async () => {
      try {
        return await this.computation();
      } catch (error) {
        return fn(error);
      }
    });
  }
}

/**
 * Create a Task (convenience function)
 */
export function task<T>(fn: () => Promise<T>): Task<T> {
  return Task.from(fn);
}

/**
 * Run multiple Tasks in parallel
 */
export function parallel<T>(tasks: readonly Task<T>[]): Task<readonly T[]> {
  return Task.from(async () => {
    return await Promise.all(tasks.map(t => t.run()));
  });
}

/**
 * Run multiple Tasks sequentially
 */
export function sequential<T>(tasks: readonly Task<T>[]): Task<readonly T[]> {
  return Task.from(async () => {
    const results: T[] = [];
    for (const task of tasks) {
      results.push(await task.run());
    }
    return results;
  });
}
