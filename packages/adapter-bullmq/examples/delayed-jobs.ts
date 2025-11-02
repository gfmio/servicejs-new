/**
 * Delayed jobs example
 */

import { createBullMQAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createBullMQAdapter();

  await adapter.init({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    queueName: 'scheduled-tasks',
  });

  await adapter.start();

  console.log('=== Schedule Delayed Jobs ===');

  // Add a job that executes immediately
  const immediateResult = await adapter.addJob('task', {
    message: 'Execute now',
  });

  if (isOk(immediateResult)) {
    console.log('Immediate job:', immediateResult.value.id);
  }

  // Add a job delayed by 5 seconds
  const delayedResult = await adapter.addJob('task', {
    message: 'Execute in 5 seconds',
  }, {
    delay: 5000,
  });

  if (isOk(delayedResult)) {
    console.log('Delayed job:', delayedResult.value.id);
    console.log('  Delay:', delayedResult.value.delay, 'ms');
  }

  // Add a job with priority
  const priorityResult = await adapter.addJob('task', {
    message: 'High priority task',
  }, {
    priority: 10, // Higher number = higher priority
  });

  if (isOk(priorityResult)) {
    console.log('Priority job:', priorityResult.value.id);
    console.log('  Priority:', priorityResult.value.priority);
  }

  console.log('\n=== Register Processor ===');

  await adapter.process('task', async (job) => {
    console.log(`[${new Date().toISOString()}] Processing:`, job.data.message);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { processed: true };
  });

  console.log('\n=== Monitor Job Status ===');

  // Check delayed job status
  if (isOk(delayedResult)) {
    const progressResult = await adapter.getJobProgress(delayedResult.value.id);
    if (isOk(progressResult)) {
      console.log(`Delayed job status: ${progressResult.value.status}`);
    }
  }

  // Wait for delayed job to become ready
  console.log('\nWaiting for delayed job to be ready...');
  await new Promise(resolve => setTimeout(resolve, 5500));

  if (isOk(delayedResult)) {
    const progressResult = await adapter.getJobProgress(delayedResult.value.id);
    if (isOk(progressResult)) {
      console.log(`Delayed job after wait: ${progressResult.value.status}`);
    }
  }

  console.log('\n=== Final Job Counts ===');

  const countsResult = await adapter.getJobCounts();
  if (isOk(countsResult)) {
    console.log('  Waiting:', countsResult.value.waiting);
    console.log('  Active:', countsResult.value.active);
    console.log('  Completed:', countsResult.value.completed);
    console.log('  Failed:', countsResult.value.failed);
    console.log('  Delayed:', countsResult.value.delayed);
  }

  await adapter.stop();
}

main().catch(console.error);
