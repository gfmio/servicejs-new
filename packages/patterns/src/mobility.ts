/**
 * Actor Mobility
 *
 * Enables component migration between locations/processes.
 * Components can be serialized, transferred, and rehydrated while maintaining their state.
 *
 * Key capabilities:
 * - State serialization/deserialization
 * - Component checkpointing
 * - Live migration with message redirection
 * - Hot code upgrade
 *
 * Use cases:
 * - Load balancing
 * - Fault tolerance (move to healthy node)
 * - Maintenance (drain nodes)
 * - Geographic distribution
 */

import { type Result, ok, err, isErr } from '@servicejs/result';
import { type Option, none } from '@servicejs/option';

// ============================================================================
// Types
// ============================================================================

/**
 * Serialized component state
 */
export interface SerializedState<TState = unknown> {
  /** The component's state */
  readonly state: TState;

  /** State version for compatibility checks */
  readonly version: number;

  /** When the state was serialized */
  readonly timestamp: number;

  /** Component URN */
  readonly urn: string;

  /** Optional metadata */
  readonly metadata?: SerializedStateMetadata;
}

/**
 * Metadata about serialized state
 */
export interface SerializedStateMetadata {
  /** Source location/node */
  sourceNode?: string;

  /** Reason for serialization */
  reason?: 'checkpoint' | 'migration' | 'upgrade' | 'backup';

  /** Serialization format version */
  formatVersion?: string;

  /** Additional context */
  [key: string]: unknown;
}

/**
 * A component that can be serialized and migrated
 */
export interface MobileComponent<TState, TMsg> {
  /** Current state (can be getter) */
  state: TState;

  /** Component URN */
  readonly urn: string;

  /**
   * Serialize the component's state
   */
  serialize(): Result<SerializedState<TState>, Error>;

  /**
   * Handle incoming messages
   */
  send(message: TMsg): void;
}

/**
 * Factory for creating mobile components from serialized state
 */
export interface MobileComponentFactory<TState, TMsg> {
  /**
   * Deserialize and create a component from serialized state
   */
  deserialize(serialized: SerializedState<TState>): Result<MobileComponent<TState, TMsg>, Error>;
}

/**
 * Manages component migration between locations
 */
export interface MigrationManager {
  /**
   * Initiate migration of a component
   *
   * @param urn - Component to migrate
   * @param destination - Target location
   * @returns Migration handle for tracking progress
   */
  migrate(urn: string, destination: string): Promise<Result<MigrationHandle, Error>>;

  /**
   * Cancel an in-progress migration
   */
  cancel(migrationId: string): Promise<Result<void, Error>>;

  /**
   * Get migration status
   */
  getStatus(migrationId: string): Promise<Result<MigrationStatus, Error>>;
}

/**
 * Handle for tracking migration progress
 */
export interface MigrationHandle {
  /** Unique migration ID */
  readonly id: string;

  /** Component being migrated */
  readonly urn: string;

  /** Source location */
  readonly source: string;

  /** Destination location */
  readonly destination: string;

  /** When migration started */
  readonly startedAt: number;

  /**
   * Wait for migration to complete
   */
  wait(): Promise<Result<void, Error>>;
}

/**
 * Migration status
 */
export type MigrationStatus =
  | { readonly type: 'pending'; readonly progress?: number }
  | { readonly type: 'serializing' }
  | { readonly type: 'transferring'; readonly bytesTransferred?: number; readonly totalBytes?: number }
  | { readonly type: 'deserializing' }
  | { readonly type: 'redirecting' }
  | { readonly type: 'completed'; readonly completedAt: number }
  | { readonly type: 'failed'; readonly error: Error; readonly failedAt: number }
  | { readonly type: 'cancelled'; readonly cancelledAt: number };

// ============================================================================
// Serialization Helpers
// ============================================================================

/**
 * Create serialized state
 *
 * @example
 * ```typescript
 * const serialized = createSerializedState(
 *   { count: 42 },
 *   1,
 *   'urn:counter:1',
 *   { reason: 'checkpoint' }
 * );
 * ```
 */
export const createSerializedState = <TState>(
  state: TState,
  version: number,
  urn: string,
  metadata?: SerializedStateMetadata
): SerializedState<TState> => ({
  state,
  version,
  timestamp: Date.now(),
  urn,
  ...(metadata !== undefined ? { metadata } : {}),
});

/**
 * Validate serialized state format and version
 *
 * @example
 * ```typescript
 * const validation = validateSerializedState(serialized, 1);
 * if (isErr(validation)) {
 *   console.error('Invalid state:', validation.error);
 * }
 * ```
 */
export const validateSerializedState = <TState>(
  serialized: SerializedState<TState>,
  expectedVersion: number
): Result<void, Error> => {
  // Check version compatibility
  if (serialized.version !== expectedVersion) {
    return err(
      new Error(
        `Version mismatch: expected ${expectedVersion}, got ${serialized.version}`
      )
    );
  }

  // Check timestamp is reasonable
  const now = Date.now();
  if (serialized.timestamp > now) {
    return err(new Error('Serialized state has future timestamp'));
  }

  // Check URN format
  if (!serialized.urn || !serialized.urn.startsWith('urn:')) {
    return err(new Error('Invalid URN format'));
  }

  return ok(undefined);
};

/**
 * Clone serialized state (deep copy)
 *
 * Useful for creating checkpoints without referencing original state.
 */
