/**
 * Job management example
 */

import { createAgendaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAgendaAdapter();

  await adapter.init({
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/test',
    },
    defaultConcurrency: 5,
    processEvery: '2 seconds',
  });

  await adapter.start();

  console.log('=== Define Multiple Job Types ===');

  const jobTypes = ['process-order', 'send-notification', 'update-inventory'];

  for (const jobType of jobTypes) {
    await adapter.define(jobType, async (job) => {
      console.log(`[${jobType}] Processing:`, job.data);
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    console.log(`Defined: ${jobType}`);
  }

  console.log('\n=== Schedule Multiple Jobs ===');

  // Schedule jobs at specific times
  const now = Date.now();
  const schedules = [
    { time: new Date(now + 5000), job: 'process-order', data: { orderId: 1 } },
    { time: new Date(now + 10000), job: 'process-order', data: { orderId: 2 } },
    { time: new Date(now + 15000), job: 'send-notification', data: { userId: 100 } },
    { time: new Date(now + 20000), job: 'update-inventory', data: { productId: 'ABC123' } },
  ];

  for (const schedule of schedules) {
    const result = await adapter.schedule(schedule.time, schedule.job, schedule.data);
    if (isOk(result)) {
      console.log(`Scheduled ${schedule.job} at ${schedule.time.toISOString()}`);
    }
  }

  console.log('\n=== Get Jobs by Type ===');

  for (const jobType of jobTypes) {
    const jobsResult = await adapter.getJobs({ name: jobType });
    if (isOk(jobsResult)) {
      console.log(`${jobType}: ${jobsResult.value.length} jobs`);
      jobsResult.value.forEach(job => {
        console.log(`  - ID: ${job.id}, Next: ${job.nextRunAt?.toISOString()}`);
      });
    }
  }

  console.log('\n=== Pause Scheduler ===');

  const pauseResult = await adapter.pause();
  if (isOk(pauseResult)) {
    console.log('Scheduler paused - no jobs will execute');
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n=== Resume Scheduler ===');

  const resumeResult = await adapter.resume();
  if (isOk(resumeResult)) {
    console.log('Scheduler resumed - jobs will execute');
  }

  console.log('\n=== Cancel Jobs by Query ===');

  // Cancel all process-order jobs
  const cancelResult = await adapter.cancel({ name: 'process-order' });
  if (isOk(cancelResult)) {
    console.log(`Cancelled ${cancelResult.value} process-order jobs`);
  }

  console.log('\n=== Get All Remaining Jobs ===');

  const allJobsResult = await adapter.getJobs({});
  if (isOk(allJobsResult)) {
    console.log(`Total remaining jobs: ${allJobsResult.value.length}`);
    allJobsResult.value.forEach(job => {
      console.log(`  - ${job.name} (ID: ${job.id})`);
      console.log(`    Next run: ${job.nextRunAt?.toISOString()}`);
      console.log(`    Schedule: ${job.schedule || 'one-time'}`);
    });
  }

  console.log('\n=== Schedule Immediate Jobs ===');

  const immediate1 = await adapter.now('send-notification', { urgent: true });
  const immediate2 = await adapter.now('send-notification', { urgent: true });

  if (isOk(immediate1) && isOk(immediate2)) {
    console.log('Scheduled 2 immediate jobs');
  }

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\n=== Final Status ===');

  const finalResult = await adapter.getJobs({});
  if (isOk(finalResult)) {
    console.log(`Total jobs: ${finalResult.value.length}`);
    console.log('Jobs by type:');
    const counts = finalResult.value.reduce((acc, job) => {
      acc[job.name] = (acc[job.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    Object.entries(counts).forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
