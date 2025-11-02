/**
 * Basic BullMQ adapter usage
 */

import { createBullMQAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createBullMQAdapter();

  // Initialize with Redis config
  await adapter.init({
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    queueName: 'email-queue',
    defaultJobOptions: {
      attempts: 3,
      backoff: 1000,
    },
  });

  await adapter.start();

  console.log('=== Add Job ===');

  // Add a job to the queue
  const addResult = await adapter.addJob('send-email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thanks for signing up.',
  });

  if (isOk(addResult)) {
    console.log('Job added:', addResult.value.id);
    console.log('  Name:', addResult.value.name);
    console.log('  Data:', addResult.value.data);

    console.log('\n=== Register Processor ===');

    // Register a processor for the job
    await adapter.process('send-email', async (job) => {
      console.log(`Processing job ${job.id}...`);
      console.log('  To:', job.data.to);
      console.log('  Subject:', job.data.subject);

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));

      return { sent: true, timestamp: new Date() };
    });

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('\n=== Get Job Progress ===');

    const progressResult = await adapter.getJobProgress(addResult.value.id);
    if (isOk(progressResult)) {
      console.log('Job status:', progressResult.value.status);
      console.log('Progress:', `${progressResult.value.progress}%`);
    }

    console.log('\n=== Get Job Counts ===');

    const countsResult = await adapter.getJobCounts();
    if (isOk(countsResult)) {
      console.log('Queue stats:');
      console.log('  Waiting:', countsResult.value.waiting);
      console.log('  Active:', countsResult.value.active);
      console.log('  Completed:', countsResult.value.completed);
      console.log('  Failed:', countsResult.value.failed);
      console.log('  Delayed:', countsResult.value.delayed);
    }
  }

  await adapter.stop();
}

main().catch(console.error);
