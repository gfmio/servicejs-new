import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { token, createContainer } from '../src/index.js';

describe('Container', () => {
  test('registers and resolves a simple dependency', async () => {
    interface Logger {
      log(message: string): void;
    }

    const LoggerToken = token<Logger>('Logger');
    const container = createContainer();

    let logged: string[] = [];
    container.singleton(LoggerToken, () => ({
      log: (msg) => logged.push(msg),
    }));

    const result = await container.resolve(LoggerToken);
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      result.value.log('test');
      expect(logged).toEqual(['test']);
    }
  });

  test('singleton returns same instance', async () => {
    const TokenA = token<{ id: number }>('A');
    const container = createContainer();

    let counter = 0;
    container.singleton(TokenA, () => ({ id: ++counter }));

    const result1 = await container.resolve(TokenA);
    const result2 = await container.resolve(TokenA);

    expect(isOk(result1)).toBe(true);
    expect(isOk(result2)).toBe(true);

    if (isOk(result1) && isOk(result2)) {
      expect(result1.value.id).toBe(1);
      expect(result2.value.id).toBe(1);
      expect(result1.value).toBe(result2.value);
    }
  });

  test('transient returns different instances', async () => {
    const TokenA = token<{ id: number }>('A');
    const container = createContainer();

    let counter = 0;
    container.transient(TokenA, () => ({ id: ++counter }));

    const result1 = await container.resolve(TokenA);
    const result2 = await container.resolve(TokenA);

    expect(isOk(result1)).toBe(true);
    expect(isOk(result2)).toBe(true);

    if (isOk(result1) && isOk(result2)) {
      expect(result1.value.id).toBe(1);
      expect(result2.value.id).toBe(2);
      expect(result1.value).not.toBe(result2.value);
    }
  });

  test('resolves dependencies', async () => {
    interface Logger {
      log(msg: string): void;
    }

    interface Database {
      query(sql: string): void;
    }

    const LoggerToken = token<Logger>('Logger');
    const DatabaseToken = token<Database>('Database');

    const container = createContainer();
    const logs: string[] = [];

    container.singleton(LoggerToken, () => ({
      log: (msg) => logs.push(msg),
    }));

    container.singleton(
      DatabaseToken,
      (deps: any) => ({
        query: (sql) => {
          const logger = deps[String(LoggerToken)] as Logger;
          logger.log(`Executing: ${sql}`);
        },
      }),
      [LoggerToken]
    );

    const result = await container.resolve(DatabaseToken);
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      result.value.query('SELECT * FROM users');
      expect(logs).toEqual(['Executing: SELECT * FROM users']);
    }
  });

  test('detects circular dependencies', async () => {
    const TokenA = token<any>('A');
    const TokenB = token<any>('B');

    const container = createContainer();

    container.singleton(TokenA, () => ({}), [TokenB]);
    container.singleton(TokenB, () => ({}), [TokenA]);

    const result = await container.resolve(TokenA);
    expect(isErr(result)).toBe(true);

    if (isErr(result)) {
      expect(result.error.message).toContain('Circular dependency');
    }
  });

  test('returns error for unregistered token', async () => {
    const TokenA = token<any>('A');
    const container = createContainer();

    const result = await container.resolve(TokenA);
    expect(isErr(result)).toBe(true);

    if (isErr(result)) {
      expect(result.error.message).toContain('No registration found');
    }
  });

  test('registers value', async () => {
    const ConfigToken = token<{ apiUrl: string }>('Config');
    const container = createContainer();

    container.value(ConfigToken, { apiUrl: 'https://api.example.com' });

    const result = await container.resolve(ConfigToken);
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(result.value.apiUrl).toBe('https://api.example.com');
    }
  });

  test('createScope creates isolated scoped instances', async () => {
    const TokenA = token<{ id: number }>('A');
    const container = createContainer();

    let counter = 0;
    container.scoped(TokenA, () => ({ id: ++counter }));

    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const result1a = await scope1.resolve(TokenA);
    const result1b = await scope1.resolve(TokenA);
    const result2a = await scope2.resolve(TokenA);

    expect(isOk(result1a) && isOk(result1b) && isOk(result2a)).toBe(true);

    if (isOk(result1a) && isOk(result1b) && isOk(result2a)) {
      // Same scope returns same instance
      expect(result1a.value).toBe(result1b.value);
      expect(result1a.value.id).toBe(1);

      // Different scope returns different instance
      expect(result1a.value).not.toBe(result2a.value);
      expect(result2a.value.id).toBe(2);
    }
  });

  test('async factories work', async () => {
    const TokenA = token<string>('A');
    const container = createContainer();

    container.singleton(TokenA, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'async value';
    });

    const result = await container.resolve(TokenA);
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(result.value).toBe('async value');
    }
  });
});
