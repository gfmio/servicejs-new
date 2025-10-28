import { describe, test, expect } from 'bun:test';
import {
  createCommandBus,
  createQueryBus,
  createCommand,
  createQuery,
  isCommand,
  isQuery,
  type Command,
  type Query,
  type CommandHandler,
  type QueryHandler,
} from '../src/cqrs';
import { ok, err } from '@servicejs/result';

describe('CQRS Pattern', () => {
  describe('Command Bus', () => {
    test('registers and dispatches commands', async () => {
      const bus = createCommandBus();
      let executed = false;

      bus.register('TestCommand', {
        handle: async () => {
          executed = true;
          return ok(undefined);
        },
      });

      const command = createCommand('TestCommand', { value: 42 });
      const result = await bus.dispatch(command);

      expect(result.isOk()).toBe(true);
      expect(executed).toBe(true);
    });

    test('returns error for unregistered command', async () => {
      const bus = createCommandBus();

      const command = createCommand('UnknownCommand', {});
      const result = await bus.dispatch(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('No handler registered');
      }
    });

    test('throws error when registering duplicate handler', () => {
      const bus = createCommandBus();

      const handler = {
        handle: async () => ok(undefined),
      };

      bus.register('TestCommand', handler);

      expect(() => {
        bus.register('TestCommand', handler);
      }).toThrow('already registered');
    });

    test('passes command data to handler', async () => {
      const bus = createCommandBus();
      let receivedData: unknown = null;

      bus.register('CreateUser', {
        handle: async (cmd) => {
          receivedData = cmd.data;
          return ok(undefined);
        },
      });

      const command = createCommand('CreateUser', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      await bus.dispatch(command);

      expect(receivedData).toEqual({
        name: 'Alice',
        email: 'alice@example.com',
      });
    });

    test('propagates handler errors', async () => {
      const bus = createCommandBus();

      bus.register('FailCommand', {
        handle: async () => {
          return err(new Error('Command failed'));
        },
      });

      const command = createCommand('FailCommand', {});
      const result = await bus.dispatch(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Command failed');
      }
    });

    test('catches handler exceptions', async () => {
      const bus = createCommandBus();

      bus.register('ThrowCommand', {
        handle: async () => {
          throw new Error('Unexpected error');
        },
      });

      const command = createCommand('ThrowCommand', {});
      const result = await bus.dispatch(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Unexpected error');
      }
    });

    test('returns command result', async () => {
      const bus = createCommandBus();

      bus.register('CreateUser', {
        handle: async (cmd) => {
          return ok({ id: '123', name: cmd.data.name });
        },
      });

      const command = createCommand('CreateUser', { name: 'Alice' });
      const result = await bus.dispatch<{ id: string; name: string }>(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ id: '123', name: 'Alice' });
      }
    });
  });

  describe('Query Bus', () => {
    test('registers and dispatches queries', async () => {
      const bus = createQueryBus();
      let executed = false;

      bus.register('TestQuery', {
        handle: async () => {
          executed = true;
          return ok({ data: 'test' });
        },
      });

      const query = createQuery('TestQuery', { id: '123' });
      const result = await bus.dispatch(query);

      expect(result.isOk()).toBe(true);
      expect(executed).toBe(true);
    });

    test('returns error for unregistered query', async () => {
      const bus = createQueryBus();

      const query = createQuery('UnknownQuery', {});
      const result = await bus.dispatch(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('No handler registered');
      }
    });

    test('throws error when registering duplicate handler', () => {
      const bus = createQueryBus();

      const handler = {
        handle: async () => ok({ data: 'test' }),
      };

      bus.register('TestQuery', handler);

      expect(() => {
        bus.register('TestQuery', handler);
      }).toThrow('already registered');
    });

    test('passes query params to handler', async () => {
      const bus = createQueryBus();
      let receivedParams: unknown = null;

      bus.register('GetUser', {
        handle: async (query) => {
          receivedParams = query.params;
          return ok({ id: query.params.id, name: 'Alice' });
        },
      });

      const query = createQuery('GetUser', { id: '123' });
      await bus.dispatch(query);

      expect(receivedParams).toEqual({ id: '123' });
    });

    test('returns query result', async () => {
      const bus = createQueryBus();

      bus.register('GetUser', {
        handle: async (query) => {
          return ok({ id: query.params.id, name: 'Alice', email: 'alice@example.com' });
        },
      });

      const query = createQuery('GetUser', { id: '123' });
      const result = await bus.dispatch<{ id: string; name: string; email: string }>(query);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({
          id: '123',
          name: 'Alice',
          email: 'alice@example.com',
        });
      }
    });

    test('propagates handler errors', async () => {
      const bus = createQueryBus();

      bus.register('GetUser', {
        handle: async () => {
          return err(new Error('User not found'));
        },
      });

      const query = createQuery('GetUser', { id: 'invalid' });
      const result = await bus.dispatch(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('User not found');
      }
    });

    test('catches handler exceptions', async () => {
      const bus = createQueryBus();

      bus.register('FailQuery', {
        handle: async () => {
          throw new Error('Database error');
        },
      });

      const query = createQuery('FailQuery', {});
      const result = await bus.dispatch(query);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Database error');
      }
    });
  });

  describe('Helper Functions', () => {
    test('createCommand creates a command', () => {
      const command = createCommand('CreateUser', { name: 'Alice' });

      expect(command.type).toBe('command');
      expect(command.name).toBe('CreateUser');
      expect(command.data).toEqual({ name: 'Alice' });
    });

    test('createCommand includes metadata', () => {
      const metadata = { userId: 'user-123', timestamp: Date.now() };
      const command = createCommand('CreateUser', { name: 'Alice' }, metadata);

      expect(command.metadata).toEqual(metadata);
    });

    test('createQuery creates a query', () => {
      const query = createQuery('GetUser', { id: '123' });

      expect(query.type).toBe('query');
      expect(query.name).toBe('GetUser');
      expect(query.params).toEqual({ id: '123' });
    });

    test('createQuery includes metadata', () => {
      const metadata = { userId: 'user-123', cacheKey: 'user:123' };
      const query = createQuery('GetUser', { id: '123' }, metadata);

      expect(query.metadata).toEqual(metadata);
    });

    test('isCommand identifies commands', () => {
      const command = createCommand('Test', {});
      const query = createQuery('Test', {});

      expect(isCommand(command)).toBe(true);
      expect(isCommand(query)).toBe(false);
      expect(isCommand({})).toBe(false);
      expect(isCommand(null)).toBe(false);
    });

    test('isQuery identifies queries', () => {
      const command = createCommand('Test', {});
      const query = createQuery('Test', {});

      expect(isQuery(query)).toBe(true);
      expect(isQuery(command)).toBe(false);
      expect(isQuery({})).toBe(false);
      expect(isQuery(null)).toBe(false);
    });
  });

  describe('Real-World Example: User Management', () => {
    interface User {
      id: string;
      name: string;
      email: string;
    }

    // Simple in-memory store
    class UserStore {
      private users = new Map<string, User>();
      private nextId = 1;

      create(name: string, email: string): User {
        const id = String(this.nextId++);
        const user = { id, name, email };
        this.users.set(id, user);
        return user;
      }

      update(id: string, name?: string, email?: string): User | null {
        const user = this.users.get(id);
        if (!user) return null;

        const updated = {
          ...user,
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
        };
        this.users.set(id, updated);
        return updated;
      }

      delete(id: string): boolean {
        return this.users.delete(id);
      }

      findById(id: string): User | undefined {
        return this.users.get(id);
      }

      findAll(): User[] {
        return Array.from(this.users.values());
      }
    }

    test('complete CQRS workflow with commands and queries', async () => {
      const store = new UserStore();
      const commandBus = createCommandBus();
      const queryBus = createQueryBus();

      // Register command handlers
      commandBus.register('CreateUser', {
        handle: async (cmd: Command<'CreateUser', { name: string; email: string }>) => {
          const user = store.create(cmd.data.name, cmd.data.email);
          return ok(user);
        },
      });

      commandBus.register('UpdateUser', {
        handle: async (
          cmd: Command<'UpdateUser', { id: string; name?: string; email?: string }>
        ) => {
          const user = store.update(cmd.data.id, cmd.data.name, cmd.data.email);
          return user ? ok(user) : err(new Error('User not found'));
        },
      });

      commandBus.register('DeleteUser', {
        handle: async (cmd: Command<'DeleteUser', { id: string }>) => {
          const deleted = store.delete(cmd.data.id);
          return deleted ? ok(undefined) : err(new Error('User not found'));
        },
      });

      // Register query handlers
      queryBus.register('GetUser', {
        handle: async (query: Query<'GetUser', { id: string }>) => {
          const user = store.findById(query.params.id);
          return user ? ok(user) : err(new Error('User not found'));
        },
      });

      queryBus.register('ListUsers', {
        handle: async () => {
          return ok(store.findAll());
        },
      });

      // Create user
      const createResult = await commandBus.dispatch<User>(
        createCommand('CreateUser', { name: 'Alice', email: 'alice@example.com' })
      );

      expect(createResult.isOk()).toBe(true);
      const userId = createResult.isOk() ? createResult.value.id : '';

      // Query user
      const getUserResult = await queryBus.dispatch<User>(
        createQuery('GetUser', { id: userId })
      );

      expect(getUserResult.isOk()).toBe(true);
      if (getUserResult.isOk()) {
        expect(getUserResult.value.name).toBe('Alice');
        expect(getUserResult.value.email).toBe('alice@example.com');
      }

      // Update user
      const updateResult = await commandBus.dispatch<User>(
        createCommand('UpdateUser', { id: userId, name: 'Alice Smith' })
      );

      expect(updateResult.isOk()).toBe(true);

      // Query updated user
      const updatedUserResult = await queryBus.dispatch<User>(
        createQuery('GetUser', { id: userId })
      );

      expect(updatedUserResult.isOk()).toBe(true);
      if (updatedUserResult.isOk()) {
        expect(updatedUserResult.value.name).toBe('Alice Smith');
      }

      // List all users
      const listResult = await queryBus.dispatch<User[]>(createQuery('ListUsers', {}));

      expect(listResult.isOk()).toBe(true);
      if (listResult.isOk()) {
        expect(listResult.value).toHaveLength(1);
      }

      // Delete user
      const deleteResult = await commandBus.dispatch(
        createCommand('DeleteUser', { id: userId })
      );

      expect(deleteResult.isOk()).toBe(true);

      // Query deleted user (should fail)
      const deletedUserResult = await queryBus.dispatch(
        createQuery('GetUser', { id: userId })
      );

      expect(deletedUserResult.isErr()).toBe(true);
    });
  });
});
