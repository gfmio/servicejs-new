/**
 * Basic AWS EventBridge adapter usage example
 *
 * Demonstrates event bus operations, rules, and targets
 */

import { createEventBridgeAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const eventBridge = createEventBridgeAdapter();

  // Initialize with AWS credentials
  const initResult = await eventBridge.init({
    region: 'us-east-1',
    // For local testing with LocalStack:
    // endpoint: 'http://localhost:4566',
    // credentials: {
    //   accessKeyId: 'test',
    //   secretAccessKey: 'test',
    // },
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  console.log('✓ Initialized EventBridge adapter');

  await eventBridge.start();
  console.log('✓ Started EventBridge adapter');

  // Get event bus info
  console.log('\n=== Event Bus Info ===');
  const busResult = await eventBridge.describeEventBus();
  if (isOk(busResult)) {
    console.log('Event Bus Name:', busResult.value.name);
    console.log('Event Bus ARN:', busResult.value.arn);
  }

  // Send events
  console.log('\n=== Sending Events ===');

  const eventsResult = await eventBridge.putEvents([
    {
      source: 'my.application',
      detailType: 'user.created',
      detail: {
        userId: '123',
        email: 'alice@example.com',
        name: 'Alice',
        timestamp: new Date().toISOString(),
      },
    },
    {
      source: 'my.application',
      detailType: 'user.updated',
      detail: {
        userId: '123',
        email: 'alice.new@example.com',
        timestamp: new Date().toISOString(),
      },
    },
  ]);

  if (isOk(eventsResult)) {
    console.log('✓ Sent 2 events');
    console.log('Failed count:', eventsResult.value.failedEntryCount);
    eventsResult.value.entries.forEach((entry, i) => {
      if (entry.eventId) {
        console.log(`  Event ${i + 1} ID:`, entry.eventId);
      } else {
        console.log(`  Event ${i + 1} failed:`, entry.errorMessage);
      }
    });
  }

  // Create rules
  console.log('\n=== Creating Rules ===');

  const userRuleResult = await eventBridge.putRule({
    name: 'user-events-rule',
    eventPattern: {
      source: ['my.application'],
      'detail-type': ['user.created', 'user.updated', 'user.deleted'],
    },
    description: 'Route all user events to processing targets',
  });

  if (isOk(userRuleResult)) {
    console.log('✓ Created user events rule');
    console.log('  Rule ARN:', userRuleResult.value.ruleArn);
  }

  const orderRuleResult = await eventBridge.putRule({
    name: 'order-events-rule',
    eventPattern: {
      source: ['my.application'],
      'detail-type': ['order.placed', 'order.fulfilled'],
      detail: {
        amount: [{ numeric: ['>', 1000] }], // Orders over $1000
      },
    },
    description: 'Route high-value orders',
  });

  if (isOk(orderRuleResult)) {
    console.log('✓ Created order events rule');
    console.log('  Rule ARN:', orderRuleResult.value.ruleArn);
  }

  // List rules
  console.log('\n=== Listing Rules ===');
  const listResult = await eventBridge.listRules();
  if (isOk(listResult)) {
    console.log(`Found ${listResult.value.length} rules:`);
    listResult.value.forEach(rule => {
      console.log(`  - ${rule.name} (${rule.state})`);
      if (rule.description) {
        console.log(`    ${rule.description}`);
      }
    });
  }

  // Add targets to rules
  console.log('\n=== Adding Targets ===');

  const targetsResult = await eventBridge.putTargets('user-events-rule', [
    {
      id: '1',
      arn: 'arn:aws:lambda:us-east-1:123456789012:function:ProcessUserEvents',
      roleArn: 'arn:aws:iam::123456789012:role/EventBridgeRole',
    },
    {
      id: '2',
      arn: 'arn:aws:sqs:us-east-1:123456789012:user-events-queue',
      roleArn: 'arn:aws:iam::123456789012:role/EventBridgeRole',
    },
  ]);

  if (isOk(targetsResult)) {
    console.log('✓ Added 2 targets to user-events-rule');
    console.log('  Failed count:', targetsResult.value.failedEntryCount);
  }

  // Send more events to trigger rules
  console.log('\n=== Sending Events That Match Rules ===');

  const moreEventsResult = await eventBridge.putEvents([
    {
      source: 'my.application',
      detailType: 'order.placed',
      detail: {
        orderId: 'ORD-001',
        amount: 1500,
        customerId: '123',
        timestamp: new Date().toISOString(),
      },
      resources: ['arn:aws:orders:us-east-1:123456789012:order/ORD-001'],
    },
    {
      source: 'my.application',
      detailType: 'user.deleted',
      detail: {
        userId: '456',
        reason: 'account_closure',
        timestamp: new Date().toISOString(),
      },
    },
  ]);

  if (isOk(moreEventsResult)) {
    console.log('✓ Sent events that will be routed by rules');
  }

  // Remove targets
  console.log('\n=== Removing Targets ===');

  const removeResult = await eventBridge.removeTargets('user-events-rule', ['2']);
  if (isOk(removeResult)) {
    console.log('✓ Removed target from user-events-rule');
  }

  // Delete rule
  console.log('\n=== Deleting Rule ===');

  // Must remove all targets first
  await eventBridge.removeTargets('user-events-rule', ['1']);

  const deleteResult = await eventBridge.deleteRule('user-events-rule');
  if (isOk(deleteResult)) {
    console.log('✓ Deleted user-events-rule');
  }

  // Health check
  const healthResult = await eventBridge.health();
  if (isOk(healthResult)) {
    console.log('\n✓ Health status:', healthResult.value.status);
  }

  // Cleanup
  await eventBridge.stop();
  await eventBridge.destroy();

  console.log('\n✓ Example completed');
  console.log('\nUse cases for AWS EventBridge:');
  console.log('  - Serverless event routing');
  console.log('  - Cross-account event delivery');
  console.log('  - SaaS integration events');
  console.log('  - Application integration');
  console.log('  - Schedule-based events (cron)');
}

main().catch(console.error);
