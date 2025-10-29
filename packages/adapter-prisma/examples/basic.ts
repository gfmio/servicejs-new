/**
 * Basic Prisma adapter usage example
 *
 * Demonstrates type-safe database operations with Prisma
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

// Note: This example assumes you have a Prisma schema defined
// Run: npx prisma init
// Define your schema in prisma/schema.prisma
// Run: npx prisma generate
// Run: npx prisma db push (or npx prisma migrate dev)

async function main() {
  // Create Prisma client
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  // Create adapter
  const adapter = createPrismaAdapter();

  // Initialize with Prisma client
  const initResult = await adapter.init({
    client: prisma,
    enableLogging: true,
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized Prisma adapter');

  await adapter.start();
  console.log('✓ Connected to database');

  // Get client for direct operations
  const clientResult = adapter.getClient();
  if (!isOk(clientResult)) {
    console.error('Failed to get client:', clientResult.error);
    return;
  }

  const client = clientResult.value;

  // Example 1: Create records
  console.log('\n=== Creating Records ===');

  const user = await client.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice',
      age: 30,
    },
  });

  console.log('Created user:', user);

  // Example 2: Query records
  console.log('\n=== Querying Records ===');

  const users = await client.user.findMany({
    where: {
      age: {
        gte: 18,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  console.log(`Found ${users.length} users`);

  // Example 3: Update records
  console.log('\n=== Updating Records ===');

  const updated = await client.user.update({
    where: { id: user.id },
    data: { name: 'Alice Updated' },
  });

  console.log('Updated user:', updated);

  // Example 4: Transactions
  console.log('\n=== Transactions ===');

  const txResult = await adapter.transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: 'bob@example.com',
        name: 'Bob',
      },
    });

    const post = await tx.post.create({
      data: {
        title: 'Hello World',
        content: 'This is my first post!',
        authorId: newUser.id,
        published: true,
      },
    });

    return { user: newUser, post };
  });

  if (isOk(txResult)) {
    console.log('Transaction completed:', txResult.value);
  } else {
    console.error('Transaction failed:', txResult.error);
  }

  // Example 5: Relations
  console.log('\n=== Working with Relations ===');

  const userWithPosts = await client.user.findUnique({
    where: { email: 'bob@example.com' },
    include: {
      posts: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  console.log('User with posts:', userWithPosts);

  // Example 6: Raw queries
  console.log('\n=== Raw Queries ===');

  const rawResult = await adapter.queryRaw<any[]>`
    SELECT u.name, COUNT(p.id) as postCount
    FROM User u
    LEFT JOIN Post p ON u.id = p.authorId
    GROUP BY u.id, u.name
    HAVING COUNT(p.id) > 0
  `;

  if (isOk(rawResult)) {
    console.log('Users with post counts:', rawResult.value);
  }

  // Example 7: Aggregations
  console.log('\n=== Aggregations ===');

  const stats = await client.user.aggregate({
    _count: true,
    _avg: {
      age: true,
    },
    _max: {
      age: true,
    },
    _min: {
      age: true,
    },
  });

  console.log('User statistics:', stats);

  // Example 8: Batch operations
  console.log('\n=== Batch Operations ===');

  const createMany = await client.post.createMany({
    data: [
      { title: 'Post 1', authorId: user.id },
      { title: 'Post 2', authorId: user.id },
      { title: 'Post 3', authorId: user.id },
    ],
  });

  console.log(`Created ${createMany.count} posts`);

  // Example 9: Upsert
  console.log('\n=== Upsert ===');

  const upserted = await client.user.upsert({
    where: { email: 'charlie@example.com' },
    create: {
      email: 'charlie@example.com',
      name: 'Charlie',
    },
    update: {
      name: 'Charlie Updated',
    },
  });

  console.log('Upserted user:', upserted);

  // Example 10: Filtering with complex conditions
  console.log('\n=== Complex Filtering ===');

  const filtered = await client.post.findMany({
    where: {
      OR: [
        { published: true },
        {
          AND: [
            { title: { contains: 'important' } },
            { createdAt: { gte: new Date('2024-01-01') } },
          ],
        },
      ],
    },
    include: {
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  console.log(`Found ${filtered.length} posts matching criteria`);

  // Example 11: Pagination
  console.log('\n=== Pagination ===');

  const page = 1;
  const pageSize = 10;

  const paginatedPosts = await client.post.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: 'desc' },
  });

  const totalPosts = await client.post.count();

  console.log(`Page ${page}: ${paginatedPosts.length} posts (of ${totalPosts} total)`);

  // Example 12: Delete operations
  console.log('\n=== Delete Operations ===');

  const deleted = await client.post.deleteMany({
    where: {
      published: false,
      createdAt: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    },
  });

  console.log(`Deleted ${deleted.count} unpublished posts older than 30 days`);

  // Health check
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('\n✓ Health status:', healthResult.value.status);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();

  console.log('\n✓ Example completed');
  console.log('\nPrisma provides:');
  console.log('  - Type-safe database queries');
  console.log('  - Automatic migrations');
  console.log('  - Intuitive data model');
  console.log('  - Auto-completion in your IDE');
  console.log('  - Support for multiple databases');
}

main().catch(console.error);
