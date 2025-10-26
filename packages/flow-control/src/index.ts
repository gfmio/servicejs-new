/**
 * @servicejs/flow-control - Backpressure and Flow Control
 *
 * Provides utilities for managing message flow, backpressure, and resilience.
 */

export {
  type AsyncCapability,
  type AsyncCapabilityConfig,
  createAsyncCapability,
} from './asyncCapability.js';

export {
  type CircuitState,
  type CircuitBreakerError,
  type CircuitBreakerConfig,
  type CircuitBreakerCapability,
  createCircuitBreaker,
} from './circuitBreaker.js';

export {
  type RateLimiterError,
  type OverflowStrategy,
  type RateLimiterConfig,
  type RateLimiterCapability,
  createRateLimiter,
} from './rateLimiter.js';

export {
  type BatchMessage,
  type BatchingConfig,
  type BatchingCapability,
  createBatchingCapability,
} from './batching.js';