export const cloneSerializedState = <TState>(
  serialized: SerializedState<TState>
): Result<SerializedState<TState>, Error> => {
  try {
    // Use JSON round-trip for deep cloning
    // Note: This won't work for non-JSON-serializable data (functions, symbols, etc.)
    const cloned = JSON.parse(JSON.stringify(serialized)) as SerializedState<TState>;
    return ok(cloned);
  } catch (error) {
    return err(
      error instanceof Error
        ? error
        : new Error('Failed to clone serialized state')
    );
  }
};

// ============================================================================
// In-Memory Migration Manager
// ============================================================================

interface MigrationRecord {
  handle: MigrationHandle;
  status: MigrationStatus;
  serialized: Option<SerializedState<unknown>>;
  waiters: Array<(result: Result<void, Error>) => void>;
}

/**
 * Create an in-memory migration manager (for testing/single-process)
 *
 * @example
 * ```typescript
 * const manager = createInMemoryMigrationManager();
 *
 * const migrationResult = await manager.migrate(
 *   'urn:user:123',
 *   'node-2'
 * );
 *
 * if (isOk(migrationResult)) {
 *   const handle = migrationResult.value;
 *   await handle.wait();
 * }
 * ```
 */
export const createInMemoryMigrationManager = (): MigrationManager => {
  const migrations = new Map<string, MigrationRecord>();
  let nextId = 1;

  return {
    async migrate(urn: string, destination: string): Promise<Result<MigrationHandle, Error>> {
      const id = `migration-${nextId++}`;

      const handle: MigrationHandle = {
        id,
        urn,
        source: 'local',
        destination,
        startedAt: Date.now(),
        wait: async () => {
          const record = migrations.get(id);
          if (!record) {
            return err(new Error('Migration not found'));
          }

          // If already completed or failed, return immediately
          if (record.status.type === 'completed') {
            return ok(undefined);
          }
          if (record.status.type === 'failed') {
            return err(record.status.error);
          }
          if (record.status.type === 'cancelled') {
            return err(new Error('Migration was cancelled'));
          }

          // Otherwise, wait for completion
          return new Promise<Result<void, Error>>((resolve) => {
            record.waiters.push(resolve);
          });
        },
      };

      const record: MigrationRecord = {
        handle,
        status: { type: 'pending' },
        serialized: none(),
        waiters: [],
      };

      migrations.set(id, record);

      // Simulate async migration process
      (async () => {
        try {
          // Serializing phase
          record.status = { type: 'serializing' };
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Transferring phase
          record.status = { type: 'transferring' };
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Deserializing phase
          record.status = { type: 'deserializing' };
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Redirecting phase
          record.status = { type: 'redirecting' };
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Completed
          record.status = { type: 'completed', completedAt: Date.now() };

          // Notify waiters
          for (const waiter of record.waiters) {
            waiter(ok(undefined));
          }
          record.waiters = [];
        } catch (error) {
          record.status = {
            type: 'failed',
            error: error instanceof Error ? error : new Error(String(error)),
            failedAt: Date.now(),
          };

          // Notify waiters
          const error_ =
            error instanceof Error ? error : new Error(String(error));
          for (const waiter of record.waiters) {
            waiter(err(error_));
          }
          record.waiters = [];
        }
      })();

      return ok(handle);
    },

    async cancel(migrationId: string): Promise<Result<void, Error>> {
      const record = migrations.get(migrationId);
      if (!record) {
        return err(new Error('Migration not found'));
      }

      // Can only cancel pending/in-progress migrations
      if (
        record.status.type === 'completed' ||
        record.status.type === 'failed' ||
        record.status.type === 'cancelled'
      ) {
        return err(new Error(`Cannot cancel migration in state: ${record.status.type}`));
      }

      record.status = { type: 'cancelled', cancelledAt: Date.now() };

      // Notify waiters
      for (const waiter of record.waiters) {
        waiter(err(new Error('Migration was cancelled')));
      }
      record.waiters = [];

      return ok(undefined);
    },

    async getStatus(migrationId: string): Promise<Result<MigrationStatus, Error>> {
      const record = migrations.get(migrationId);
      if (!record) {
        return err(new Error('Migration not found'));
      }

      return ok(record.status);
    },
  };
};

// ============================================================================
// Mobile Component Factory
// ============================================================================

/**
 * Create a factory for mobile components
 *
 * @example
 * ```typescript
 * interface CounterState { count: number }
 * type CounterMsg = { type: 'increment' } | { type: 'get' };
 *
 * const factory = createMobileComponentFactory<CounterState, CounterMsg>(
 *   1, // state version
 *   (state, msg) => {
 *     // Handle messages
 *   }
 * );
 *
 * // Deserialize a component
 * const result = factory.deserialize(serialized);
 * ```
 */
export const createMobileComponentFactory = <TState, TMsg>(
  stateVersion: number,
  messageHandler: (state: TState, message: TMsg) => TState
): MobileComponentFactory<TState, TMsg> => {
  return {
    deserialize(
      serialized: SerializedState<TState>
    ): Result<MobileComponent<TState, TMsg>, Error> {
      // Validate state version
      const validation = validateSerializedState(serialized, stateVersion);
      if (isErr(validation)) {
        return err(validation.error);
      }

      // Create component
      let currentState = serialized.state;

      const component: MobileComponent<TState, TMsg> = {
        get state(): TState {
          return currentState;
        },
        urn: serialized.urn,

        serialize(): Result<SerializedState<TState>, Error> {
          return ok(
            createSerializedState(
              currentState,
              stateVersion,
              serialized.urn,
              { reason: 'checkpoint' }
            )
          );
        },

        send(message: TMsg): void {
          currentState = messageHandler(currentState, message);
        },
      };

      return ok(component);
    },
  };
};
