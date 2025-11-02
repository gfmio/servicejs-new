/**
 * Queue management example
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
    queueName: 'managed-queue',
    defaultJobOptions: {
      attempts: 3,
      backoff: 2000,
      removeOnComplete: true,
    },
  });

  await adapter.start();

  console.log('=== Add Multiple Jobs ===');

  // Add several jobs
  const jobs = [];
  for (let i = 0; i < 5; i++) {
    const result = await adapter.addJob('process-data', {
      id: i,
      data: `Item ${i}`,
    });

    if (isOk(result)) {
      jobs.push(result.value);
      console.log(`Added job ${i + 1}:`, result.value.id);
    }
  }

  console.log('\n=== Pause Queue ===');

  // Pause processing
  const pauseResult = await adapter.pause();
  if (isOk(pauseResult)) {
    console.log('Queue paused - no jobs will be processed');
  }

  // Add processor
  await adapter.process('process-data', async (job) => {
    console.log(`Processing job ${job.id}: ${job.data.data}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { processed: true };
  });

  await new Promise(resolve => setTimeout(resolve, 200));

  console.log('\n=== Check Status While Paused ===');

  let countsResult = await adapter.getJobCounts();
  if (isOk(countsResult)) {
    console.log('Jobs waiting:', countsResult.value.waiting);
    console.log('Jobs active:', countsResult.value.active);
  }

  console.log('\n=== Resume Queue ===');

  // Resume processing
  const resumeResult = await adapter.resume();
  if (isOk(resumeResult)) {
    console.log('Queue resumed - processing will continue');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Check Status After Resume ===');

  countsResult = await adapter.getJobCounts();
  if (isOk(countsResult)) {
    console.log('Jobs waiting:', countsResult.value.waiting);
    console.log('Jobs active:', countsResult.value.active);
    console.log('Jobs completed:', countsResult.value.completed);
  }

  console.log('\n=== Get Individual Job ===');

  if (jobs.length > 0) {
    const jobResult = await adapter.getJob(jobs[0].id);
    if (isOk(jobResult) && jobResult.value) {
      console.log('Retrieved job:', jobResult.value.id);
      console.log('  Name:', jobResult.value.name);
      console.log('  Attempts:', jobResult.value.attempts);
    }
  }

  console.log('\n=== Remove Specific Job ===');

  if (jobs.length > 1) {
    const removeResult = await adapter.removeJob(jobs[1].id);
    if (isOk(removeResult)) {
      console.log(`Removed job: ${jobs[1].id}`);

      const checkResult = await adapter.getJob(jobs[1].id);
      if (isOk(checkResult)) {
        console.log('Job exists after removal:', checkResult.value !== null);
      }
    }
  }

  console.log('\n=== Clean Completed Jobs ===');

  const cleanResult = await adapter.clean(60000, 'completed');
  if (isOk(cleanResult)) {
    console.log('Cleaned jobs:', cleanResult.value);
  }

  console.log('\n=== Final Queue Status ===');

  countsResult = await adapter.getJobCounts();
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
