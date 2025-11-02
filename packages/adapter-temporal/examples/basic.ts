/**
 * Basic Temporal adapter usage
 */

import { createTemporalAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTemporalAdapter();

  await adapter.init({
    namespace: 'default',
    taskQueue: 'my-tasks',
  });

  await adapter.start();

  console.log('=== Register Activities ===');

  // Register activity for processing orders
  await adapter.registerActivity({
    name: 'process-payment',
    execute: async (input) => {
      console.log('Processing payment:', input.amount);
      await new Promise(resolve => setTimeout(resolve, 100));
      return { transactionId: 'tx_' + Date.now(), status: 'success' };
    },
  });

  await adapter.registerActivity({
    name: 'reserve-inventory',
    execute: async (input) => {
      console.log('Reserving inventory:', input.productId);
      await new Promise(resolve => setTimeout(resolve, 50));
      return { reserved: true, quantity: input.quantity };
    },
  });

  await adapter.registerActivity({
    name: 'send-confirmation',
    execute: async (input) => {
      console.log('Sending confirmation to:', input.email);
      return { sent: true, emailId: 'email_' + Date.now() };
    },
  });

  console.log('\n=== Execute Workflow ===');

  const workflowResult = await adapter.executeWorkflow('order-workflow', {
    orderId: 'ORDER123',
    productId: 'PROD456',
    quantity: 2,
    amount: 99.99,
    email: 'customer@example.com',
  }, [
    {
      activity: 'reserve-inventory',
      input: (prev: any) => ({
        productId: prev.productId,
        quantity: prev.quantity,
      }),
    },
    {
      activity: 'process-payment',
      input: (prev: any) => ({
        amount: prev.amount,
      }),
    },
    {
      activity: 'send-confirmation',
      input: (prev: any) => ({
        email: prev.email,
      }),
    },
  ]);

  if (isOk(workflowResult)) {
    console.log('Workflow completed:', workflowResult.value.workflowId);
    console.log('  Status:', workflowResult.value.status);
    console.log('  Result:', workflowResult.value.result);
  }

  await adapter.stop();
}

main().catch(console.error);
