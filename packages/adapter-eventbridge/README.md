# @servicejs/adapter-eventbridge

AWS EventBridge adapter for serverless event bus

## Installation

```bash
npm install @servicejs/adapter-eventbridge @aws-sdk/client-eventbridge
```

## Features

- ✅ Event publishing with source and detail type
- ✅ Rule-based event routing
- ✅ Event pattern matching
- ✅ Target management (Lambda, SQS, SNS, etc.)
- ✅ Multiple event bus support
- ✅ Cross-account event delivery
- ✅ Resource tagging support
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling
- ✅ LocalStack support for testing

## Usage

### Basic Event Publishing

```typescript
import { createEventBridgeAdapter } from '@servicejs/adapter-eventbridge';
import { isOk } from '@servicejs/result';

const eventBridge = createEventBridgeAdapter();

await eventBridge.init({
  region: 'us-east-1',
  // Optional: For LocalStack testing
  // endpoint: 'http://localhost:4566',
  // credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

await eventBridge.start();

// Send events
const result = await eventBridge.putEvents([
  {
    source: 'my.application',
    detailType: 'user.created',
    detail: {
      userId: '123',
      email: 'user@example.com',
      name: 'John Doe',
    },
  },
]);

if (isOk(result)) {
  console.log('Events sent:', result.value.entries.length);
  console.log('Failed:', result.value.failedEntryCount);
}
```

### Creating Rules

```typescript
// Create a rule to route events
const ruleResult = await eventBridge.putRule({
  name: 'user-events-rule',
  eventPattern: {
    source: ['my.application'],
    'detail-type': ['user.created', 'user.updated'],
  },
  description: 'Route user events to processing targets',
});

if (isOk(ruleResult)) {
  console.log('Rule ARN:', ruleResult.value.ruleArn);
}
```

### Adding Targets

```typescript
// Add Lambda function and SQS queue as targets
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
  console.log('Targets added, failed:', targetsResult.value.failedEntryCount);
}
```

### Complex Event Patterns

```typescript
// Match events with specific criteria
await eventBridge.putRule({
  name: 'high-value-orders',
  eventPattern: {
    source: ['my.application'],
    'detail-type': ['order.placed'],
    detail: {
      amount: [{ numeric: ['>', 1000] }],
      status: ['pending', 'processing'],
      region: [{ prefix: 'us-' }],
    },
  },
  description: 'High-value orders in US regions',
});
```

### Custom Event Bus

```typescript
await eventBridge.init({
  region: 'us-east-1',
  eventBusName: 'my-custom-event-bus',
});

// Events will be sent to the custom bus
await eventBridge.putEvents([
  {
    source: 'my.app',
    detailType: 'custom.event',
    detail: { data: 'value' },
  },
]);
```

## Configuration

```typescript
interface EventBridgeConfig {
  region: string;                    // AWS region
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;                 // Optional: Custom endpoint (e.g., LocalStack)
  eventBusName?: string;             // Default: 'default'
}
```

## API Reference

### Event Operations

```typescript
await eventBridge.putEvents(events: EventEntry[]): Promise<Result<{
  failedEntryCount: number;
  entries: Array<{
    eventId?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
}, Error>>
```

### Rule Management

```typescript
await eventBridge.putRule(rule: EventRule): Promise<Result<{ ruleArn: string }, Error>>
await eventBridge.deleteRule(ruleName: string): Promise<Result<void, Error>>
await eventBridge.listRules(): Promise<Result<Array<{
  name: string;
  arn: string;
  state: string;
  description?: string;
}>, Error>>
```

### Target Management

```typescript
await eventBridge.putTargets(
  ruleName: string,
  targets: EventTarget[]
): Promise<Result<{ failedEntryCount: number }, Error>>

await eventBridge.removeTargets(
  ruleName: string,
  targetIds: string[]
): Promise<Result<{ failedEntryCount: number }, Error>>
```

### Event Bus Info

```typescript
await eventBridge.describeEventBus(): Promise<Result<{
  name: string;
  arn: string;
  policy?: string;
}, Error>>
```

## Event Pattern Matching

EventBridge supports powerful event pattern matching:

### Exact Matching

```typescript
{
  source: ['my.application'],
  'detail-type': ['user.created']
}
```

### Prefix Matching

