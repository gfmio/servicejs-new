/**
 * Basic Agenda adapter usage
 */

import { createAgendaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAgendaAdapter();

  // Initialize with MongoDB config
  await adapter.init({
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/test',
    },
    processEvery: '5 seconds',
  });

  await adapter.start();

  console.log('=== Define Job ===');

  // Define a job processor
  await adapter.define('send-reminder', async (job) => {
    console.log(`Sending reminder: ${job.data.message}`);
    console.log('  User:', job.data.userId);
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  console.log('\n=== Schedule One-Time Job ===');

  // Schedule a job to run in 10 seconds
  const futureTime = new Date(Date.now() + 10000);
  const scheduleResult = await adapter.schedule(futureTime, 'send-reminder', {
    userId: 123,
    message: 'Your appointment is tomorrow',
  });

  if (isOk(scheduleResult)) {
    console.log('Scheduled job:', scheduleResult.value.id);
    console.log('  Will run at:', scheduleResult.value.nextRunAt);
  }

  console.log('\n=== Schedule Recurring Job ===');

  // Schedule a recurring job
  const recurringResult = await adapter.scheduleEvery(
    'every minute',
    'send-reminder',
    {
      userId: 456,
      message: 'Daily standup in 15 minutes',
    }
  );

  if (isOk(recurringResult)) {
    console.log('Recurring job:', recurringResult.value.id);
    console.log('  Schedule:', recurringResult.value.schedule);
    console.log('  Next run:', recurringResult.value.nextRunAt);
  }

  console.log('\n=== Schedule Job to Run Now ===');

  // Schedule immediate job
  const nowResult = await adapter.now('send-reminder', {
    userId: 789,
    message: 'Meeting started!',
  });

  if (isOk(nowResult)) {
    console.log('Immediate job:', nowResult.value.id);
  }

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\n=== Get All Jobs ===');

  const jobsResult = await adapter.getJobs({ name: 'send-reminder' });
  if (isOk(jobsResult)) {
    console.log(`Found ${jobsResult.value.length} jobs`);
    jobsResult.value.forEach(job => {
      console.log(`  - ${job.id}: ${job.name} (next: ${job.nextRunAt})`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
