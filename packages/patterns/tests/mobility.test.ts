import { describe, test, expect } from 'bun:test';
import {
  createSerializedState,
  validateSerializedState,
  cloneSerializedState,
  createInMemoryMigrationManager,
  createMobileComponentFactory,
  type SerializedState,
  type MobileComponent,
} from '../src/mobility';
import { isOk, isErr } from '@servicejs/result';

describe('Actor Mobility', () => {
  describe('Serialized State', () => {
    test('creates serialized state', () => {
      const state = { count: 42 };
      const serialized = createSerializedState(state, 1, 'urn:counter:1');

      expect(serialized.state).toEqual({ count: 42 });
      expect(serialized.version).toBe(1);
      expect(serialized.urn).toBe('urn:counter:1');
      expect(serialized.timestamp).toBeNumber();
    });

    test('includes metadata when provided', () => {
      const state = { count: 42 };
      const metadata = { reason: 'checkpoint' as const, sourceNode: 'node-1' };
      const serialized = createSerializedState(state, 1, 'urn:counter:1', metadata);

      expect(serialized.metadata).toEqual(metadata);
    });

    test('validates serialized state version', () => {
      const serialized = createSerializedState({ count: 42 }, 1, 'urn:counter:1');

      const validation = validateSerializedState(serialized, 1);

      expect(isOk(validation)).toBe(true);
    });

    test('rejects version mismatch', () => {
      const serialized = createSerializedState({ count: 42 }, 1, 'urn:counter:1');

      const validation = validateSerializedState(serialized, 2);

      expect(isErr(validation)).toBe(true);
      if (isErr(validation)) {
        expect(validation.error.message).toContain('Version mismatch');
      }
    });

    test('rejects invalid URN format', () => {
      const serialized = {
        state: { count: 42 },
        version: 1,
        timestamp: Date.now(),
        urn: 'invalid-urn',
      };

      const validation = validateSerializedState(serialized, 1);

      expect(isErr(validation)).toBe(true);
      if (isErr(validation)) {
        expect(validation.error.message).toContain('Invalid URN format');
      }
    });

    test('rejects future timestamp', () => {
      const serialized = {
        state: { count: 42 },
        version: 1,
        timestamp: Date.now() + 100000,
        urn: 'urn:counter:1',
      };

      const validation = validateSerializedState(serialized, 1);

      expect(isErr(validation)).toBe(true);
      if (isErr(validation)) {
        expect(validation.error.message).toContain('future timestamp');
      }
    });

    test('clones serialized state', () => {
      const original = createSerializedState({ count: 42 }, 1, 'urn:counter:1');

      const result = cloneSerializedState(original);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const cloned = result.value;
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original); // Different object reference
        expect(cloned.state).not.toBe(original.state); // Deep clone
      }
    });
  });

  describe('Mobile Component Factory', () => {
    interface CounterState {
      count: number;
    }

    type CounterMessage =
      | { type: 'increment'; amount: number }
      | { type: 'decrement'; amount: number }
      | { type: 'reset' };

    test('deserializes component from serialized state', () => {
      const factory = createMobileComponentFactory<CounterState, CounterMessage>(
        1,
        (state, msg) => {
          if (msg.type === 'increment') {
            return { count: state.count + msg.amount };
          }
          if (msg.type === 'decrement') {
            return { count: state.count - msg.amount };
          }
          if (msg.type === 'reset') {
            return { count: 0 };
          }
          return state;
        }
      );

      const serialized = createSerializedState({ count: 42 }, 1, 'urn:counter:1');

      const result = factory.deserialize(serialized);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const component = result.value;
        expect(component.state.count).toBe(42);
        expect(component.urn).toBe('urn:counter:1');
      }
    });

    test('deserialized component handles messages', () => {
      const factory = createMobileComponentFactory<CounterState, CounterMessage>(
        1,
        (state, msg) => {
          if (msg.type === 'increment') {
            return { count: state.count + msg.amount };
          }
          return state;
        }
      );

      const serialized = createSerializedState({ count: 10 }, 1, 'urn:counter:1');
      const result = factory.deserialize(serialized);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const component = result.value;

        component.send({ type: 'increment', amount: 5 });

        expect(component.state.count).toBe(15);
      }
    });

    test('deserialized component can be re-serialized', () => {
      const factory = createMobileComponentFactory<CounterState, CounterMessage>(
        1,
        (state, msg) => {
          if (msg.type === 'increment') {
            return { count: state.count + msg.amount };
          }
          return state;
        }
      );

      const serialized = createSerializedState({ count: 10 }, 1, 'urn:counter:1');
      const result = factory.deserialize(serialized);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const component = result.value;

        component.send({ type: 'increment', amount: 5 });

        const reserializedResult = component.serialize();

        expect(isOk(reserializedResult)).toBe(true);
        if (isOk(reserializedResult)) {
          const reserialized = reserializedResult.value;
          expect(reserialized.state.count).toBe(15);
          expect(reserialized.urn).toBe('urn:counter:1');
          expect(reserialized.version).toBe(1);
        }
      }
    });

    test('rejects version mismatch on deserialization', () => {
      const factory = createMobileComponentFactory<CounterState, CounterMessage>(
        2, // Expecting version 2
        (state, _msg) => state
      );

      const serialized = createSerializedState({ count: 42 }, 1, 'urn:counter:1'); // Version 1

      const result = factory.deserialize(serialized);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Version mismatch');
      }
    });
  });

  describe('Migration Manager', () => {
    test('initiates migration', async () => {
      const manager = createInMemoryMigrationManager();

      const result = await manager.migrate('urn:user:123', 'node-2');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const handle = result.value;
        expect(handle.urn).toBe('urn:user:123');
        expect(handle.destination).toBe('node-2');
        expect(handle.startedAt).toBeNumber();
      }
    });

    test('waits for migration to complete', async () => {
      const manager = createInMemoryMigrationManager();

      const migrateResult = await manager.migrate('urn:user:123', 'node-2');

      expect(isOk(migrateResult)).toBe(true);
      if (isOk(migrateResult)) {
        const handle = migrateResult.value;

        const waitResult = await handle.wait();

        expect(isOk(waitResult)).toBe(true);
      }
    });

    test('tracks migration status', async () => {
      const manager = createInMemoryMigrationManager();

      const migrateResult = await manager.migrate('urn:user:123', 'node-2');

      expect(isOk(migrateResult)).toBe(true);
      if (isOk(migrateResult)) {
        const handle = migrateResult.value;

        // Check initial status
        const statusResult = await manager.getStatus(handle.id);

        expect(isOk(statusResult)).toBe(true);
        if (isOk(statusResult)) {
          const status = statusResult.value;
          // Should be in progress or completed
          expect(['pending', 'serializing', 'transferring', 'deserializing', 'redirecting', 'completed']).toContain(status.type);
        }

        // Wait for completion
        await handle.wait();

        // Check final status
        const finalStatusResult = await manager.getStatus(handle.id);

        expect(isOk(finalStatusResult)).toBe(true);
        if (isOk(finalStatusResult)) {
          const status = finalStatusResult.value;
          expect(status.type).toBe('completed');
        }
      }
    });

    test('cancels migration', async () => {
      const manager = createInMemoryMigrationManager();

      const migrateResult = await manager.migrate('urn:user:123', 'node-2');

      expect(isOk(migrateResult)).toBe(true);
      if (isOk(migrateResult)) {
        const handle = migrateResult.value;

        // Cancel immediately (before it completes)
        const cancelResult = await manager.cancel(handle.id);

        // Cancel might succeed or fail depending on timing
        // If it succeeds, wait should return an error
        if (isOk(cancelResult)) {
          const waitResult = await handle.wait();
          expect(isErr(waitResult)).toBe(true);
        }
      }
    });

    test('returns error for non-existent migration', async () => {
      const manager = createInMemoryMigrationManager();

      const statusResult = await manager.getStatus('non-existent');

      expect(isErr(statusResult)).toBe(true);
      if (isErr(statusResult)) {
        expect(statusResult.error.message).toContain('not found');
      }
    });
  });

  describe('Complete Migration Workflow', () => {
    interface UserState {
      id: string;
      name: string;
      email: string;
    }

    type UserMessage =
      | { type: 'update_name'; name: string }
      | { type: 'update_email'; email: string };

    test('full migration lifecycle', async () => {
      // Create component
      const initialState: UserState = {
        id: 'user-123',
        name: 'Alice',
        email: 'alice@example.com',
      };

      const factory = createMobileComponentFactory<UserState, UserMessage>(
        1,
        (state, msg) => {
          if (msg.type === 'update_name') {
            return { ...state, name: msg.name };
          }
          if (msg.type === 'update_email') {
            return { ...state, email: msg.email };
          }
          return state;
        }
      );

      // Create initial serialized state
      const serialized = createSerializedState(initialState, 1, 'urn:user:123', {
        reason: 'checkpoint',
        sourceNode: 'node-1',
      });

      // Deserialize on source node
      const sourceResult = factory.deserialize(serialized);
      expect(isOk(sourceResult)).toBe(true);
      if (!isOk(sourceResult)) return;

      const sourceComponent = sourceResult.value;

      // Process some messages on source
      sourceComponent.send({ type: 'update_name', name: 'Alice Smith' });
      sourceComponent.send({ type: 'update_email', email: 'alice.smith@example.com' });

      expect(sourceComponent.state.name).toBe('Alice Smith');
      expect(sourceComponent.state.email).toBe('alice.smith@example.com');

      // Serialize for migration
      const migrateSerializedResult = sourceComponent.serialize();
      expect(isOk(migrateSerializedResult)).toBe(true);
      if (!isOk(migrateSerializedResult)) return;

      const migrateSerializedState = migrateSerializedResult.value;

      // Initiate migration
      const manager = createInMemoryMigrationManager();
      const migrateResult = await manager.migrate('urn:user:123', 'node-2');
      expect(isOk(migrateResult)).toBe(true);
      if (!isOk(migrateResult)) return;

      const handle = migrateResult.value;

      // Wait for migration
      const waitResult = await handle.wait();
      expect(isOk(waitResult)).toBe(true);

      // Deserialize on destination node
      const destResult = factory.deserialize(migrateSerializedState);
      expect(isOk(destResult)).toBe(true);
      if (!isOk(destResult)) return;

      const destComponent = destResult.value;

      // Verify state transferred correctly
      expect(destComponent.state.name).toBe('Alice Smith');
      expect(destComponent.state.email).toBe('alice.smith@example.com');

      // Process messages on destination
      destComponent.send({ type: 'update_name', name: 'Alice Jones' });

      expect(destComponent.state.name).toBe('Alice Jones');
    });
  });

  describe('Checkpointing', () => {
    interface GameState {
      level: number;
      score: number;
      health: number;
    }

    type GameMessage =
      | { type: 'score'; points: number }
      | { type: 'damage'; amount: number }
      | { type: 'level_up' };

    test('creates periodic checkpoints', () => {
      const factory = createMobileComponentFactory<GameState, GameMessage>(
        1,
        (state, msg) => {
          if (msg.type === 'score') {
            return { ...state, score: state.score + msg.points };
          }
          if (msg.type === 'damage') {
            return { ...state, health: Math.max(0, state.health - msg.amount) };
          }
          if (msg.type === 'level_up') {
            return { ...state, level: state.level + 1, health: 100 };
          }
          return state;
        }
      );

      const initialState: GameState = { level: 1, score: 0, health: 100 };
      const serialized = createSerializedState(initialState, 1, 'urn:game:1');

      const result = factory.deserialize(serialized);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const game = result.value;

      // Simulate gameplay
      game.send({ type: 'score', points: 100 });
      game.send({ type: 'score', points: 50 });

      // Create checkpoint
      const checkpoint1Result = game.serialize();
      expect(isOk(checkpoint1Result)).toBe(true);

      // Continue gameplay
      game.send({ type: 'damage', amount: 20 });
      game.send({ type: 'level_up' });

      // Create another checkpoint
      const checkpoint2Result = game.serialize();
      expect(isOk(checkpoint2Result)).toBe(true);

      if (isOk(checkpoint1Result) && isOk(checkpoint2Result)) {
        const checkpoint1 = checkpoint1Result.value;
        const checkpoint2 = checkpoint2Result.value;

        // Verify checkpoint progression
        expect(checkpoint1.state.score).toBe(150);
        expect(checkpoint1.state.health).toBe(100);
        expect(checkpoint1.state.level).toBe(1);

        expect(checkpoint2.state.score).toBe(150);
        expect(checkpoint2.state.health).toBe(100);
        expect(checkpoint2.state.level).toBe(2);
      }
    });

    test('restores from checkpoint', () => {
      const factory = createMobileComponentFactory<GameState, GameMessage>(
        1,
        (state, msg) => {
          if (msg.type === 'score') {
            return { ...state, score: state.score + msg.points };
          }
          if (msg.type === 'damage') {
            return { ...state, health: Math.max(0, state.health - msg.amount) };
          }
          return state;
        }
      );

      // Create checkpoint with healthy state
      const checkpoint = createSerializedState(
        { level: 5, score: 1000, health: 100 } as GameState,
        1,
        'urn:game:1'
      );

      // Restore from checkpoint
      const result = factory.deserialize(checkpoint);
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      const game = result.value;

      // Verify restored state
      expect(game.state.level).toBe(5);
      expect(game.state.score).toBe(1000);
      expect(game.state.health).toBe(100);
    });
  });
});
