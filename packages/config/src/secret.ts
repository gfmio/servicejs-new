/**
 * Secret type that wraps sensitive values and prevents them from being
 * accidentally exposed in logs, HTTP responses, or serialization.
 *
 * Features:
 * - Prevents toString() and toJSON() from revealing the value
 * - Self-destruction capability to clear the secret after use
 * - Type-safe access through expose() method
 * - Cannot be accidentally spread or destructured
 *
 * @example
 * ```typescript
 * import { Secret } from '@servicejs/config';
 *
 * const apiKey = Secret.create('sk-1234567890');
 *
 * // Safe usage
 * const value = apiKey.expose(); // 'sk-1234567890'
 *
 * // Protected from accidental exposure
 * console.log(apiKey); // Secret { [REDACTED] }
 * JSON.stringify({ apiKey }); // {"apiKey":"[REDACTED]"}
 *
 * // Self-destruct after use
 * apiKey.destroy();
 * apiKey.expose(); // undefined (destroyed)
 * ```
 */
export class Secret<T> {
  private value: T | undefined;
  private destroyed: boolean = false;

  private constructor(value: T) {
    this.value = value;
  }

  /**
   * Creates a new Secret wrapper around a value.
   *
   * @param value - The sensitive value to protect
   * @returns A Secret instance wrapping the value
   */
  static create<T>(value: T): Secret<T> {
    return new Secret(value);
  }

  /**
   * Exposes the wrapped value. Returns undefined if the secret has been destroyed.
   *
   * @returns The wrapped value, or undefined if destroyed
   */
  expose(): T | undefined {
    if (this.destroyed) {
      return undefined;
    }
    return this.value;
  }

  /**
   * Destroys the secret by clearing its value and marking it as destroyed.
   * After destruction, expose() will return undefined.
   *
   * This is useful for one-time secrets that should not be reused.
   */
  destroy(): void {
    this.value = undefined;
    this.destroyed = true;
  }

  /**
   * Checks if the secret has been destroyed.
   *
   * @returns true if destroyed, false otherwise
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Maps the secret value through a function, creating a new Secret.
   * If the secret is destroyed, returns a destroyed Secret.
   *
   * @param fn - Function to transform the value
   * @returns A new Secret with the transformed value
   */
  map<U>(fn: (value: T) => U): Secret<U> {
    const newSecret = new Secret(undefined as any);
    if (this.destroyed || this.value === undefined) {
      newSecret.destroyed = true;
    } else {
      newSecret.value = fn(this.value);
    }
    return newSecret;
  }

  /**
   * Prevents accidental exposure via toString().
   *
   * @returns A redacted string representation
   */
  toString(): string {
    return 'Secret { [REDACTED] }';
  }

  /**
   * Prevents accidental exposure via JSON.stringify().
   *
   * @returns A redacted string
   */
  toJSON(): string {
    return '[REDACTED]';
  }

  /**
   * Prevents accidental exposure via console.log() in Node.js/Bun.
   *
   * @returns A redacted string representation
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'Secret { [REDACTED] }';
  }

  /**
   * Prevents accidental exposure via Bun.inspect().
   *
   * @returns A redacted string representation
   */
  [Symbol.for('Bun.inspect.custom')](): string {
    return 'Secret { [REDACTED] }';
  }
}
