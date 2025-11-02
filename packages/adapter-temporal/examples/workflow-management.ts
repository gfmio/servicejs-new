/**
 * Workflow management example
 */

import { createTemporalAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTemporalAdapter();

  await adapter.init({
    namespace: 'default',
    taskQueue: 'management-tasks',
  });

  await adapter.start();

  console.log('=== Register Activities ===');

  await adapter.registerActivity({
    name: 'data-processing',
    execute: async (input) => {
      console.log(`Processing data batch: ${input.batchId}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      return { processed: input.records, batchId: input.batchId };
    },
  });

  await adapter.registerActivity({
    name: 'data-validation',
    execute: async (input) => {
      console.log(`Validating batch: ${input.batchId}`);
      await new Promise(resolve => setTimeout(resolve, 50));
      return { valid: true, errors: [] };
    },
  });

  console.log('\n=== Start Multiple Workflows ===');

  const workflows: string[] = [];

  for (let i = 1; i <= 3; i++) {
    const startResult = await adapter.startWorkflow('data-pipeline', {
      batchId: `BATCH_${i}`,
      records: i * 100,
    });

    if (isOk(startResult)) {
      workflows.push(startResult.value);
      console.log(`Started workflow ${i}:`, startResult.value);
    }
  }

  console.log('\n=== Get Workflow Status ===');

  for (const workflowId of workflows) {
    const workflowResult = await adapter.getWorkflow(workflowId);
    if (isOk(workflowResult) && workflowResult.value) {
      console.log(`\nWorkflow: ${workflowId}`);
      console.log('  Status:', workflowResult.value.status);
      console.log('  Created:', workflowResult.value.createdAt.toISOString());
      console.log('  Steps:', workflowResult.value.steps.length);
    }
  }

  console.log('\n=== Cancel a Workflow ===');

  if (workflows.length > 0) {
    const cancelResult = await adapter.cancelWorkflow(workflows[0]);
    if (isOk(cancelResult)) {
      console.log(`Cancelled workflow: ${workflows[0]}`);

      const workflowResult = await adapter.getWorkflow(workflows[0]);
      if (isOk(workflowResult) && workflowResult.value) {
        console.log('  New status:', workflowResult.value.status);
      }
    }
  }

  console.log('\n=== Execute Complete Workflow ===');

  const result = await adapter.executeWorkflow('complete-pipeline', {
    batchId: 'BATCH_FINAL',
    records: 500,
  }, [
    {
      activity: 'data-processing',
      input: (prev: any) => ({
        batchId: prev.batchId,
        records: prev.records,
      }),
    },
    {
      activity: 'data-validation',
      input: (prev: any) => ({
        batchId: prev.batchId,
        processed: prev.processed,
      }),
    },
  ]);

  if (isOk(result)) {
    console.log('\nWorkflow execution result:');
    console.log('  Workflow ID:', result.value.workflowId);
    console.log('  Status:', result.value.status);
    console.log('  Result:', result.value.result);
  }

  await adapter.stop();
}

main().catch(console.error);
