/**
 * Basic DynamoDB adapter usage example
 */

import { createDynamoDBAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createDynamoDBAdapter();

  // Initialize with AWS config
  const initResult = await adapter.init({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000', // For local DynamoDB
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter
  const startResult = await adapter.start();
  if (!isOk(startResult)) {
    console.error('Failed to start:', startResult.error);
    return;
  }

  // Check health
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.value.status);
  }

  // Create table
  const createResult = await adapter.createTable({
    tableName: 'users',
    keySchema: [{ attributeName: 'id', keyType: 'HASH' }],
    attributeDefinitions: [{ attributeName: 'id', attributeType: 'S' }],
  });

  if (!isOk(createResult)) {
    console.error('Failed to create table:', createResult.error);
  } else {
    console.log('Table created successfully');
  }

  // Put item
  const putResult = await adapter.putItem({
    tableName: 'users',
    item: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    },
  });

  if (isOk(putResult)) {
    console.log('Item inserted');
  }

  // Get item
  const getResult = await adapter.getItem({
    tableName: 'users',
    key: { id: 'user-1' },
  });

  if (isOk(getResult)) {
    console.log('Retrieved item:', getResult.value.item);
  }

  // Query items
  const queryResult = await adapter.query({
    tableName: 'users',
    keyConditionExpression: 'id = :id',
    expressionAttributeValues: {
      ':id': 'user-1',
    },
  });

  if (isOk(queryResult)) {
    console.log('Query results:', queryResult.value.items);
  }

  // Update item
  const updateResult = await adapter.updateItem({
    tableName: 'users',
    key: { id: 'user-1' },
    updateExpression: 'SET age = :age',
    expressionAttributeValues: {
      ':age': 31,
    },
  });

  if (isOk(updateResult)) {
    console.log('Item updated');
  }

  // Delete item
  const deleteResult = await adapter.deleteItem({
    tableName: 'users',
    key: { id: 'user-1' },
  });

  if (isOk(deleteResult)) {
    console.log('Item deleted');
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
