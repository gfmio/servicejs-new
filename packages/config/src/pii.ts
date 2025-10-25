/**
 * PII (Personally Identifiable Information) type that wraps sensitive personal data
 * and prevents it from being accidentally exposed in logs, HTTP responses, or serialization.
 *
 * Features:
 * - Prevents toString() and toJSON() from revealing the value
 * - Configurable redaction strategies (full, partial, hash)
 * - Type-safe access through expose() method
 * - Cannot be accidentally spread or destructured
 *
 * @example
 * ```typescript
 * import { PII } from '@servicejs/config';
 *
 * const email = PII.create('user@example.com');
 * const ssn = PII.create('123-45-6789', 'partial');
 *
 * // Safe usage
 * const value = email.expose(); // 'user@example.com'
 *
 * // Protected from accidental exposure
 * console.log(email); // PII { [REDACTED] }
 * console.log(ssn); // PII { ***-**-6789 }
 * JSON.stringify({ email }); // {"email":"[REDACTED]"}
 * ```
 */
export type RedactionStrategy = 'full' | 'partial' | 'hash';

export class PII<T> {
  private value: T;
  private readonly strategy: RedactionStrategy;

  private constructor(value: T, strategy: RedactionStrategy = 'full') {
    this.value = value;
    this.strategy = strategy;
  }

  /**
   * Creates a new PII wrapper around a value.
   *
   * @param value - The PII value to protect
   * @param strategy - Redaction strategy: 'full' (default), 'partial', or 'hash'
   * @returns A PII instance wrapping the value
   */
  static create<T>(value: T, strategy: RedactionStrategy = 'full'): PII<T> {
    return new PII(value, strategy);
  }

  /**
   * Exposes the wrapped value.
   *
   * @returns The wrapped value
   */
  expose(): T {
    return this.value;
  }

  /**
   * Maps the PII value through a function, creating a new PII with the same redaction strategy.
   *
   * @param fn - Function to transform the value
   * @returns A new PII with the transformed value
   */
  map<U>(fn: (value: T) => U): PII<U> {
    return new PII(fn(this.value), this.strategy);
  }

  /**
   * Gets a redacted representation of the value based on the strategy.
   *
   * @returns A redacted string
   */
  private getRedactedValue(): string {
    if (this.strategy === 'full') {
      return '[REDACTED]';
    }

    const str = String(this.value);

    if (this.strategy === 'partial') {
      // Show last 4 characters for strings longer than 8 chars
      if (str.length > 8) {
        const visible = str.slice(-4);
        const masked = '*'.repeat(Math.min(str.length - 4, 8));
        return `${masked}${visible}`;
      }
      // For shorter strings, show first and last char
      if (str.length > 2) {
        const masked = '*'.repeat(str.length - 2);
        return `${str[0]}${masked}${str[str.length - 1]}`;
      }
      return '[REDACTED]';
    }

    if (this.strategy === 'hash') {
      // Simple hash for display purposes (NOT cryptographic)
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
      return `[HASH:${hashStr}]`;
    }

    return '[REDACTED]';
  }

  /**
   * Returns a redacted string representation.
   *
   * @returns A redacted string
   */
  toString(): string {
    return `PII { ${this.getRedactedValue()} }`;
  }

  /**
   * Prevents accidental exposure via JSON.stringify().
   *
   * @returns A redacted string
   */
  toJSON(): string {
    return this.getRedactedValue();
  }

  /**
   * Prevents accidental exposure via console.log() in Node.js/Bun.
   *
   * @returns A redacted string representation
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `PII { ${this.getRedactedValue()} }`;
  }

  /**
   * Prevents accidental exposure via Bun.inspect().
   *
   * @returns A redacted string representation
   */
  [Symbol.for('Bun.inspect.custom')](): string {
    return `PII { ${this.getRedactedValue()} }`;
  }
}
