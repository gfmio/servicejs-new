# @servicejs/adapter-bullmq

BullMQ adapter for ServiceJS - provides Redis-based job queue functionality with priorities, delays, retries, and rate limiting.

## Features

- **Job Priorities**: Execute high-priority jobs first
- **Delayed Jobs**: Schedule jobs to run at a specific time
- **Job Retries**: Automatic retry with exponential backoff
- **Rate Limiting**: Control job processing rate
- **Job Progress**: Track job status and progress
- **Queue Management**: Pause, resume, and clean queues
- **Error Handling**: Comprehensive error handling with Result types

## Installation

```bash
npm install @servicejs/adapter-bullmq
```

## Usage

### Basic Usage

```typescript
import { createBullMQAdapter } from '@servicejs/adapter-bullmq';
import { isOk } from '@servicejs/result';

const adapter = createBullMQAdapter();

await adapter.init({
  redis: {
    host: 'localhost',
    port: 6379,
  },
  queueName: 'my-queue',
});

await adapter.start();

// Add a job
const result = await adapter.addJob('send-email', {
  to: 'user@example.com',
  subject: 'Hello',
});

// Register a processor
await adapter.process('send-email', async (job) => {
  console.log('Sending email to:', job.data.to);
  return { sent: true };
});
```

### Delayed Jobs

```typescript
// Execute immediately
await adapter.addJob('task', { message: 'Now' });

// Execute after 5 seconds
await adapter.addJob('task', { message: 'Later' }, {
  delay: 5000,
});

// High priority job
await adapter.addJob('task', { message: 'Important' }, {
  priority: 10,
});
```

### Job Monitoring

```typescript
// Get job progress
const progressResult = await adapter.getJobProgress(jobId);
if (isOk(progressResult)) {
  console.log('Status:', progressResult.value.status);
  console.log('Progress:', progressResult.value.progress);
}

// Get queue statistics
const countsResult = await adapter.getJobCounts();
if (isOk(countsResult)) {
  console.log('Waiting:', countsResult.value.waiting);
  console.log('Active:', countsResult.value.active);
  console.log('Completed:', countsResult.value.completed);
}
```

### Queue Management

```typescript
// Pause queue
await adapter.pause();

// Resume queue
await adapter.resume();

// Clean completed jobs older than 1 hour
await adapter.clean(3600000, 'completed');

// Remove specific job
await adapter.removeJob(jobId);
```

## API Reference

### `createBullMQAdapter()`

Creates a new BullMQ adapter instance.

### Methods

#### `init(config: BullMQConfig): Promise<Result<void, Error>>`

Initialize the adapter with Redis configuration.

**Config options:**
- `redis`: Redis connection settings
  - `host`: Redis hostname
  - `port`: Redis port
  - `password?`: Optional password
  - `db?`: Optional database number
- `queueName`: Name of the queue
- `defaultJobOptions?`: Default options for jobs
  - `priority?`: Job priority (higher = more important)
  - `delay?`: Delay in milliseconds
  - `attempts?`: Number of retry attempts
  - `backoff?`: Backoff delay between retries
- `rateLimiter?`: Rate limiting configuration
  - `max`: Maximum jobs per duration
  - `duration`: Time window in milliseconds

#### `addJob<T>(name: string, data: T, options?: Partial<Job<T>>): Promise<Result<Job<T>, Error>>`

Add a job to the queue.

#### `getJob(jobId: string): Promise<Result<Job | null, Error>>`

Get job by ID.

#### `removeJob(jobId: string): Promise<Result<void, Error>>`

Remove a job from the queue.

#### `process<T, R>(name: string, processor: JobProcessor<T, R>): Promise<Result<void, Error>>`

Register a processor function for jobs with the given name.

#### `getJobProgress(jobId: string): Promise<Result<JobProgress, Error>>`

Get progress information for a specific job.

#### `getJobCounts(): Promise<Result<JobCounts, Error>>`

Get counts of jobs in different states (waiting, active, completed, failed, delayed).

#### `pause(): Promise<Result<void, Error>>`

Pause job processing.

#### `resume(): Promise<Result<void, Error>>`

Resume job processing.

#### `clean(grace: number, status: 'completed' | 'failed'): Promise<Result<number, Error>>`

Clean jobs older than the grace period (in milliseconds).

## Examples

See the `examples/` directory for more examples:
- `basic.ts` - Basic job queue operations
- `delayed-jobs.ts` - Delayed and prioritized jobs
- `queue-management.ts` - Pause, resume, and clean operations

## Notes

- This is a mock implementation for demonstration
- In production, integrate with the actual BullMQ library
- All operations return `Result<T, Error>` for type-safe error handling
- Jobs are processed asynchronously with configurable concurrency
- Failed jobs are automatically retried based on configuration

## License

MIT
