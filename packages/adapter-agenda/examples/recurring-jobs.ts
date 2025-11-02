/**
 * Recurring jobs example
 */

import { createAgendaAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createAgendaAdapter();

  await adapter.init({
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/test',
    },
  });

  await adapter.start();

  console.log('=== Define Job Types ===');

  // Define different job types
  await adapter.define('sync-data', async (job) => {
    console.log(`[${new Date().toISOString()}] Syncing data for:`, job.data.source);
  });

  await adapter.define('cleanup', async (job) => {
    console.log(`[${new Date().toISOString()}] Cleaning up:`, job.data.target);
  });

  await adapter.define('report', async (job) => {
    console.log(`[${new Date().toISOString()}] Generating report:`, job.data.type);
  });

  console.log('\n=== Schedule Recurring Jobs ===');

  // Different recurring intervals
  const jobs = [
    {
      interval: 'every minute',
      name: 'sync-data',
      data: { source: 'database' },
    },
    {
      interval: 'every 5 minutes',
      name: 'cleanup',
      data: { target: 'temp-files' },
    },
    {
      interval: 'every hour',
      name: 'report',
      data: { type: 'hourly-stats' },
    },
    {
      interval: 'every day',
      name: 'report',
      data: { type: 'daily-summary' },
    },
  ];

  for (const job of jobs) {
    const result = await adapter.scheduleEvery(job.interval, job.name, job.data);
    if (isOk(result)) {
      console.log(`Scheduled ${job.name}:`);
      console.log(`  Interval: ${result.value.schedule}`);
      console.log(`  Next run: ${result.value.nextRunAt}`);
      console.log(`  Job ID: ${result.value.id}`);
    }
  }

  console.log('\n=== View All Scheduled Jobs ===');

  const allJobsResult = await adapter.getJobs({});
  if (isOk(allJobsResult)) {
    console.log(`Total scheduled jobs: ${allJobsResult.value.length}`);

    // Group by job name
    const grouped = allJobsResult.value.reduce((acc, job) => {
      if (!acc[job.name]) acc[job.name] = [];
      acc[job.name].push(job);
      return acc;
    }, {} as Record<string, typeof allJobsResult.value>);

    for (const [name, jobs] of Object.entries(grouped)) {
      console.log(`\n${name}:`);
      jobs.forEach(job => {
        console.log(`  - Schedule: ${job.schedule || 'one-time'}`);
        console.log(`    Next run: ${job.nextRunAt}`);
      });
    }
  }

  console.log('\n=== Cancel Specific Job Type ===');

  const cancelResult = await adapter.cancel({ name: 'cleanup' });
  if (isOk(cancelResult)) {
    console.log(`Cancelled ${cancelResult.value} cleanup jobs`);
  }

  console.log('\n=== Remaining Jobs ===');

  const remainingResult = await adapter.getJobs({});
  if (isOk(remainingResult)) {
    console.log(`Remaining scheduled jobs: ${remainingResult.value.length}`);
    remainingResult.value.forEach(job => {
      console.log(`  - ${job.name} (${job.schedule || 'one-time'})`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
