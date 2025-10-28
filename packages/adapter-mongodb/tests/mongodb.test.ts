import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createMongoDBAdapter } from '../src/mongodb.js';
import { isOk, isErr } from '@servicejs/result';

describe('MongoDB Adapter', () => {
  let container: StartedTestContainer | undefined;
  let adapter: ReturnType<typeof createMongoDBAdapter>;
  let mongoUrl: string;

  beforeAll(async () => {
    try {
      // Start MongoDB container
      container = await new GenericContainer('mongo:7.0')
        .withExposedPorts(27017)
        .start();

      const host = container.getHost();
      const port = container.getMappedPort(27017);
      mongoUrl = `mongodb://${host}:${port}`;
    } catch (error) {
      console.warn('Failed to start MongoDB container:', error);
      // Fall back to local MongoDB if available
      mongoUrl = 'mongodb://localhost:27017';
    }

    adapter = createMongoDBAdapter();
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
    adapter = createMongoDBAdapter();
  });

  describe('Lifecycle', () => {
    test('init succeeds with valid config', async () => {
      const result = await adapter.init({
        url: mongoUrl,
        database: 'test',
      });

      expect(isOk(result)).toBe(true);
    });

    test('start succeeds after init', async () => {
      await adapter.init({
        url: mongoUrl,
        database: 'test',
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
        url: mongoUrl,
        database: 'test',
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
        url: mongoUrl,
        database: 'test',
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
        url: mongoUrl,
        database: 'test',
      });
      await adapter.start();

      // Clean up test collection
      await adapter.deleteMany('users', {});
    });

    test('insertOne creates a document', async () => {
      const result = await adapter.insertOne('users', {
        name: 'Alice',
        age: 30,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.id).toBeDefined();
      }
    });

    test('insertMany creates multiple documents', async () => {
      const result = await adapter.insertMany('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ]);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.ids).toHaveLength(3);
      }
    });

    test('findOne retrieves a single document', async () => {
      await adapter.insertOne('users', { name: 'Alice', age: 30 });

      const result = await adapter.findOne('users', { name: 'Alice' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok).toBeDefined();
        expect(result.ok?.name).toBe('Alice');
        expect(result.ok?.age).toBe(30);
      }
    });

    test('findOne returns null when no document matches', async () => {
      const result = await adapter.findOne('users', { name: 'NonExistent' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok).toBeNull();
      }
    });

    test('updateOne modifies a document', async () => {
      await adapter.insertOne('users', { name: 'Alice', age: 30 });

      const updateResult = await adapter.updateOne(
        'users',
        { name: 'Alice' },
        { $set: { age: 31 } }
      );

      expect(isOk(updateResult)).toBe(true);
      if (isOk(updateResult)) {
        expect(updateResult.ok.modifiedCount).toBe(1);
      }

      // Verify the update
      const findResult = await adapter.findOne('users', { name: 'Alice' });
      if (isOk(findResult) && findResult.ok) {
        expect(findResult.ok.age).toBe(31);
      }
    });

    test('updateMany modifies multiple documents', async () => {
      await adapter.insertMany('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ]);

      const result = await adapter.updateMany(
        'users',
        { age: { $gte: 30 } },
        { $set: { senior: true } }
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.modifiedCount).toBe(2); // Alice and Charlie
      }
    });

    test('deleteOne removes a document', async () => {
      await adapter.insertOne('users', { name: 'Alice', age: 30 });

      const deleteResult = await adapter.deleteOne('users', { name: 'Alice' });

      expect(isOk(deleteResult)).toBe(true);
      if (isOk(deleteResult)) {
        expect(deleteResult.ok.deletedCount).toBe(1);
      }

      // Verify deletion
      const findResult = await adapter.findOne('users', { name: 'Alice' });
      if (isOk(findResult)) {
        expect(findResult.ok).toBeNull();
      }
    });

    test('deleteMany removes multiple documents', async () => {
      await adapter.insertMany('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ]);

      const result = await adapter.deleteMany('users', { age: { $gte: 30 } });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.deletedCount).toBe(2); // Alice and Charlie
      }
    });

    test('countDocuments returns correct count', async () => {
      await adapter.insertMany('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ]);

      const result = await adapter.countDocuments('users');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok).toBe(3);
      }
    });

    test('countDocuments with filter returns filtered count', async () => {
      await adapter.insertMany('users', [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ]);

      const result = await adapter.countDocuments('users', { age: { $gte: 30 } });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok).toBe(2); // Alice and Charlie
      }
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        url: mongoUrl,
        database: 'test',
      });
      await adapter.start();

      // Clean up and populate test collection
      await adapter.deleteMany('users', {});
      await adapter.insertMany('users', [
        { name: 'Alice', age: 30, city: 'NYC' },
        { name: 'Bob', age: 25, city: 'LA' },
        { name: 'Charlie', age: 35, city: 'Chicago' },
      ]);
    });

    test('query with filter', async () => {
      const result = await adapter.query({
        collection: 'users',
        filter: { age: { $gte: 30 } },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBe(2); // Alice and Charlie
        expect(result.ok.rowCount).toBe(2);
      }
    });

    test('query with projection', async () => {
      const result = await adapter.query({
        collection: 'users',
        filter: { name: 'Alice' },
        projection: { name: 1, age: 1, _id: 0 },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBe(1);
        const row = result.ok.rows[0] as any;
        expect(row.name).toBe('Alice');
        expect(row.age).toBe(30);
        expect(row._id).toBeUndefined();
        expect(row.city).toBeUndefined();
      }
    });

    test('query with sort', async () => {
      const result = await adapter.query({
        collection: 'users',
        sort: { age: -1 }, // Descending
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBe(3);
        const rows = result.ok.rows as any[];
        expect(rows[0].name).toBe('Charlie'); // 35
        expect(rows[1].name).toBe('Alice'); // 30
        expect(rows[2].name).toBe('Bob'); // 25
      }
    });

    test('query with limit', async () => {
      const result = await adapter.query({
        collection: 'users',
        limit: 2,
        sort: { name: 1 },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBe(2);
        expect(result.ok.rowCount).toBe(2);
      }
    });

    test('query with skip', async () => {
      const result = await adapter.query({
        collection: 'users',
        skip: 1,
        sort: { name: 1 },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBe(2); // Skip Alice, get Bob and Charlie
      }
    });

    test('query with limit and skip (pagination)', async () => {
      const result = await adapter.query({
        collection: 'users',
        skip: 1,
        limit: 1,
        sort: { name: 1 },
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.rows.length).toBe(1);
        const row = result.ok.rows[0] as any;
        expect(row.name).toBe('Bob');
      }
    });
  });

  describe('Aggregation', () => {
    beforeEach(async () => {
      await adapter.init({
        url: mongoUrl,
        database: 'test',
      });
      await adapter.start();

      // Clean up and populate test collection
      await adapter.deleteMany('orders', {});
      await adapter.insertMany('orders', [
        { product: 'Widget', quantity: 5, price: 10 },
        { product: 'Widget', quantity: 3, price: 10 },
        { product: 'Gadget', quantity: 2, price: 20 },
        { product: 'Gadget', quantity: 4, price: 20 },
      ]);
    });

    test('aggregate with grouping', async () => {
      const result = await adapter.aggregate({
        collection: 'orders',
        pipeline: [
          {
            $group: {
              _id: '$product',
              totalQuantity: { $sum: '$quantity' },
              totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.length).toBe(2);
        const widget = result.ok.find((r: any) => r._id === 'Widget');
        const gadget = result.ok.find((r: any) => r._id === 'Gadget');
        expect(widget.totalQuantity).toBe(8); // 5 + 3
        expect(widget.totalRevenue).toBe(80); // (5 * 10) + (3 * 10)
        expect(gadget.totalQuantity).toBe(6); // 2 + 4
        expect(gadget.totalRevenue).toBe(120); // (2 * 20) + (4 * 20)
      }
    });

    test('aggregate with match and project', async () => {
      const result = await adapter.aggregate({
        collection: 'orders',
        pipeline: [
          { $match: { product: 'Widget' } },
          { $project: { total: { $multiply: ['$quantity', '$price'] }, _id: 0 } },
        ],
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.ok.length).toBe(2);
        const totals = result.ok.map((r: any) => r.total);
        expect(totals).toContain(50); // 5 * 10
        expect(totals).toContain(30); // 3 * 10
      }
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({
        url: mongoUrl,
        database: 'test',
      });
      await adapter.start();

      // Clean up test collection
      await adapter.deleteMany('accounts', {});
    });

    test('commit transaction', async () => {
      // Create initial accounts
      await adapter.insertMany('accounts', [
        { name: 'Alice', balance: 100 },
        { name: 'Bob', balance: 50 },
      ]);

      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        // Query within transaction
        const queryResult = await tx.query({
          collection: 'accounts',
          filter: { name: 'Alice' },
        });

        expect(isOk(queryResult)).toBe(true);

        // Commit transaction
        const commitResult = await tx.commit();
        expect(isOk(commitResult)).toBe(true);
      }
    });

    test('rollback transaction', async () => {
      // Create initial accounts
      await adapter.insertMany('accounts', [
        { name: 'Alice', balance: 100 },
      ]);

      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        // Query within transaction
        await tx.query({
          collection: 'accounts',
          filter: { name: 'Alice' },
        });

        // Rollback transaction
        const rollbackResult = await tx.rollback();
        expect(isOk(rollbackResult)).toBe(true);
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

    test('cannot query after commit', async () => {
      const txResult = await adapter.begin();
      expect(isOk(txResult)).toBe(true);

      if (isOk(txResult)) {
        const tx = txResult.ok;

        await tx.commit();
        const queryResult = await tx.query({
          collection: 'accounts',
          filter: {},
        });

        expect(isErr(queryResult)).toBe(true);
      }
    });
  });
});
