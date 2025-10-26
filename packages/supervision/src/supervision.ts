/**
 * @servicejs/supervision - Supervision Pattern
 *
 * Provides Erlang/Akka-style supervision for fault-tolerant components.
 */

import type { URN, Message, Capability } from '@servicejs/core';
import { ok, err, type Result } from '@servicejs/result';

/**
 * Supervision strategies for handling child failures.
 */
export type SupervisionStrategy = 'restart' | 'stop' | 'escalate';

/**
 * Error notification message sent by supervisor.
 */
export interface ErrorNotification extends Message {
  readonly type: 'error-notification';
  readonly childUrn: URN;
  readonly error: unknown;
  readonly strategy: SupervisionStrategy;
  readonly retryCount: number;
}

/**
 * Supervisor configuration.
 */
export interface SupervisorConfig {
  /**
   * Default supervision strategy.
   * Default: 'restart'
   */
  strategy?: SupervisionStrategy;

  /**
   * Maximum number of restart attempts before giving up.
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Delay in milliseconds between restart attempts.
   * Default: 1000 (1 second)
   */
  retryDelay?: number;

  /**
   * Optional capability to send error notifications to.
   */
  errorNotificationCapability?: Capability<ErrorNotification>;

  /**
   * Optional parent supervisor for escalation.
   */
  parentSupervisor?: Supervisor;
}

/**
 * Child registration information.
 */
export interface ChildInfo<T = unknown> {
  /**
   * Unique identifier for the child.
   */
  readonly urn: URN;

  /**
   * Function to restart the child component.
   * Should return the new child instance.
   */
  readonly restart: () => Promise<T> | T;

  /**
   * Override the default supervision strategy for this child.
   */
  readonly strategy?: SupervisionStrategy;
}

/**
 * Child state tracked by supervisor.
 */
interface ChildState<T = unknown> {
  readonly info: ChildInfo<T>;
  retryCount: number;
  isRestarting: boolean;
}

/**
 * Supervisor interface.
 *
 * Manages child components and handles their failures according
 * to configured supervision strategies.
 */
export interface Supervisor {
  /**
   * Register a child component with the supervisor.
   *
   * @param childInfo - Child registration information
   * @returns Result indicating success or error
   */
  registerChild<T>(childInfo: ChildInfo<T>): Result<void, SupervisionError>;

  /**
   * Unregister a child component from the supervisor.
   *
   * @param childUrn - URN of the child to unregister
   * @returns Result indicating success or error
   */
  unregisterChild(childUrn: URN): Result<void, SupervisionError>;

  /**
   * Notify the supervisor of a child error.
   * The supervisor will handle the error according to the strategy.
   *
   * @param childUrn - URN of the child that encountered an error
   * @param error - The error that occurred
   * @returns Promise with result of error handling
   */
  notifyError(childUrn: URN, error: unknown): Promise<Result<void, SupervisionError>>;

  /**
   * Get the number of registered children.
   *
   * @returns The number of children
   */
  size(): number;

  /**
   * Get retry count for a specific child.
   *
   * @param childUrn - URN of the child
   * @returns Retry count or undefined if child not found
   */
  getRetryCount(childUrn: URN): number | undefined;

  /**
   * Check if a child is currently being restarted.
   *
   * @param childUrn - URN of the child
   * @returns True if child is restarting
   */
  isRestarting(childUrn: URN): boolean;
}

/**
 * Supervision error types.
 */
export type SupervisionError =
  | { type: 'CHILD_NOT_FOUND'; urn: URN }
  | { type: 'CHILD_ALREADY_REGISTERED'; urn: URN }
  | { type: 'RESTART_FAILED'; urn: URN; error: unknown }
  | { type: 'MAX_RETRIES_EXCEEDED'; urn: URN; retryCount: number }
  | { type: 'NO_PARENT_SUPERVISOR'; urn: URN };

/**
 * Create a supervisor.
 *
 * The supervisor manages child components and handles their failures
 * according to configured strategies:
 * - **restart**: Attempt to restart the child (with retry limits)
 * - **stop**: Stop and unregister the child
 * - **escalate**: Notify parent supervisor and stop the child
 *
 * @param config - Supervisor configuration
 * @returns A new supervisor
 *
 * @example
 * ```typescript
 * const supervisor = createSupervisor({
 *   strategy: 'restart',
 *   maxRetries: 3,
 *   retryDelay: 1000,
 * });
 *
 * supervisor.registerChild({
 *   urn: 'urn:example:worker',
 *   restart: async () => createWorker(),
 *   strategy: 'restart',
 * });
 *
 * // When worker fails
 * await supervisor.notifyError('urn:example:worker', new Error('Worker failed'));
 * ```
 */
