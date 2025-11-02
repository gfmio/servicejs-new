/**
 * Compensation (Saga) example
 */

import { createTemporalAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTemporalAdapter();

  await adapter.init({
    namespace: 'default',
    taskQueue: 'saga-tasks',
  });

  await adapter.start();

  console.log('=== Register Activities with Compensation ===');

  const state = {
    payment: null as any,
    inventory: null as any,
    shipment: null as any,
  };

  // Activity 1: Reserve inventory
  await adapter.registerActivity({
    name: 'reserve-inventory',
    execute: async (input) => {
      console.log('[Step 1] Reserving inventory:', input.productId);
      state.inventory = { productId: input.productId, reserved: true };
      return state.inventory;
    },
    compensate: async (input, output) => {
      console.log('[Compensation 1] Releasing inventory:', input.productId);
      state.inventory = null;
    },
  });

  // Activity 2: Charge payment
  await adapter.registerActivity({
    name: 'charge-payment',
    execute: async (input) => {
      console.log('[Step 2] Charging payment:', input.amount);
      state.payment = { amount: input.amount, charged: true };
      return state.payment;
    },
    compensate: async (input, output) => {
      console.log('[Compensation 2] Refunding payment:', input.amount);
      state.payment = null;
    },
  });

  // Activity 3: Create shipment (this one will fail)
  await adapter.registerActivity({
    name: 'create-shipment',
    execute: async (input) => {
      console.log('[Step 3] Creating shipment...');
      // Simulate failure
      throw new Error('Shipping service unavailable');
    },
    compensate: async (input, output) => {
      console.log('[Compensation 3] Canceling shipment (if any)');
    },
  });

  console.log('\n=== Execute Workflow (Will Fail and Compensate) ===');

  const result = await adapter.executeWorkflow('order-with-compensation', {
    orderId: 'ORDER789',
    productId: 'PROD123',
    amount: 199.99,
  }, [
    {
      activity: 'reserve-inventory',
      input: (prev: any) => ({ productId: prev.productId }),
    },
    {
      activity: 'charge-payment',
      input: (prev: any) => ({ amount: prev.amount }),
    },
    {
      activity: 'create-shipment',
      input: (prev: any) => ({ orderId: prev.orderId }),
    },
  ]);

  if (isOk(result)) {
    console.log('\n=== Workflow Result ===');
    console.log('Workflow ID:', result.value.workflowId);
    console.log('Status:', result.value.status);
    console.log('Error:', result.value.error);

    console.log('\n=== State After Compensation ===');
    console.log('Inventory:', state.inventory);
    console.log('Payment:', state.payment);
    console.log('Shipment:', state.shipment);
  }

  await adapter.stop();
}

main().catch(console.error);
