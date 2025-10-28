/**
 * Event Sourcing Helpers
 *
 * Event sourcing stores all changes to application state as a sequence of events.
 * Instead of storing just the current state, we store all events that led to that state.
 *
 * Benefits:
 * - Complete audit trail
 * - Time travel / replay
 * - Multiple projections from same events
 * - Event-driven architecture
 */

import { type Result, ok, err, isOk, isErr } from '@servicejs/result';
import { type Option, some, none, isSome } from '@servicejs/option';

// ============================================================================
// Types
// ============================================================================

/**
 * An event represents something that happened in the past
 */
export interface Event<TType extends string = string, TData = unknown> {
  /** Event type */
  readonly type: TType;

  /** Event data */
  readonly data: TData;

  /** When the event occurred */
  readonly timestamp: number;

  /** Aggregate ID this event belongs to */
  readonly aggregateId: string;

  /** Aggregate type */
  readonly aggregateType: string;

  /** Event version/sequence number */
  readonly version: number;

  /** Optional metadata */
  readonly metadata?: EventMetadata;
}

/**
 * Event metadata for tracing and correlation
 */
export interface EventMetadata {
  /** Who caused this event */
  userId?: string;

  /** Correlation ID for tracing */
  correlationId?: string;

  /** Causation ID (event that caused this event) */
  causationId?: string;

  /** Additional context */
  [key: string]: unknown;
}

/**
 * Event store interface
 */
export interface EventStore {
  /**
   * Append events to the store
   */
  append(aggregateId: string, events: Event[], expectedVersion: number): Promise<Result<void, Error>>;

  /**
   * Get all events for an aggregate
   */
  getEvents(aggregateId: string): Promise<Result<Event[], Error>>;

  /**
   * Get events for an aggregate since a specific version
   */
  getEventsSince(aggregateId: string, version: number): Promise<Result<Event[], Error>>;

  /**
   * Get all events of a specific type
   */
  getEventsByType(eventType: string): Promise<Result<Event[], Error>>;
}

/**
 * Snapshot of aggregate state at a specific version
 */
export interface Snapshot<TState> {
  /** Aggregate ID */
  readonly aggregateId: string;

  /** State at this version */
  readonly state: TState;

  /** Version this snapshot represents */
  readonly version: number;

  /** When the snapshot was created */
  readonly timestamp: number;
}

/**
 * Snapshot store for performance optimization
 */
export interface SnapshotStore<TState> {
  /**
   * Save a snapshot
   */
  save(snapshot: Snapshot<TState>): Promise<Result<void, Error>>;

  /**
   * Get the latest snapshot for an aggregate
   */
  get(aggregateId: string): Promise<Result<Option<Snapshot<TState>>, Error>>;
}

/**
 * Projection builds a read model from events
 */
export interface Projection<TState> {
  /** Projection name */
  readonly name: string;

  /** Initial state */
  readonly initialState: TState;

  /**
   * Apply an event to the state
   */
  apply(state: TState, event: Event): TState;

  /**
   * Check if this projection handles this event type
   */
  handles(eventType: string): boolean;
}

// ============================================================================
// In-Memory Event Store
// ============================================================================

/**
 * Create an in-memory event store (for testing/development)
 *
 * @example
 * ```typescript
 * const store = createInMemoryEventStore();
 *
 * await store.append('user-123', [
 *   createEvent('UserCreated', { name: 'Alice' }, 'user-123', 'User', 1)
 * ], 0);
 *
 * const events = await store.getEvents('user-123');
 * ```
 */
export const createInMemoryEventStore = (): EventStore => {
  const events = new Map<string, Event[]>();

  return {
    async append(aggregateId: string, newEvents: Event[], expectedVersion: number): Promise<Result<void, Error>> {
      const existing = events.get(aggregateId) || [];
      const currentVersion = existing.length;

      // Optimistic concurrency check
      if (currentVersion !== expectedVersion) {
        return err(new Error(
          `Concurrency conflict: expected version ${expectedVersion}, got ${currentVersion}`
        ));
      }

      events.set(aggregateId, [...existing, ...newEvents]);
      return ok(undefined);
    },

    async getEvents(aggregateId: string): Promise<Result<Event[], Error>> {
      const result = events.get(aggregateId) || [];
      return ok(result);
    },

    async getEventsSince(aggregateId: string, version: number): Promise<Result<Event[], Error>> {
      const allEvents = events.get(aggregateId) || [];
      const filtered = allEvents.filter(e => e.version > version);
      return ok(filtered);
    },

    async getEventsByType(eventType: string): Promise<Result<Event[], Error>> {
      const result: Event[] = [];
      for (const aggregateEvents of events.values()) {
        result.push(...aggregateEvents.filter(e => e.type === eventType));
      }
      return ok(result);
    },
  };
};

// ============================================================================
// In-Memory Snapshot Store
// ============================================================================

/**
 * Create an in-memory snapshot store (for testing/development)
 */
