/**
 * Basic MongoDB adapter example
 *
 * This example demonstrates:
 * - Connecting to MongoDB
 * - CRUD operations (insert, find, update, delete)
 * - Querying with filters, projections, sorting, pagination
 * - Aggregation pipeline
 * - Transaction management
 * - Change streams (watching for real-time changes)
 */

import { createMongoDBAdapter } from '../src/mongodb.js';
import { isOk } from '@servicejs/result';

interface User {
  _id?: any;
  name: string;
  age: number;
  city?: string;
  email?: string;
}

interface Order {
  _id?: any;
  userId: string;
  product: string;
  quantity: number;
  price: number;
  date: Date;
}

async function main() {
  // Create adapter
  const db = createMongoDBAdapter();

  // Initialize connection
  console.log('Connecting to MongoDB...');
  const initResult = await db.init({
    url: 'mongodb://localhost:27017',
    database: 'example',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.err);
    return;
  }

  await db.start();
  console.log('Connected!');

  // Clean up existing data
  await db.deleteMany('users', {});
  await db.deleteMany('orders', {});

  // Basic CRUD Operations
  console.log('\n=== Basic CRUD Operations ===');

  // Insert one document
  console.log('\nInserting a user...');
  const insertResult = await db.insertOne('users', {
    name: 'Alice',
    age: 30,
    city: 'New York',
    email: 'alice@example.com',
  });

  if (isOk(insertResult)) {
    console.log('Inserted user with ID:', insertResult.ok.id);
  }

  // Insert many documents
  console.log('\nInserting multiple users...');
  const insertManyResult = await db.insertMany('users', [
    { name: 'Bob', age: 25, city: 'Los Angeles', email: 'bob@example.com' },
    { name: 'Charlie', age: 35, city: 'Chicago', email: 'charlie@example.com' },
    { name: 'Diana', age: 28, city: 'New York', email: 'diana@example.com' },
  ]);

  if (isOk(insertManyResult)) {
    console.log('Inserted users:', insertManyResult.ok.ids.length);
  }

  // Find one document
  console.log('\nFinding Alice...');
  const findResult = await db.findOne<User>('users', { name: 'Alice' });
  if (isOk(findResult) && findResult.ok) {
    console.log('Found:', findResult.ok);
  }

  // Update one document
  console.log('\nUpdating Alice...');
  const updateResult = await db.updateOne(
    'users',
    { name: 'Alice' },
    { $set: { age: 31, city: 'San Francisco' } }
  );

  if (isOk(updateResult)) {
    console.log('Modified count:', updateResult.ok.modifiedCount);
  }

  // Update many documents
  console.log('\nUpdating all users in New York...');
  const updateManyResult = await db.updateMany(
    'users',
    { city: 'New York' },
    { $set: { timezone: 'EST' } }
  );

  if (isOk(updateManyResult)) {
    console.log('Modified count:', updateManyResult.ok.modifiedCount);
  }

  // Count documents
  console.log('\nCounting users...');
  const countResult = await db.countDocuments('users');
  if (isOk(countResult)) {
    console.log('Total users:', countResult.ok);
  }

  const countFilterResult = await db.countDocuments('users', { age: { $gte: 30 } });
  if (isOk(countFilterResult)) {
    console.log('Users 30 or older:', countFilterResult.ok);
  }

  // Query Operations
  console.log('\n=== Query Operations ===');

  // Query with filter
  console.log('\nQuerying users 30 or older...');
  const queryResult = await db.query<User>({
    collection: 'users',
    filter: { age: { $gte: 30 } },
  });

  if (isOk(queryResult)) {
    console.log('Results:', queryResult.ok.rows);
  }

  // Query with projection (select specific fields)
  console.log('\nQuerying with projection...');
  const projectionResult = await db.query({
    collection: 'users',
    filter: {},
    projection: { name: 1, age: 1, _id: 0 },
  });

  if (isOk(projectionResult)) {
    console.log('Name and age only:', projectionResult.ok.rows);
  }

  // Query with sorting
  console.log('\nQuerying with sort (by age descending)...');
  const sortResult = await db.query<User>({
    collection: 'users',
    filter: {},
    sort: { age: -1 },
  });

  if (isOk(sortResult)) {
    console.log('Sorted by age:', sortResult.ok.rows.map((u) => ({ name: u.name, age: u.age })));
  }

  // Query with pagination
  console.log('\nQuerying with pagination (page 2, size 2)...');
  const paginationResult = await db.query<User>({
    collection: 'users',
    filter: {},
    sort: { name: 1 },
    skip: 2,
    limit: 2,
  });

  if (isOk(paginationResult)) {
    console.log('Page 2:', paginationResult.ok.rows.map((u) => u.name));
  }

  // Aggregation Pipeline
  console.log('\n=== Aggregation Pipeline ===');

  // Create sample orders
  await db.insertMany('orders', [
    { userId: 'alice', product: 'Widget', quantity: 5, price: 10, date: new Date('2024-01-15') },
    { userId: 'alice', product: 'Gadget', quantity: 2, price: 20, date: new Date('2024-01-20') },
    { userId: 'bob', product: 'Widget', quantity: 3, price: 10, date: new Date('2024-01-18') },
    { userId: 'bob', product: 'Gadget', quantity: 4, price: 20, date: new Date('2024-01-25') },
    { userId: 'charlie', product: 'Widget', quantity: 10, price: 10, date: new Date('2024-01-22') },
  ]);

  // Aggregate: Total revenue per user
  console.log('\nCalculating total revenue per user...');
  const revenueResult = await db.aggregate({
    collection: 'orders',
    pipeline: [
      {
        $group: {
          _id: '$userId',
          totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ],
  });

  if (isOk(revenueResult)) {
    console.log('Revenue by user:', revenueResult.ok);
  }

  // Aggregate: Product statistics
  console.log('\nCalculating product statistics...');
  const productStatsResult = await db.aggregate({
    collection: 'orders',
    pipeline: [
      {
        $group: {
          _id: '$product',
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } },
          avgQuantity: { $avg: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ],
  });

  if (isOk(productStatsResult)) {
    console.log('Product stats:', productStatsResult.ok);
  }

  // Transaction Operations
  console.log('\n=== Transaction Operations ===');

  // Create accounts for transfer example
  await db.deleteMany('accounts', {});
  await db.insertMany('accounts', [
    { name: 'Alice', balance: 100 },
    { name: 'Bob', balance: 50 },
  ]);

  // Successful transaction
  console.log('\nTransferring $20 from Alice to Bob...');
  const tx1Result = await db.begin();
  if (isOk(tx1Result)) {
    const tx = tx1Result.ok;

    try {
      // Deduct from Alice
      await db.updateOne('accounts', { name: 'Alice' }, { $inc: { balance: -20 } });

      // Add to Bob
      await db.updateOne('accounts', { name: 'Bob' }, { $inc: { balance: 20 } });

      await tx.commit();
      console.log('Transaction committed');
    } catch (error) {
      await tx.rollback();
      console.error('Transaction rolled back:', error);
    }
  }

  // Verify balances
  const aliceBalance = await db.findOne('accounts', { name: 'Alice' });
  const bobBalance = await db.findOne('accounts', { name: 'Bob' });

  if (isOk(aliceBalance) && isOk(bobBalance)) {
    console.log('Alice balance:', aliceBalance.ok?.balance); // Should be 80
    console.log('Bob balance:', bobBalance.ok?.balance); // Should be 70
  }

  // Change Streams (Real-time Monitoring)
  console.log('\n=== Change Streams ===');
  console.log('Setting up change stream to watch users collection...');

  const watchResult = await db.watch('users', {
    fullDocument: 'updateLookup',
  });

  if (isOk(watchResult)) {
    const changeStream = watchResult.ok;

    // Set up event listener
    changeStream.on('change', (change) => {
      console.log('Detected change:', {
        operation: change.operationType,
        documentKey: change.documentKey,
      });
    });

    // Make some changes to trigger events
    console.log('\nMaking changes to trigger events...');
    await db.insertOne('users', { name: 'Eve', age: 32 });
    await db.updateOne('users', { name: 'Eve' }, { $set: { age: 33 } });
    await db.deleteOne('users', { name: 'Eve' });

    // Wait a bit for events to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Close the change stream
    await changeStream.close();
    console.log('Change stream closed');
  }

  // Complex Aggregation Example
  console.log('\n=== Complex Aggregation ===');
  const complexAggResult = await db.aggregate({
    collection: 'orders',
    pipeline: [
      // Match orders from January 2024
      {
        $match: {
          date: {
            $gte: new Date('2024-01-01'),
            $lt: new Date('2024-02-01'),
          },
        },
      },
      // Calculate order total
      {
        $addFields: {
          total: { $multiply: ['$quantity', '$price'] },
        },
      },
      // Group by user and product
      {
        $group: {
          _id: {
            userId: '$userId',
            product: '$product',
          },
          totalSpent: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      // Reshape output
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          product: '$_id.product',
          totalSpent: 1,
          orderCount: 1,
          avgOrderValue: { $divide: ['$totalSpent', '$orderCount'] },
        },
      },
      { $sort: { totalSpent: -1 } },
    ],
  });

  if (isOk(complexAggResult)) {
    console.log('Complex aggregation results:', complexAggResult.ok);
  }

  // Health Check
  console.log('\n=== Health Check ===');
  const healthResult = await db.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.ok.status);
  }

  // Cleanup
  console.log('\n=== Cleanup ===');
  console.log('Deleting test data...');
  await db.deleteMany('users', {});
  await db.deleteMany('orders', {});
  await db.deleteMany('accounts', {});

  // Disconnect
  await db.stop();
  await db.destroy();
  console.log('Disconnected');
}

main().catch(console.error);