export function createSupervisor(config: SupervisorConfig = {}): Supervisor {
  const {
    strategy: defaultStrategy = 'restart',
    maxRetries = 3,
    retryDelay = 1000,
    errorNotificationCapability,
    parentSupervisor,
  } = config;

  const children = new Map<URN, ChildState>();

  const sendErrorNotification = (
    childUrn: URN,
    error: unknown,
    strategy: SupervisionStrategy,
    retryCount: number
  ): void => {
    if (errorNotificationCapability) {
      errorNotificationCapability.send({
        type: 'error-notification',
        childUrn,
        error,
        strategy,
        retryCount,
      });
    }
  };

  const handleRestart = async (
    childUrn: URN,
    error: unknown
  ): Promise<Result<void, SupervisionError>> => {
    const child = children.get(childUrn);
    if (!child) {
      return err({ type: 'CHILD_NOT_FOUND', urn: childUrn });
    }

    // Check if already restarting
    if (child.isRestarting) {
      return ok(undefined);
    }

    // Check max retries
    if (child.retryCount >= maxRetries) {
      sendErrorNotification(childUrn, error, 'restart', child.retryCount);
      children.delete(childUrn);
      return err({
        type: 'MAX_RETRIES_EXCEEDED',
        urn: childUrn,
        retryCount: child.retryCount,
      });
    }

    // Mark as restarting
    child.isRestarting = true;
    child.retryCount++;

    // Wait for retry delay
    if (retryDelay > 0 && child.retryCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    try {
      // Attempt restart
      await child.info.restart();

      // Success - reset retry count
      child.retryCount = 0;
      child.isRestarting = false;

      return ok(undefined);
    } catch (restartError) {
      child.isRestarting = false;

      sendErrorNotification(childUrn, restartError, 'restart', child.retryCount);

      // Try again if under max retries
      if (child.retryCount < maxRetries) {
        return handleRestart(childUrn, restartError);
      }

      children.delete(childUrn);
      return err({
        type: 'RESTART_FAILED',
        urn: childUrn,
        error: restartError,
      });
    }
  };

  const handleStop = (
    childUrn: URN,
    error: unknown
  ): Result<void, SupervisionError> => {
    const child = children.get(childUrn);
    if (!child) {
      return err({ type: 'CHILD_NOT_FOUND', urn: childUrn });
    }

    sendErrorNotification(childUrn, error, 'stop', child.retryCount);
    children.delete(childUrn);

    return ok(undefined);
  };

  const handleEscalate = async (
    childUrn: URN,
    error: unknown
  ): Promise<Result<void, SupervisionError>> => {
    const child = children.get(childUrn);
    if (!child) {
      return err({ type: 'CHILD_NOT_FOUND', urn: childUrn });
    }

    sendErrorNotification(childUrn, error, 'escalate', child.retryCount);

    // Stop the child
    children.delete(childUrn);

    // Escalate to parent
    if (parentSupervisor) {
      await parentSupervisor.notifyError(childUrn, error);
      return ok(undefined);
    }

    return err({ type: 'NO_PARENT_SUPERVISOR', urn: childUrn });
  };

  return {
    registerChild<T>(childInfo: ChildInfo<T>): Result<void, SupervisionError> {
      if (children.has(childInfo.urn)) {
        return err({ type: 'CHILD_ALREADY_REGISTERED', urn: childInfo.urn });
      }

      children.set(childInfo.urn, {
        info: childInfo as ChildInfo,
        retryCount: 0,
        isRestarting: false,
      });

      return ok(undefined);
    },

    unregisterChild(childUrn: URN): Result<void, SupervisionError> {
      if (!children.has(childUrn)) {
        return err({ type: 'CHILD_NOT_FOUND', urn: childUrn });
      }

      children.delete(childUrn);
      return ok(undefined);
    },

    async notifyError(
      childUrn: URN,
      error: unknown
    ): Promise<Result<void, SupervisionError>> {
      const child = children.get(childUrn);
      if (!child) {
        return err({ type: 'CHILD_NOT_FOUND', urn: childUrn });
      }

      const strategy = child.info.strategy ?? defaultStrategy;

      switch (strategy) {
        case 'restart':
          return handleRestart(childUrn, error);

        case 'stop':
          return handleStop(childUrn, error);

        case 'escalate':
          return handleEscalate(childUrn, error);
      }
    },

    size(): number {
      return children.size;
    },

    getRetryCount(childUrn: URN): number | undefined {
      return children.get(childUrn)?.retryCount;
    },

    isRestarting(childUrn: URN): boolean {
      return children.get(childUrn)?.isRestarting ?? false;
    },
  };
}