```typescript
{
  source: [{ prefix: 'aws.' }],
  'detail-type': [{ prefix: 'user.' }]
}
```

### Numeric Comparison

```typescript
{
  detail: {
    amount: [{ numeric: ['>', 1000] }],
    score: [{ numeric: ['>=', 80, '<=', 100] }]
  }
}
```

### Exists Matching

```typescript
{
  detail: {
    email: [{ exists: true }]
  }
}
```

### Array Matching

```typescript
{
  detail: {
    tags: ['premium', 'enterprise']  // Any of these values
  }
}
```

## Use Cases

### Microservices Integration

```typescript
// Service A emits events
await eventBridge.putEvents([
  {
    source: 'service.users',
    detailType: 'user.registered',
    detail: { userId: '123', tier: 'premium' },
  },
]);

// Rule routes to multiple services
await eventBridge.putRule({
  name: 'user-registration',
  eventPattern: {
    source: ['service.users'],
    'detail-type': ['user.registered'],
  },
});

// Targets: Email service, Analytics, CRM
await eventBridge.putTargets('user-registration', [
  { id: '1', arn: 'arn:aws:lambda:...:EmailService' },
  { id: '2', arn: 'arn:aws:lambda:...:Analytics' },
  { id: '3', arn: 'arn:aws:lambda:...:CRM' },
]);
```

### SaaS Integration

```typescript
// Receive events from SaaS partners
await eventBridge.putRule({
  name: 'stripe-webhooks',
  eventPattern: {
    source: ['aws.partner/stripe.com'],
    'detail-type': ['payment.succeeded', 'subscription.updated'],
  },
});
```

### Scheduled Events

```typescript
// Note: Use schedule expressions with PutRuleCommand directly
await eventBridge.putRule({
  name: 'daily-report',
  scheduleExpression: 'cron(0 9 * * ? *)',  // 9 AM UTC daily
  description: 'Generate daily reports',
});
```

### Cross-Account Events

```typescript
// Send events to another AWS account
await eventBridge.putEvents([
  {
    source: 'my.application',
    detailType: 'data.export',
    detail: { exportId: '123' },
    resources: ['arn:aws:s3:::shared-bucket/export-123'],
  },
]);
```

## Testing with LocalStack

```typescript
import { GenericContainer } from 'testcontainers';

const container = await new GenericContainer('localstack/localstack:latest')
  .withExposedPorts(4566)
  .withEnvironment({ SERVICES: 'events' })
  .start();

const eventBridge = createEventBridgeAdapter();
await eventBridge.init({
  region: 'us-east-1',
  endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});
```

## Target Types

EventBridge can route events to various AWS services:

- **Lambda Functions**: Process events with serverless functions
- **SQS Queues**: Queue events for reliable processing
- **SNS Topics**: Fan-out to multiple subscribers
- **Step Functions**: Orchestrate complex workflows
- **Kinesis Streams**: Stream processing pipelines
- **ECS Tasks**: Run containerized event processors
- **API Gateway**: HTTP endpoints
- **CloudWatch Logs**: Event logging and debugging

## Best Practices

1. **Use Descriptive Event Sources**: `my-app.users` instead of `app`
2. **Consistent Detail Types**: Use dot notation like `user.created`
3. **Include Correlation IDs**: Track events across services
4. **Version Your Events**: Include schema version in detail
5. **Use Resource ARNs**: Tag events with related resource ARNs
6. **Test Event Patterns**: Verify patterns match expected events
7. **Monitor Failed Entries**: Check `failedEntryCount` in responses
8. **Clean Up Rules**: Remove unused rules to reduce costs

## Error Handling

```typescript
const result = await eventBridge.putEvents([event]);

if (isErr(result)) {
  console.error('Failed to send events:', result.error);
  // Handle initialization or network errors
}

if (isOk(result) && result.value.failedEntryCount > 0) {
  // Some events failed validation or throttling
  result.value.entries.forEach((entry, i) => {
    if (entry.errorCode) {
      console.error(`Event ${i} failed:`, entry.errorMessage);
    }
  });
}
```

## Examples

- `examples/basic.ts` - Event bus operations, rules, and targets

## Related AWS Services

- **EventBridge Scheduler**: Schedule one-time and recurring events
- **EventBridge Pipes**: Connect event sources to targets
- **EventBridge Schema Registry**: Discover and manage event schemas

## License

MIT
