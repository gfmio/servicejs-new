import { describe, test, expect } from 'bun:test';
import {
  createInMemoryEventStore,
  createInMemorySnapshotStore,
  createEvent,
  createSnapshot,
  replayEvents,
  rebuildFromEventStore,
  rebuildWithSnapshot,
  type Event,
  type Projection,
} from '../src/event-sourcing';

describe('Event Sourcing', () => {
  describe('Event Store', () => {
    test('appends events', async () => {
      const store = createInMemoryEventStore();

      const event = createEvent('UserCreated', { name: 'Alice' }, 'user-1', 'User', 1);

      const result = await store.append('user-1', [event], 0);

      expect(result.isOk()).toBe(true);
    });

    test('retrieves events', async () => {
      const store = createInMemoryEventStore();

      const event1 = createEvent('UserCreated', { name: 'Alice' }, 'user-1', 'User', 1);
      const event2 = createEvent('UserUpdated', { name: 'Alice Smith' }, 'user-1', 'User', 2);

      await store.append('user-1', [event1, event2], 0);

      const result = await store.getEvents('user-1');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.type).toBe('UserCreated');
        expect(result.value[1]?.type).toBe('UserUpdated');
      }
    });

    test('enforces optimistic concurrency', async () => {
      const store = createInMemoryEventStore();

      const event1 = createEvent('UserCreated', { name: 'Alice' }, 'user-1', 'User', 1);
      await store.append('user-1', [event1], 0);

      // Try to append with wrong expected version
      const event2 = createEvent('UserUpdated', { name: 'Bob' }, 'user-1', 'User', 2);
      const result = await store.append('user-1', [event2], 0);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Concurrency conflict');
      }
    });

    test('gets events since version', async () => {
      const store = createInMemoryEventStore();

      const events = [
        createEvent('Event1', {}, 'agg-1', 'Agg', 1),
        createEvent('Event2', {}, 'agg-1', 'Agg', 2),
        createEvent('Event3', {}, 'agg-1', 'Agg', 3),
        createEvent('Event4', {}, 'agg-1', 'Agg', 4),
      ];

      await store.append('agg-1', events, 0);

      const result = await store.getEventsSince('agg-1', 2);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.type).toBe('Event3');
        expect(result.value[1]?.type).toBe('Event4');
      }
    });

    test('gets events by type', async () => {
      const store = createInMemoryEventStore();

      await store.append('user-1', [
        createEvent('UserCreated', { name: 'Alice' }, 'user-1', 'User', 1),
      ], 0);

      await store.append('user-2', [
        createEvent('UserCreated', { name: 'Bob' }, 'user-2', 'User', 1),
      ], 0);

      await store.append('order-1', [
        createEvent('OrderCreated', { total: 100 }, 'order-1', 'Order', 1),
      ], 0);

      const result = await store.getEventsByType('UserCreated');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.data.name).toBe('Alice');
        expect(result.value[1]?.data.name).toBe('Bob');
      }
    });
  });

  describe('Snapshot Store', () => {
    test('saves and retrieves snapshots', async () => {
      const store = createInMemorySnapshotStore<{ count: number }>();

      const snapshot = createSnapshot('agg-1', { count: 42 }, 10);

      await store.save(snapshot);

      const result = await store.get('agg-1');

      expect(result.isOk()).toBe(true);
      if (result.isOk() && result.value.isSome()) {
        expect(result.value.value.state.count).toBe(42);
        expect(result.value.value.version).toBe(10);
      }
    });

    test('returns None for non-existent aggregate', async () => {
      const store = createInMemorySnapshotStore<{ count: number }>();

      const result = await store.get('non-existent');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.isNone()).toBe(true);
      }
    });
  });

  describe('Event Replay', () => {
    test('replays events to rebuild state', async () => {
      interface CounterState {
        count: number;
      }

      const initialState: CounterState = { count: 0 };

      const events = [
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 1),
        createEvent('Incremented', { amount: 5 }, 'counter-1', 'Counter', 2),
        createEvent('Decremented', { amount: 2 }, 'counter-1', 'Counter', 3),
      ];

      const apply = (state: CounterState, event: Event): CounterState => {
        if (event.type === 'Incremented') {
          return { count: state.count + (event.data as { amount: number }).amount };
        }
        if (event.type === 'Decremented') {
          return { count: state.count - (event.data as { amount: number }).amount };
        }
        return state;
      };

      const finalState = await replayEvents(initialState, events, apply);

      expect(finalState.count).toBe(4); // 0 + 1 + 5 - 2 = 4
    });

    test('rebuilds from event store', async () => {
      const store = createInMemoryEventStore();

      const events = [
        createEvent('Created', { name: 'Alice' }, 'user-1', 'User', 1),
        createEvent('Renamed', { name: 'Alice Smith' }, 'user-1', 'User', 2),
      ];

      await store.append('user-1', events, 0);

      interface UserState {
        name: string;
      }

      const result = await rebuildFromEventStore(
        store,
        'user-1',
        { name: '' },
        (state: UserState, event: Event): UserState => {
          if (event.type === 'Created') {
            return { name: (event.data as { name: string }).name };
          }
          if (event.type === 'Renamed') {
            return { name: (event.data as { name: string }).name };
          }
          return state;
        }
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe('Alice Smith');
      }
    });

    test('rebuilds with snapshot optimization', async () => {
      const eventStore = createInMemoryEventStore();
      const snapshotStore = createInMemorySnapshotStore<{ count: number }>();

      // Add events 1-5
      await eventStore.append('counter-1', [
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 1),
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 2),
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 3),
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 4),
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 5),
      ], 0);

      // Save snapshot at version 5 (count = 5)
      await snapshotStore.save(createSnapshot('counter-1', { count: 5 }, 5));

      // Add more events after snapshot
      await eventStore.append('counter-1', [
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 6),
        createEvent('Incremented', { amount: 1 }, 'counter-1', 'Counter', 7),
      ], 5);

      const apply = (state: { count: number }, event: Event) => {
        if (event.type === 'Incremented') {
          return { count: state.count + (event.data as { amount: number }).amount };
        }
        return state;
      };

      const result = await rebuildWithSnapshot(
        eventStore,
        snapshotStore,
        'counter-1',
        { count: 0 },
        apply
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should be 5 (snapshot) + 1 + 1 = 7
        expect(result.value.count).toBe(7);
      }
    });

    test('rebuilds without snapshot when none exists', async () => {
      const eventStore = createInMemoryEventStore();
      const snapshotStore = createInMemorySnapshotStore<{ count: number }>();

      await eventStore.append('counter-1', [
        createEvent('Incremented', { amount: 3 }, 'counter-1', 'Counter', 1),
      ], 0);

      const apply = (state: { count: number }, event: Event) => {
        if (event.type === 'Incremented') {
          return { count: state.count + (event.data as { amount: number }).amount };
        }
        return state;
      };

      const result = await rebuildWithSnapshot(
        eventStore,
        snapshotStore,
        'counter-1',
        { count: 0 },
        apply
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.count).toBe(3);
      }
    });
  });

  describe('Helper Functions', () => {
    test('createEvent creates an event with all fields', () => {
      const event = createEvent(
        'UserCreated',
        { name: 'Alice', email: 'alice@example.com' },
        'user-123',
        'User',
        1,
        { userId: 'admin-1' }
      );

      expect(event.type).toBe('UserCreated');
      expect(event.data).toEqual({ name: 'Alice', email: 'alice@example.com' });
      expect(event.aggregateId).toBe('user-123');
      expect(event.aggregateType).toBe('User');
      expect(event.version).toBe(1);
      expect(event.metadata?.userId).toBe('admin-1');
      expect(event.timestamp).toBeNumber();
    });

    test('createEvent works without metadata', () => {
      const event = createEvent('UserCreated', { name: 'Alice' }, 'user-1', 'User', 1);

      expect(event.metadata).toBeUndefined();
    });

    test('createSnapshot creates a snapshot', () => {
      const snapshot = createSnapshot('agg-1', { value: 42 }, 10);

      expect(snapshot.aggregateId).toBe('agg-1');
      expect(snapshot.state).toEqual({ value: 42 });
      expect(snapshot.version).toBe(10);
      expect(snapshot.timestamp).toBeNumber();
    });
  });

  describe('Real-World Example: Bank Account', () => {
    interface AccountState {
      balance: number;
      transactions: Array<{ type: string; amount: number; timestamp: number }>;
    }

    test('event-sourced bank account', async () => {
      const store = createInMemoryEventStore();
      const accountId = 'account-123';

      // Open account
      await store.append(accountId, [
        createEvent('AccountOpened', { initialBalance: 100 }, accountId, 'Account', 1),
      ], 0);

      // Deposit money
      await store.append(accountId, [
        createEvent('MoneyDeposited', { amount: 50 }, accountId, 'Account', 2),
      ], 1);

      // Withdraw money
      await store.append(accountId, [
        createEvent('MoneyWithdrawn', { amount: 30 }, accountId, 'Account', 3),
      ], 2);

      // Rebuild state from events
      const initialState: AccountState = {
        balance: 0,
        transactions: [],
      };

      const apply = (state: AccountState, event: Event): AccountState => {
        const timestamp = event.timestamp;

        if (event.type === 'AccountOpened') {
          const { initialBalance } = event.data as { initialBalance: number };
          return {
            balance: initialBalance,
            transactions: [{ type: 'opened', amount: initialBalance, timestamp }],
          };
        }

        if (event.type === 'MoneyDeposited') {
          const { amount } = event.data as { amount: number };
          return {
            balance: state.balance + amount,
            transactions: [
              ...state.transactions,
              { type: 'deposit', amount, timestamp },
            ],
          };
        }

        if (event.type === 'MoneyWithdrawn') {
          const { amount } = event.data as { amount: number };
          return {
            balance: state.balance - amount,
            transactions: [
              ...state.transactions,
              { type: 'withdrawal', amount, timestamp },
            ],
          };
        }

        return state;
      };

      const result = await rebuildFromEventStore(store, accountId, initialState, apply);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const account = result.value;

        // Final balance: 100 + 50 - 30 = 120
        expect(account.balance).toBe(120);

        // Should have 3 transactions
        expect(account.transactions).toHaveLength(3);
        expect(account.transactions[0]?.type).toBe('opened');
        expect(account.transactions[1]?.type).toBe('deposit');
        expect(account.transactions[2]?.type).toBe('withdrawal');
      }
    });
  });
});
