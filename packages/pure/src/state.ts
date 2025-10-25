/**
 * State Monad - Stateful Computations
 *
 * Represents a computation that threads state through operations.
 */

/**
 * State - Computation that transforms state and produces a value
 */
export class State<S, A> {
  constructor(private readonly runFn: (state: S) => readonly [A, S]) {}

  /**
   * Create a State that returns a constant value
   */
  static of<S, A>(value: A): State<S, A> {
    return new State(state => [value, state]);
  }

  /**
   * Get the current state
   */
  static get<S>(): State<S, S> {
    return new State(state => [state, state]);
  }

  /**
   * Set the state
   */
  static put<S>(newState: S): State<S, void> {
    return new State(() => [undefined, newState]);
  }

  /**
   * Modify the state
   */
  static modify<S>(fn: (state: S) => S): State<S, void> {
    return new State(state => [undefined, fn(state)]);
  }

  /**
   * Get a value derived from state
   */
  static gets<S, A>(fn: (state: S) => A): State<S, A> {
    return new State(state => [fn(state), state]);
  }

  /**
   * Map over the value
   */
  map<B>(fn: (value: A) => B): State<S, B> {
    return new State(state => {
      const [value, newState] = this.runFn(state);
      return [fn(value), newState];
    });
  }

  /**
   * FlatMap (chain State-returning operations)
   */
  flatMap<B>(fn: (value: A) => State<S, B>): State<S, B> {
    return new State(state => {
      const [value, newState] = this.runFn(state);
      return fn(value).run(newState);
    });
  }

  /**
   * Alias for flatMap
   */
  andThen<B>(fn: (value: A) => State<S, B>): State<S, B> {
    return this.flatMap(fn);
  }

  /**
   * Apply a State-wrapped function
   */
  ap<B>(fn: State<S, (value: A) => B>): State<S, B> {
    return new State(state => {
      const [f, state1] = fn.run(state);
      const [value, state2] = this.runFn(state1);
      return [f(value), state2];
    });
  }

  /**
   * Run the State with an initial state
   */
  run(initialState: S): readonly [A, S] {
    return this.runFn(initialState);
  }

  /**
   * Run and return only the value
   */
  eval(initialState: S): A {
    return this.runFn(initialState)[0];
  }

  /**
   * Run and return only the final state
   */
  exec(initialState: S): S {
    return this.runFn(initialState)[1];
  }
}

/**
 * Create a State (convenience function)
 */
export function state<S, A>(fn: (state: S) => readonly [A, S]): State<S, A> {
  return new State(fn);
}

/**
 * Get the current state
 */
export function get<S>(): State<S, S> {
  return State.get();
}

/**
 * Set the state
 */
export function put<S>(newState: S): State<S, void> {
  return State.put(newState);
}

/**
 * Modify the state
 */
export function modify<S>(fn: (state: S) => S): State<S, void> {
  return State.modify(fn);
}

/**
 * Get a derived value from state
 */
export function gets<S, A>(fn: (state: S) => A): State<S, A> {
  return State.gets(fn);
}
