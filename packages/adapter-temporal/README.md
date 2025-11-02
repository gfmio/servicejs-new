# @servicejs/adapter-temporal

Temporal adapter for ServiceJS - provides workflow orchestration with durable execution, activity definitions, and automatic compensation logic.

## Features

- **Durable Execution**: Workflows survive failures and restarts
- **Activity Definitions**: Break workflows into reusable activities
- **Automatic Compensation**: Saga pattern with automatic rollback
- **Long-Running Workflows**: Support for workflows that run for days or weeks
- **Workflow State**: Track workflow status and history
- **Type-Safe**: Full TypeScript support with generic types
- **Error Handling**: Comprehensive error handling with Result types

## Installation

```bash
npm install @servicejs/adapter-temporal
```

## Usage

### Basic Usage

```typescript
import { createTemporalAdapter } from '@servicejs/adapter-temporal';
import { isOk } from '@servicejs/result';

const adapter = createTemporalAdapter();

await adapter.init({
  namespace: 'default',
  taskQueue: 'my-tasks',
});

await adapter.start();

// Register an activity
await adapter.registerActivity({
  name: 'send-email',
  execute: async (input) => {
    console.log('Sending email to:', input.to);
    return { sent: true };
  },
});

// Execute workflow
const result = await adapter.executeWorkflow('order-workflow', {
  orderId: '123',
}, [
  {
    activity: 'send-email',
    input: (prev) => ({ to: 'user@example.com' }),
  },
]);
```

### Compensation (Saga Pattern)

```typescript
// Activity with compensation logic
await adapter.registerActivity({
  name: 'charge-payment',
  execute: async (input) => {
    // Charge the payment
    return { transactionId: 'tx_123', charged: true };
  },
  compensate: async (input, output) => {
    // Refund if workflow fails
    console.log('Refunding:', output.transactionId);
  },
});

// If any activity fails, previous activities are compensated
const result = await adapter.executeWorkflow('order', {}, [
  { activity: 'reserve-inventory', input: {} },
  { activity: 'charge-payment', input: {} },
  { activity: 'create-shipment', input: {} }, // If this fails...
]); // ...previous activities are compensated automatically
```

### Workflow Management

```typescript
// Start a workflow
const workflowIdResult = await adapter.startWorkflow('data-processing', {
  batchId: 'BATCH_1',
});

if (isOk(workflowIdResult)) {
  const workflowId = workflowIdResult.value;

  // Get workflow status
  const workflowResult = await adapter.getWorkflow(workflowId);
  if (isOk(workflowResult) && workflowResult.value) {
    console.log('Status:', workflowResult.value.status);
    console.log('Steps:', workflowResult.value.steps);
  }

  // Cancel workflow
  await adapter.cancelWorkflow(workflowId);
}
```

## API Reference

### `createTemporalAdapter()`

Creates a new Temporal adapter instance.

### Methods

#### `init(config: TemporalConfig): Promise<Result<void, Error>>`

Initialize the adapter.

**Config options:**
- `namespace?`: Temporal namespace
- `taskQueue?`: Task queue name
- `serverUrl?`: Temporal server URL
- `workflowTimeout?`: Workflow timeout in milliseconds
- `activityTimeout?`: Activity timeout in milliseconds

#### `registerActivity<TInput, TOutput>(activity: Activity<TInput, TOutput>): Promise<Result<void, Error>>`

Register an activity with optional compensation logic.

**Activity interface:**
- `name`: Activity name
- `execute`: Function to execute the activity
- `compensate?`: Optional compensation function (for Saga pattern)

#### `startWorkflow(name: string, input: any): Promise<Result<string, Error>>`

Start a workflow and return its ID.

#### `getWorkflow(workflowId: string): Promise<Result<Workflow | null, Error>>`

Get workflow status and history.

#### `cancelWorkflow(workflowId: string): Promise<Result<void, Error>>`

Cancel a running workflow.

#### `executeWorkflow<T>(name: string, input: any, steps: WorkflowStep[]): Promise<Result<WorkflowResult<T>, Error>>`

Execute a complete workflow with multiple steps.

**WorkflowStep:**
- `activity`: Name of the activity to execute
- `input`: Input for the activity (can be a function that transforms previous result)

## Examples

See the `examples/` directory for more examples:
- `basic.ts` - Basic workflow execution with activities
- `compensation.ts` - Saga pattern with automatic compensation
- `workflow-management.ts` - Managing workflows (start, get status, cancel)

## Notes

- This is a mock implementation for demonstration
- In production, integrate with the actual Temporal.io platform
- All operations return `Result<T, Error>` for type-safe error handling
- Compensation logic (Saga pattern) executes automatically on failure
- Workflows are durable and can be resumed after failures

## License

MIT
