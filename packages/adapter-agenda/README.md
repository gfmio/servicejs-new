# @servicejs/adapter-agenda

Agenda adapter for ServiceJS - provides MongoDB-based job scheduling with recurring jobs, human-readable intervals, and flexible job management.

## Features

- **MongoDB-Based**: Persistent job storage using MongoDB
- **Recurring Jobs**: Schedule jobs with human-readable intervals (every minute, every 5 minutes, every hour, every day)
- **Job Priorities**: Control job execution order with priorities
- **Flexible Scheduling**: One-time jobs, recurring jobs, or immediate execution
- **Job Management**: Query, cancel, and manage scheduled jobs
- **Pause/Resume**: Control job execution flow
- **Error Handling**: Comprehensive error handling with Result types

## Installation

```bash
npm install @servicejs/adapter-agenda
```

## Usage

### Basic Usage

```typescript
import { createAgendaAdapter } from '@servicejs/adapter-agenda';
import { isOk } from '@servicejs/result';

const adapter = createAgendaAdapter();

await adapter.init({
  mongodb: {
    url: 'mongodb://localhost:27017/mydb',
  },
});

await adapter.start();

// Define a job
await adapter.define('send-email', async (job) => {
  console.log('Sending email to:', job.data.to);
});

// Schedule a one-time job
await adapter.schedule(new Date(), 'send-email', {
  to: 'user@example.com',
});

// Schedule immediate execution
await adapter.now('send-email', { to: 'urgent@example.com' });
```

### Recurring Jobs

```typescript
// Schedule with human-readable intervals
await adapter.scheduleEvery('every minute', 'sync-data');
await adapter.scheduleEvery('every 5 minutes', 'cleanup');
await adapter.scheduleEvery('every hour', 'generate-report');
await adapter.scheduleEvery('every day', 'daily-summary');
```

### Job Management

```typescript
// Get all jobs for a specific name
const jobsResult = await adapter.getJobs({ name: 'send-email' });
if (isOk(jobsResult)) {
  console.log(`Found ${jobsResult.value.length} jobs`);
}

// Cancel jobs by query
const cancelResult = await adapter.cancel({ name: 'send-email' });
if (isOk(cancelResult)) {
  console.log(`Cancelled ${cancelResult.value} jobs`);
}

// Pause and resume
await adapter.pause();  // Stop processing jobs
await adapter.resume(); // Resume processing
```

## API Reference

### `createAgendaAdapter()`

Creates a new Agenda adapter instance.

### Methods

#### `init(config: AgendaConfig): Promise<Result<void, Error>>`

Initialize the adapter with MongoDB configuration.

**Config options:**
- `mongodb`: MongoDB connection settings
  - `url`: MongoDB connection URL
  - `collection?`: Optional collection name
  - `options?`: MongoDB client options
- `defaultConcurrency?`: Default job concurrency
- `maxConcurrency?`: Maximum job concurrency
- `lockLimit?`: Maximum number of locked jobs
- `defaultLockLifetime?`: Lock lifetime in milliseconds
- `processEvery?`: How often to check for jobs (e.g., '5 seconds')

#### `define(name: string, processor: JobProcessor, options?): Promise<Result<void, Error>>`

Define a job processor function.

**Options:**
- `priority?`: Job priority ('highest', 'high', 'normal', 'low', 'lowest')
- `concurrency?`: Job concurrency limit

#### `schedule(when: string | Date, name: string, data?: any): Promise<Result<JobInstance, Error>>`

Schedule a one-time job.

#### `scheduleEvery(interval: string, name: string, data?: any): Promise<Result<JobInstance, Error>>`

Schedule a recurring job with human-readable interval.

**Supported intervals:**
- 'every minute'
- 'every 5 minutes'
- 'every hour'
- 'every day'

#### `now(name: string, data?: any): Promise<Result<JobInstance, Error>>`

Schedule a job to run immediately.

#### `getJobs(query): Promise<Result<JobInstance[], Error>>`

Get jobs matching the query.

#### `cancel(query): Promise<Result<number, Error>>`

Cancel jobs matching the query. Returns the number of jobs cancelled.

#### `pause(): Promise<Result<void, Error>>`

Pause job processing.

#### `resume(): Promise<Result<void, Error>>`

Resume job processing.

## Examples

See the `examples/` directory for more examples:
- `basic.ts` - Basic job scheduling and processing
- `recurring-jobs.ts` - Recurring jobs with different intervals
- `job-management.ts` - Job querying, cancellation, and control

## Notes

- This is a mock implementation for demonstration
- In production, integrate with the actual Agenda library
- All operations return `Result<T, Error>` for type-safe error handling
- Jobs are persisted in MongoDB for durability
- Human-readable intervals make scheduling intuitive

## License

MIT
