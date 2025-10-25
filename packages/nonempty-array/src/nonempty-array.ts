/**
 * NonEmptyArray Implementation
 *
 * Type-safe non-empty arrays that guarantee at least one element.
 */

import { some, none, type Option } from '@servicejs/option';

/**
 * NonEmptyArray - Guaranteed to have at least one element
 */
export class NonEmptyArray<T> {
  private readonly array: readonly T[];

  private constructor(head: T, tail: readonly T[]) {
    this.array = [head, ...tail];
  }

  /**
   * Create a NonEmptyArray from head and tail
   */
  static of<T>(head: T, ...tail: T[]): NonEmptyArray<T> {
    return new NonEmptyArray(head, tail);
  }

  /**
   * Create from array (unsafe - throws if empty)
   */
  static fromArray<T>(arr: readonly T[]): NonEmptyArray<T> {
    if (arr.length === 0) {
      throw new Error('Cannot create NonEmptyArray from empty array');
    }
    return new NonEmptyArray(arr[0]!, arr.slice(1));
  }

  /**
   * Try to create from array (safe - returns Option)
   */
  static fromArrayOption<T>(arr: readonly T[]): Option<NonEmptyArray<T>> {
    if (arr.length === 0) {
      return none();
    }
    return some(new NonEmptyArray(arr[0]!, arr.slice(1)));
  }

  /**
   * Get the first element (always safe!)
   */
  head(): T {
    return this.array[0]!;
  }

  /**
   * Get all elements except the first
   */
  tail(): readonly T[] {
    return this.array.slice(1);
  }

  /**
   * Get the last element (always safe!)
   */
  last(): T {
    return this.array[this.array.length - 1]!;
  }

  /**
   * Get all elements except the last
   */
  init(): readonly T[] {
    return this.array.slice(0, -1);
  }

  /**
   * Get element at index (returns Option)
   */
  get(index: number): Option<T> {
    const element = this.array[index];
    if (index >= 0 && index < this.array.length && element !== undefined) {
      return some(element);
    }
    return none();
  }

  /**
   * Get the length (always >= 1)
   */
  length(): number {
    return this.array.length;
  }

  /**
   * Map over elements
   */
  map<U>(fn: (value: T) => U): NonEmptyArray<U> {
    return new NonEmptyArray(fn(this.head()), this.tail().map(fn));
  }

  /**
   * FlatMap (andThen)
   */
  flatMap<U>(fn: (value: T) => NonEmptyArray<U>): NonEmptyArray<U> {
    const mapped = this.array.map(fn);
    const first = mapped[0]!;
    const head = first.head();
    const tail = first.tail().concat(...mapped.slice(1).map(nea => nea.toArray()));
    return new NonEmptyArray(head, tail);
  }

  /**
   * Filter elements (returns regular array as it might be empty)
   */
  filter(predicate: (value: T) => boolean): readonly T[] {
    return this.array.filter(predicate);
  }

  /**
   * Reduce with initial value
   */
  reduce<U>(fn: (acc: U, value: T) => U, initial: U): U {
    return this.array.reduce(fn, initial);
  }

  /**
   * Reduce without initial value (safe because non-empty!)
   */
  reduce1(fn: (acc: T, value: T) => T): T {
    return this.tail().reduce(fn, this.head());
  }

  /**
   * Append an element
   */
  append(value: T): NonEmptyArray<T> {
    return new NonEmptyArray(this.head(), [...this.tail(), value]);
  }

  /**
   * Prepend an element
   */
  prepend(value: T): NonEmptyArray<T> {
    return new NonEmptyArray(value, this.toArray());
  }

  /**
   * Concatenate with another NonEmptyArray
   */
  concat(other: NonEmptyArray<T>): NonEmptyArray<T> {
    return new NonEmptyArray(this.head(), [...this.tail(), ...other.toArray()]);
  }

  /**
   * Reverse the array
   */
  reverse(): NonEmptyArray<T> {
    const reversed = [...this.array].reverse();
    return new NonEmptyArray(reversed[0]!, reversed.slice(1));
  }

  /**
   * Sort the array
   */
  sort(compareFn?: (a: T, b: T) => number): NonEmptyArray<T> {
    const sorted = [...this.array].sort(compareFn);
    return new NonEmptyArray(sorted[0]!, sorted.slice(1));
  }

  /**
   * Check if element exists
   */
  includes(value: T): boolean {
    return this.array.includes(value);
  }

  /**
   * Find element (returns Option)
   */
  find(predicate: (value: T) => boolean): Option<T> {
    const found = this.array.find(predicate);
    return found !== undefined ? some(found) : none();
  }

  /**
   * Find index
   */
  findIndex(predicate: (value: T) => boolean): Option<number> {
    const index = this.array.findIndex(predicate);
    return index !== -1 ? some(index) : none();
  }

  /**
   * Convert to regular array
   */
  toArray(): readonly T[] {
    return this.array;
  }

  /**
   * Zip with another NonEmptyArray
   */
  zip<U>(other: NonEmptyArray<U>): NonEmptyArray<readonly [T, U]> {
    const minLength = Math.min(this.length(), other.length());
    const zipped: [T, U][] = [];
    for (let i = 0; i < minLength; i++) {
      zipped.push([this.array[i]!, other.toArray()[i]!]);
    }
    return new NonEmptyArray(zipped[0]!, zipped.slice(1));
  }

  /**
   * Zip with function
   */
  zipWith<U, V>(other: NonEmptyArray<U>, fn: (a: T, b: U) => V): NonEmptyArray<V> {
    const minLength = Math.min(this.length(), other.length());
    const zipped: V[] = [];
    for (let i = 0; i < minLength; i++) {
      zipped.push(fn(this.array[i]!, other.toArray()[i]!));
    }
    return new NonEmptyArray(zipped[0]!, zipped.slice(1));
  }

  /**
   * Intersperse a separator between elements
   */
  intersperse(separator: T): NonEmptyArray<T> {
    if (this.length() === 1) {
      return this;
    }
    const result: T[] = [this.head()];
    for (const item of this.tail()) {
      result.push(separator, item);
    }
    return new NonEmptyArray(result[0]!, result.slice(1));
  }

  /**
   * Group consecutive equal elements
   */
  group(equals: (a: T, b: T) => boolean = (a, b) => a === b): NonEmptyArray<NonEmptyArray<T>> {
    const groups: NonEmptyArray<T>[] = [];
    let currentGroup: T[] = [this.head()];

    for (const item of this.tail()) {
      const lastItem = currentGroup[currentGroup.length - 1]!;
      if (equals(lastItem, item)) {
        currentGroup.push(item);
      } else {
        groups.push(NonEmptyArray.fromArray(currentGroup));
        currentGroup = [item];
      }
    }
    groups.push(NonEmptyArray.fromArray(currentGroup));

    return new NonEmptyArray(groups[0]!, groups.slice(1));
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `NonEmptyArray(${JSON.stringify(this.array)})`;
  }

  /**
   * Iterator support
   */
  [Symbol.iterator](): Iterator<T> {
    return this.array[Symbol.iterator]();
  }
}

/**
 * Create a NonEmptyArray (convenience function)
 */
export function nonEmptyArray<T>(head: T, ...tail: T[]): NonEmptyArray<T> {
  return NonEmptyArray.of(head, ...tail);
}

/**
 * Alias for NonEmptyArray.of
 */
export const nea = nonEmptyArray;
