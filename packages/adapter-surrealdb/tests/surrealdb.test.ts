import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createSurrealDBAdapter } from '../src/surrealdb.js';
import { isOk, isErr } from '@servicejs/result';

describe('SurrealDB Adapter', () => {
  let container: StartedTestContainer | undefined;
  let adapter: ReturnType<typeof createSurrealDBAdapter>;
  let surrealUrl: string;

  beforeAll(async () => {
    try {
      // Start SurrealDB container
      container = await new GenericContainer('surrealdb/surrealdb:v2.1.4')
        .withExposedPorts(8000)
        .withCommand(['start', '--log', 'trace', '--user', 'root', '--pass', 'root', 'memory'])
        .start();

      const host = container.getHost();
      const port = container.getMappedPort(8000);
      surrealUrl = `http://${host}:${port}`;
    } catch (error) {
      console.warn('Failed to start SurrealDB container:', error);
      // Fall back to local SurrealDB if available
      surrealUrl = 'http://127.0.0.1:8000';
    }

    adapter = createSurrealDBAdapter();
  }, 60000);

  afterAll(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    // Reset database by destroying and reinitializing
    if (adapter) {
      await adapter.destroy();
    }
    adapter = createSurrealDBAdapter();
  });

  describe('Lifecycle', () => {
    test('init succeeds with valid config', async () => {
      const result = await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });

      expect(isOk(result)).toBe(true);
    });

    test('init fails with invalid credentials', async () => {
      const result = await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'wrong', password: 'wrong' },
      });

      expect(isErr(result)).toBe(true);
    });

    test('start succeeds after init', async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start fails before init', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('stop succeeds', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('destroy succeeds', async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Health', () => {
    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.status).toBe('unhealthy');
      }
    });

    test('health returns healthy after init', async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.status).toBe('healthy');
      }
    });
  });

  describe('Document Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });
      await adapter.start();
    });

    test('create and select documents', async () => {
      interface Person {
        name: string;
        age: number;
      }

      // Create a document
      const createResult = await adapter.create<Person>('person:alice', {
        name: 'Alice',
        age: 30,
      });

      expect(isOk(createResult)).toBe(true);
      if (isOk(createResult)) {
        expect(createResult.ok).toMatchObject({
          name: 'Alice',
          age: 30,
        });
      }

      // Select the document
      const selectResult = await adapter.select<Person>('person:alice');
      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.ok).toHaveLength(1);
        expect(selectResult.ok[0]).toMatchObject({
          name: 'Alice',
          age: 30,
        });
      }
    });

    test('select all documents in a table', async () => {
      // Create multiple documents
      await adapter.create('person:alice', { name: 'Alice', age: 30 });
      await adapter.create('person:bob', { name: 'Bob', age: 25 });

      // Select all documents
      const result = await adapter.select('person');
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('update document', async () => {
      // Create a document
      await adapter.create('person:alice', { name: 'Alice', age: 30 });

      // Update the document
      const updateResult = await adapter.update('person:alice', { age: 31 });
      expect(isOk(updateResult)).toBe(true);
      if (isOk(updateResult)) {
        expect(updateResult.ok).toMatchObject({
          name: 'Alice',
          age: 31,
        });
      }
    });

    test('merge document', async () => {
      // Create a document
      await adapter.create('person:alice', { name: 'Alice', age: 30 });

      // Merge additional fields
      const mergeResult = await adapter.merge('person:alice', { city: 'NYC' });
      expect(isOk(mergeResult)).toBe(true);
      if (isOk(mergeResult)) {
        expect(mergeResult.ok).toMatchObject({
          name: 'Alice',
          age: 30,
          city: 'NYC',
        });
      }
    });

    test('delete document', async () => {
      // Create a document
      await adapter.create('person:alice', { name: 'Alice', age: 30 });

      // Delete the document
      const deleteResult = await adapter.delete('person:alice');
      expect(isOk(deleteResult)).toBe(true);

      // Verify deletion
      const selectResult = await adapter.select('person:alice');
      expect(isOk(selectResult)).toBe(true);
      if (isOk(selectResult)) {
        expect(selectResult.ok).toHaveLength(0);
      }
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });
      await adapter.start();
    });

    test('query with parameters', async () => {
      // Create test data
      await adapter.create('person:alice', { name: 'Alice', age: 30 });
      await adapter.create('person:bob', { name: 'Bob', age: 25 });

      // Query with parameters
      const result = await adapter.query({
        text: 'SELECT * FROM person WHERE age > $minAge',
        params: { minAge: 26 },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBeGreaterThanOrEqual(1);
        expect(result.ok.rowCount).toBe(result.ok.rows.length);
      }
    });

    test('query without parameters', async () => {
      // Create test data
      await adapter.create('person:alice', { name: 'Alice', age: 30 });

      // Query without parameters
      const result = await adapter.query({
        text: 'SELECT * FROM person',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Graph Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });
      await adapter.start();
    });

    test('create relationships', async () => {
      // Create nodes
      await adapter.create('person:alice', { name: 'Alice' });
      await adapter.create('person:bob', { name: 'Bob' });

      // Create relationship
      const relateResult = await adapter.relate('person:alice', 'knows', 'person:bob', {
        since: 2020,
      });

      expect(isOk(relateResult)).toBe(true);
      if (isOk(relateResult)) {
        expect(relateResult.ok).toMatchObject({
          since: 2020,
        });
      }

      // Query the relationship
      const queryResult = await adapter.query({
        text: 'SELECT * FROM knows WHERE in = person:alice AND out = person:bob',
      });

      expect(isOk(queryResult)).toBe(true);
      if (isOk(queryResult)) {
        expect(queryResult.ok.rows.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('traverse graph', async () => {
      // Create nodes
      await adapter.create('person:alice', { name: 'Alice' });
      await adapter.create('person:bob', { name: 'Bob' });
      await adapter.create('person:charlie', { name: 'Charlie' });

      // Create relationships
      await adapter.relate('person:alice', 'knows', 'person:bob');
      await adapter.relate('person:bob', 'knows', 'person:charlie');

      // Traverse graph
      const result = await adapter.query({
        text: 'SELECT ->knows->person.name AS friends FROM person:alice',
      });

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({
        url: `${surrealUrl}/rpc`,
        namespace: 'test',
        database: 'test',
        auth: { username: 'root', password: 'root' },
      });
      await adapter.start();
    });

    test('commit transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        // Execute queries in transaction
        await tx.query({
          text: 'CREATE person:tx1 SET name = "Transaction Test"',
        });

        // Commit transaction
        const commitResult = await tx.commit();
        expect(isOk(commitResult)).toBe(true);

        // Verify data was persisted
        const selectResult = await adapter.select('person:tx1');
        expect(isOk(selectResult)).toBe(true);
        if (isOk(selectResult)) {
          expect(selectResult.ok.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test('rollback transaction', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        // Execute queries in transaction
        await tx.query({
          text: 'CREATE person:tx2 SET name = "Rollback Test"',
        });

        // Rollback transaction
        const rollbackResult = await tx.rollback();
        expect(isOk(rollbackResult)).toBe(true);

        // Verify data was not persisted
        const selectResult = await adapter.select('person:tx2');
        expect(isOk(selectResult)).toBe(true);
        if (isOk(selectResult)) {
          expect(selectResult.ok).toHaveLength(0);
        }
      }
    });

    test('cannot commit twice', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        await tx.commit();
        const secondCommit = await tx.commit();

        expect(isErr(secondCommit)).toBe(true);
      }
    });

    test('cannot rollback after commit', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        await tx.commit();
        const rollbackResult = await tx.rollback();

        expect(isErr(rollbackResult)).toBe(true);
      }
    });
  });
});
