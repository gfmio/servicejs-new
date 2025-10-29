import 'reflect-metadata';
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { DataSource } from 'typeorm';
import { createTypeORMAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';
import { User } from './entities/User.js';
import { Post } from './entities/Post.js';

describe('TypeORM Adapter', () => {
  let dataSource: DataSource;
  let adapter: ReturnType<typeof createTypeORMAdapter>;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [User, Post],
      synchronize: true,
      logging: false,
    });

    adapter = createTypeORMAdapter();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
  });

  describe('Lifecycle', () => {
    test('init and start', async () => {
      const initResult = await adapter.init({ dataSource });
      expect(isOk(initResult)).toBe(true);

      const startResult = await adapter.start();
      expect(isOk(startResult)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({ dataSource });
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

    test('stop destroys data source', async () => {
      await adapter.init({ dataSource });
      await adapter.start();

      const stopResult = await adapter.stop();
      expect(isOk(stopResult)).toBe(true);
    });
  });

  describe('DataSource Access', () => {
    beforeEach(async () => {
      await adapter.init({ dataSource });
      await adapter.start();
    });

    test('getDataSource returns DataSource', () => {
      const result = adapter.getDataSource();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(dataSource);
      }
    });

    test('getManager returns EntityManager', () => {
      const result = adapter.getManager();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
      }
    });

    test('getRepository returns repository', () => {
      const result = adapter.getRepository(User);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
      }
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await adapter.init({ dataSource });
      await adapter.start();
    });

    test('can create and query records', async () => {
      const repoResult = adapter.getRepository(User);
      if (isOk(repoResult)) {
        const repo = repoResult.value;

        // Create user
        const user = repo.create({
          email: 'test@example.com',
          name: 'Test User',
          age: 30,
        });

        await repo.save(user);

        expect(user.id).toBeDefined();
        expect(user.email).toBe('test@example.com');

        // Query user
        const foundUser = await repo.findOne({
          where: { email: 'test@example.com' },
        });

        expect(foundUser).not.toBeNull();
        expect(foundUser?.name).toBe('Test User');
      }
    });

    test('can update records', async () => {
      const repoResult = adapter.getRepository(User);
      if (isOk(repoResult)) {
        const repo = repoResult.value;

        const user = repo.create({
          email: 'update@example.com',
          name: 'Original',
        });

        await repo.save(user);

        user.name = 'Updated';
        await repo.save(user);

        const updated = await repo.findOne({
          where: { id: user.id },
        });

        expect(updated?.name).toBe('Updated');
      }
    });

    test('can delete records', async () => {
      const repoResult = adapter.getRepository(User);
      if (isOk(repoResult)) {
        const repo = repoResult.value;

        const user = repo.create({
          email: 'delete@example.com',
          name: 'To Delete',
        });

        await repo.save(user);
        await repo.remove(user);

        const found = await repo.findOne({
          where: { id: user.id },
        });

        expect(found).toBeNull();
      }
    });
  });

  describe('Transactions', () => {
    beforeEach(async () => {
      await adapter.init({ dataSource });
      await adapter.start();
    });

    test('successful transaction commits changes', async () => {
      const result = await adapter.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);
        const postRepo = manager.getRepository(Post);

        const user = userRepo.create({
          email: 'tx@example.com',
          name: 'TX User',
        });

        await userRepo.save(user);

        const post = postRepo.create({
          title: 'TX Post',
          authorId: user.id,
        });

        await postRepo.save(post);

        return user.id;
      });

      expect(isOk(result)).toBe(true);

      // Verify data was committed
      const repoResult = adapter.getRepository(User);
      if (isOk(repoResult)) {
        const user = await repoResult.value.findOne({
          where: { email: 'tx@example.com' },
          relations: ['posts'],
        });

        expect(user).not.toBeNull();
        expect(user?.posts.length).toBe(1);
      }
    });

    test('failed transaction rolls back changes', async () => {
      const result = await adapter.transaction(async (manager) => {
        const userRepo = manager.getRepository(User);

        const user = userRepo.create({
          email: 'rollback@example.com',
          name: 'Rollback User',
        });

        await userRepo.save(user);

        // Force error
        throw new Error('Transaction failed');
      });

      expect(isErr(result)).toBe(true);

      // Verify data was rolled back
      const repoResult = adapter.getRepository(User);
      if (isOk(repoResult)) {
        const user = await repoResult.value.findOne({
          where: { email: 'rollback@example.com' },
        });

        expect(user).toBeNull();
      }
    });
  });

  describe('Raw Queries', () => {
    beforeEach(async () => {
      await adapter.init({ dataSource });
      await adapter.start();
    });

    test('query returns results', async () => {
      // Insert test data
      const repoResult = adapter.getRepository(User);
      if (isOk(repoResult)) {
        const repo = repoResult.value;
        const user = repo.create({
          email: 'raw@example.com',
          name: 'Raw User',
          age: 25,
        });
        await repo.save(user);
      }

      const result = await adapter.query<User[]>(
        'SELECT * FROM user WHERE email = ?',
        ['raw@example.com']
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.length).toBeGreaterThan(0);
        expect(result.value[0].email).toBe('raw@example.com');
      }
    });
  });

  describe('Relations', () => {
    beforeEach(async () => {
      await adapter.init({ dataSource });
      await adapter.start();
    });

    test('can query with relations', async () => {
      const managerResult = adapter.getManager();
      if (isOk(managerResult)) {
        const manager = managerResult.value;

        const user = manager.getRepository(User).create({
          email: 'author@example.com',
          name: 'Author',
        });

        await manager.save(user);

        const post1 = manager.getRepository(Post).create({
          title: 'Post 1',
          content: 'Content 1',
          published: true,
          authorId: user.id,
        });

        const post2 = manager.getRepository(Post).create({
          title: 'Post 2',
          content: 'Content 2',
          authorId: user.id,
        });

        await manager.save([post1, post2]);

        const foundUser = await manager.getRepository(User).findOne({
          where: { id: user.id },
          relations: ['posts'],
        });

        expect(foundUser?.posts.length).toBe(2);
      }
    });

    test('cascade delete works', async () => {
      const managerResult = adapter.getManager();
      if (isOk(managerResult)) {
        const manager = managerResult.value;

        const user = manager.getRepository(User).create({
          email: 'cascade@example.com',
          name: 'Cascade User',
        });

        await manager.save(user);

        const post = manager.getRepository(Post).create({
          title: 'Will be deleted',
          authorId: user.id,
        });

        await manager.save(post);

        await manager.getRepository(User).remove(user);

        const posts = await manager.getRepository(Post).find({
          where: { authorId: user.id },
        });

        expect(posts.length).toBe(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('operations fail when not initialized', async () => {
      const result = await adapter.transaction(async (manager) => {
        return true;
      });

      expect(isErr(result)).toBe(true);
    });

    test('query handles errors', async () => {
      await adapter.init({ dataSource });
      await adapter.start();

      const result = await adapter.query('SELECT * FROM NonExistentTable');
      expect(isErr(result)).toBe(true);
    });
  });
});