export const createInMemorySnapshotStore = <TState>(): SnapshotStore<TState> => {
  const snapshots = new Map<string, Snapshot<TState>>();

  return {
    async save(snapshot: Snapshot<TState>): Promise<Result<void, Error>> {
      snapshots.set(snapshot.aggregateId, snapshot);
      return ok(undefined);
    },

    async get(aggregateId: string): Promise<Result<Option<Snapshot<TState>>, Error>> {
      const snapshot = snapshots.get(aggregateId);
      return ok(snapshot ? some(snapshot) : none());
    },
  };
};

// ============================================================================
// Event Replay and Projection
// ============================================================================

/**
 * Rebuild state by replaying events
 *
 * @example
 * ```typescript
 * const initialState = { count: 0 };
 * const events = [
 *   createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 1),
 *   createEvent('Incremented', { amount: 2 }, 'counter-1', 'Counter', 2),
 * ];
 *
 * const state = await replayEvents(initialState, events, (state, event) => {
 *   if (event.type === 'Incremented') {
 *     return { count: state.count + event.data.amount };
 *   }
 *   return state;
 * });
 * ```
 */
export const replayEvents = async <TState>(
  initialState: TState,
  events: Event[],
  apply: (state: TState, event: Event) => TState
): Promise<TState> => {
  let state = initialState;

  for (const event of events) {
    state = apply(state, event);
  }

  return state;
};

/**
 * Rebuild state from event store
 *
 * @example
 * ```typescript
 * const state = await rebuildFromEventStore(
 *   store,
 *   'user-123',
 *   { name: '', email: '' },
 *   (state, event) => {
 *     // Apply event to state
 *     return state;
 *   }
 * );
 * ```
 */
export const rebuildFromEventStore = async <TState>(
  store: EventStore,
  aggregateId: string,
  initialState: TState,
  apply: (state: TState, event: Event) => TState
): Promise<Result<TState, Error>> => {
  const eventsResult = await store.getEvents(aggregateId);

  if (isErr(eventsResult)) {
    return err(eventsResult.error);
  }

  if (!isOk(eventsResult)) {
    throw new Error('Unexpected: eventsResult should be Ok');
  }

  const state = await replayEvents(initialState, eventsResult.value, apply);
  return ok(state);
};

/**
 * Rebuild state with snapshot optimization
 *
 * Loads the latest snapshot and replays only events since that snapshot.
 */
export const rebuildWithSnapshot = async <TState>(
  store: EventStore,
  snapshotStore: SnapshotStore<TState>,
  aggregateId: string,
  initialState: TState,
  apply: (state: TState, event: Event) => TState
): Promise<Result<TState, Error>> => {
  // Try to get snapshot
  const snapshotResult = await snapshotStore.get(aggregateId);

  if (isErr(snapshotResult)) {
    return err(snapshotResult.error);
  }

  if (!isOk(snapshotResult)) {
    throw new Error('Unexpected: snapshotResult should be Ok');
  }

  const snapshot = snapshotResult.value;

  // Start from snapshot if available, otherwise from initial state
  let state: TState;
  let version: number;

  if (isSome(snapshot)) {
    const snapshotValue = snapshot.value as Snapshot<TState>;
    state = snapshotValue.state;
    version = snapshotValue.version;
  } else {
    state = initialState;
    version = 0;
  }

  // Get events since snapshot
  const eventsResult = await store.getEventsSince(aggregateId, version);

  if (isErr(eventsResult)) {
    return err(eventsResult.error);
  }

  if (!isOk(eventsResult)) {
    throw new Error('Unexpected: eventsResult should be Ok');
  }

  // Replay events
  state = await replayEvents(state, eventsResult.value, apply);

  return ok(state);
};

/**
 * Build a projection from events
 *
 * @example
 * ```typescript
 * const projection: Projection<UserListState> = {
 *   name: 'UserList',
 *   initialState: { users: [] },
 *   apply: (state, event) => {
 *     if (event.type === 'UserCreated') {
 *       return { users: [...state.users, event.data] };
 *     }
 *     return state;
 *   },
 *   handles: (type) => type === 'UserCreated' || type === 'UserDeleted'
 * };
 *
 * const state = await buildProjection(store, projection);
 * ```
 */
export const buildProjection = async <TState>(
  _store: EventStore,
  projection: Projection<TState>
): Promise<Result<TState, Error>> => {
  // Get all events (in real impl, would stream events)
  let state = projection.initialState;

  // For each event type this projection handles, get and apply events
  // Note: This is simplified - real implementation would stream all events
  // and filter, or maintain a projection-specific event log

  // For now, we'll need to implement a getAllEvents method or similar
  // This is a limitation of the simple interface

  return ok(state);
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an event
 */
export const createEvent = <TType extends string, TData>(
  type: TType,
  data: TData,
  aggregateId: string,
  aggregateType: string,
  version: number,
  metadata?: EventMetadata
): Event<TType, TData> => ({
  type,
  data,
  timestamp: Date.now(),
  aggregateId,
  aggregateType,
  version,
  ...(metadata !== undefined ? { metadata } : {}),
});

/**
 * Create a snapshot
 */
export const createSnapshot = <TState>(
  aggregateId: string,
  state: TState,
  version: number
): Snapshot<TState> => ({
  aggregateId,
  state,
  version,
  timestamp: Date.now(),
});
