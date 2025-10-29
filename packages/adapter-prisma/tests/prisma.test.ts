import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { PrismaClient } from './generated/client/index.js';
import { createPrismaAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';
import { exec } from 'child_process';
import { promisify } from 'util';
import { unlink } from 'fs/promises';

const execAsync = promisify(exec);

describe('Prisma Adapter', () => {
  let prisma: PrismaClient;
  let adapter: ReturnType<typeof createPrismaAdapter>;

  beforeEach(async () => {
    // Generate Prisma client and push schema to SQLite
    try {
      await execAsync('npx prisma generate --schema=./tests/schema.prisma', {
        cwd: '/Users/gfmio/projects/github/gfmio/servicejs/packages/adapter-prisma',
      });

      await execAsync('npx prisma db push --skip-generate --schema=./tests/schema.prisma', {
        cwd: '/Users/gfmio/projects/github/gfmio/servicejs/packages/adapter-prisma',
      });
    } catch (error) {
      console.error('Failed to setup Prisma:', error);
      throw error;
    }

    prisma = new PrismaClient();
    adapter = createPrismaAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (prisma) {
      await prisma.$disconnect();
    }

    // Clean up test database
    try {
      await unlink('/Users/gfmio/projects/github/gfmio/servicejs/packages/adapter-prisma/tests/test.db');
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('Lifecycle', () => {
    test('init and start', async () => {
      const initResult = await adapter.init({ client: prisma });
      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({ client: prisma });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });

    test('stop disconnects from database', async () => {
      await adapter.init({ client: prisma });
      await adapter.start();

      const stopResult = await adapter.stop();
      expect(isOk(stopResult)).toBe(true);
    });
  });

  describe('Client Access', () => {
    beforeEach(async () => {
      await adapter.init({ client: prisma });
      await adapter.start();
    });

    test('getClient returns Prisma client', async () => {
      const result = adapter.getClient();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(prisma);
      }
    });

    test('getClient fails when not initialized', async () => {
      const uninitAdapter = createPrismaAdapter();
      const result = uninitAdapter.getClient();
      expect(isErr(result)).toBe(true);
    });
  });

  describe('Database Operations via Client', () => {
    beforeEach(async () => {
      await adapter.init({ client: prisma });
      await adapter.start();
    });

    test('can create and query records', async () => {
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const client = clientResult.value;

        // Create user
        const user = await client.user.create({
          data: {
            email: 'test@example.com',
            name: 'Test User',
            age: 30,
          },
        });

        expect(user.id).toBeDefined();
        expect(user.email).toBe('test@example.com');

        // Query user
        const foundUser = await client.user.findUnique({
          where: { email: 'test@example.com' },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser?.name).toBe('Test User');
      }
    });

    test('can update records', async () => {
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const client = clientResult.value;

        const user = await client.user.create({
          data: { email: 'update@example.com', name: 'Original' },
        });

        const updated = await client.user.update({
          where: { id: user.id },
          data: { name: 'Updated' },
        });

        expect(updated.name).toBe('Updated');
      }
    });

    test('can delete records', async () => {
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const client = clientResult.value;

        const user = await client.user.create({
          data: { email: 'delete@example.com', name: 'To Delete' },
        });

        await client.user.delete({
          where: { id: user.id },
        });

        const found = await client.user.findUnique({
          where: { id: user.id },
        });

        expect(found).toBeNull();
      }
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({ client: prisma });
      await adapter.start();
    });

    test('successful transaction commits changes', async () => {
      const result = await adapter.transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: 'tx@example.com', name: 'TX User' },
        });

        await tx.post.create({
          data: {
            title: 'TX Post',
            authorId: user.id,
          },
        });

        return user.id;
      });

      expect(isOk(result)).toBe(true);

      // Verify data was committed
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const user = await clientResult.value.user.findUnique({
          where: { email: 'tx@example.com' },
          include: { posts: true },
        });

        expect(user).not.toBeNull();
        expect(user?.posts.length).toBe(1);
      }
    });

    test('failed transaction rolls back changes', async () => {
      const result = await adapter.transaction(async (tx) => {
        await tx.user.create({
          data: { email: 'rollback@example.com', name: 'Rollback User' },
        });

        // Force error
        throw new Error('Transaction failed');
      });

      expect(isErr(result)).toBe(true);

      // Verify data was rolled back
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const user = await clientResult.value.user.findUnique({
          where: { email: 'rollback@example.com' },
        });

        expect(user).toBeNull();
      }
    });

    test('transaction with isolation level', async () => {
      const result = await adapter.transaction(
        async (tx) => {
          return await tx.user.create({
            data: { email: 'isolated@example.com', name: 'Isolated' },
          });
        },
        { isolationLevel: 'Serializable' }
      );

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Raw Queries', () => {
    beforeEach(async () => {
      await adapter.init({ client: prisma });
      await adapter.start();
    });

    test('queryRaw returns results', async () => {
      // Insert test data
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        await clientResult.value.user.create({
          data: { email: 'raw@example.com', name: 'Raw User', age: 25 },
        });
      }

      const result = await adapter.queryRaw<any[]>`SELECT * FROM User WHERE email = ${'raw@example.com'}`;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].email).toBe('raw@example.com');
      }
    });

    test('executeRaw returns affected rows', async () => {
      // Insert test data
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        await clientResult.value.user.create({
          data: { email: 'execute@example.com', name: 'Execute User' },
        });
      }

      const result = await adapter.executeRaw`UPDATE User SET name = ${'Updated'} WHERE email = ${'execute@example.com'}`;

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(1);
      }
    });

    test('queryRaw with unsafe string query', async () => {
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        await clientResult.value.user.create({
          data: { email: 'unsafe@example.com', name: 'Unsafe' },
        });
      }

      const result = await adapter.queryRaw<any[]>(
        'SELECT * FROM User WHERE email = ?',
        'unsafe@example.com'
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Relations', () => {
    beforeEach(async () => {
      await adapter.init({ client: prisma });
      await adapter.start();
    });

    test('can query with relations', async () => {
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const client = clientResult.value;

        const user = await client.user.create({
          data: {
            email: 'author@example.com',
            name: 'Author',
            posts: {
              create: [
                { title: 'Post 1', content: 'Content 1', published: true },
                { title: 'Post 2', content: 'Content 2' },
              ],
            },
          },
          include: {
            posts: true,
          },
        });

        expect(user.posts.length).toBe(2);
        expect(user.posts[0].title).toBe('Post 1');
      }
    });

    test('cascade delete works', async () => {
      const clientResult = adapter.getClient();
      if (isOk(clientResult)) {
        const client = clientResult.value;

        const user = await client.user.create({
          data: {
            email: 'cascade@example.com',
            name: 'Cascade User',
            posts: {
              create: { title: 'Will be deleted' },
            },
          },
        });

        await client.user.delete({
          where: { id: user.id },
        });

        const posts = await client.post.findMany({
          where: { authorId: user.id },
        });

        expect(posts.length).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('operations fail when not initialized', async () => {
      const result = await adapter.transaction(async (tx) => {
        return true;
      });

      expect(isErr(result)).toBe(true);
    });

    test('queryRaw handles errors', async () => {
      await adapter.init({ client: prisma });
      await adapter.start();

      const result = await adapter.queryRaw`SELECT * FROM NonExistentTable`;
      expect(isErr(result)).toBe(true);
    });
  });
});
