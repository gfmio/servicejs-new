/**
 * @servicejs/flow-control - Rate Limiter
 *
 * Implements token bucket rate limiting for message passing.
 */

import type { Capability, Message } from '@servicejs/core';
import { ok, err, type Result } from '@servicejs/result';

/**
 * Rate limiter error types.
 */
export type RateLimiterError =
  | { type: 'RATE_LIMITED'; message: string; retryAfter: number }
  | { type: 'SEND_FAILED'; error: unknown };

/**
 * Overflow strategy when rate limit is exceeded.
 */
export type OverflowStrategy = 'drop' | 'error';

/**
 * Rate limiter configuration.
 */
export interface RateLimiterConfig {
  /**
   * Maximum number of messages per window.
   * Default: 100
   */
  maxMessages?: number;

  /**
   * Window duration in milliseconds.
   * Default: 1000 (1 second)
   */
  windowMs?: number;

  /**
   * Strategy when rate limit is exceeded.
   * - 'drop': Silently drop the message
   * - 'error': Return an error
   * Default: 'error'
   */
  overflowStrategy?: OverflowStrategy;

  /**
   * Optional callback when a message is rate limited.
   */
  onRateLimited?: (message: Message) => void;
}

/**
 * Rate limiter capability wrapper.
 */
export interface RateLimiterCapability<TMsg extends Message> {
  /**
   * Send a message through the rate limiter.
   * May be rejected if rate limit is exceeded.
   *
   * @param message - The message to send
   * @returns Result indicating success or rate limit error
   */
  send(message: TMsg): Result<void, RateLimiterError>;

  /**
   * Get the number of available tokens.
   *
   * @returns The number of messages that can be sent immediately
   */
  getAvailableTokens(): number;

  /**
   * Get the time until the next token refill.
   *
   * @returns Milliseconds until next refill
   */
  getTimeUntilRefill(): number;

  /**
   * Reset the rate limiter.
   */
  reset(): void;
}

/**
 * Create a rate limiter wrapper for a capability.
 *
 * Uses a token bucket algorithm to limit the rate of messages.
 * Tokens are refilled at the start of each window.
 *
 * @typeParam TMsg - The message type
 * @param capability - The underlying capability to wrap
 * @param config - Rate limiter configuration
 * @returns A rate-limited capability
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter(capability, {
 *   maxMessages: 10,
 *   windowMs: 1000,
 *   overflowStrategy: 'error',
 *   onRateLimited: (msg) => console.log('Rate limited:', msg)
 * });
 *
 * const result = limiter.send({ type: 'api-call' });
 * if (result.isErr() && result.error.type === 'RATE_LIMITED') {
 *   console.log(`Retry after ${result.error.retryAfter}ms`);
 * }
 * ```
 */
export function createRateLimiter<TMsg extends Message>(
  capability: Capability<TMsg>,
  config: RateLimiterConfig = {}
): RateLimiterCapability<TMsg> {
  const {
    maxMessages = 100,
    windowMs = 1000,
    overflowStrategy = 'error',
    onRateLimited,
  } = config;

  let tokens = maxMessages;
  let windowStart = Date.now();

  const refillTokens = (): void => {
    const now = Date.now();
    const elapsed = now - windowStart;

    if (elapsed >= windowMs) {
      // Start new window
      tokens = maxMessages;
      windowStart = now;
    }
  };

  return {
    send(message: TMsg): Result<void, RateLimiterError> {
      refillTokens();

      // Check if we have tokens available
      if (tokens <= 0) {
        const retryAfter = windowMs - (Date.now() - windowStart);
        onRateLimited?.(message);

        if (overflowStrategy === 'drop') {
          // Silently drop the message
          return ok(undefined);
        } else {
          // Return error
          return err({
            type: 'RATE_LIMITED',
            message: `Rate limit exceeded (${maxMessages} messages per ${windowMs}ms)`,
            retryAfter,
          });
        }
      }

      try {
        // Consume a token and send the message
        tokens--;
        capability.send(message);
        return ok(undefined);
      } catch (error) {
        // Restore the token on error
        tokens++;
        return err({
          type: 'SEND_FAILED',
          error,
        });
      }
    },

    getAvailableTokens(): number {
      refillTokens();
      return Math.max(0, tokens);
    },

    getTimeUntilRefill(): number {
      const elapsed = Date.now() - windowStart;
      return Math.max(0, windowMs - elapsed);
    },

    reset(): void {
      tokens = maxMessages;
      windowStart = Date.now();
    },
  };
}
