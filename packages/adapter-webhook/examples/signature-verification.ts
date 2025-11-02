/**
 * Webhook signature verification example
 *
 * This example demonstrates:
 * - Generating signatures when sending webhooks
 * - Verifying signatures when receiving webhooks
 * - Securing webhook endpoints
 */

import { createWebhookAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

// Shared secret between sender and receiver
const WEBHOOK_SECRET = 'my-secure-webhook-secret';

async function sendWebhookExample() {
  console.log('=== SENDER SIDE ===\n');

  const adapter = createWebhookAdapter();
  await adapter.init({ secret: WEBHOOK_SECRET });

  const payload = {
    event: 'payment.completed',
    data: {
      paymentId: 'pay_12345',
      amount: 99.99,
      currency: 'USD'
    }
  };

  // Generate signature manually to see how it works
  const payloadString = JSON.stringify(payload);
  const signatureResult = await adapter.generateSignature(payloadString);

  if (isOk(signatureResult)) {
    console.log('Payload:', payloadString);
    console.log('Generated Signature:', signatureResult.value);
    console.log('\nThis signature would be sent in the X-Webhook-Signature header');
  }

  // Send webhook (signature is automatically added)
  console.log('\nSending webhook with signature...');
  const sendResult = await adapter.send('https://webhook.site/your-unique-url', payload);

  if (isOk(sendResult)) {
    console.log('Webhook sent successfully!');
  }
}

async function receiveWebhookExample() {
  console.log('\n=== RECEIVER SIDE ===\n');

  const adapter = createWebhookAdapter();
  await adapter.init({ secret: WEBHOOK_SECRET });

  // Simulate receiving a webhook
  const receivedPayload = JSON.stringify({
    event: 'payment.completed',
    data: {
      paymentId: 'pay_12345',
      amount: 99.99,
      currency: 'USD'
    }
  });

  // Generate what the signature should be
  const expectedSignatureResult = await adapter.generateSignature(receivedPayload);

  if (isOk(expectedSignatureResult)) {
    const expectedSignature = expectedSignatureResult.value;
    console.log('Received Payload:', receivedPayload);
    console.log('Expected Signature:', expectedSignature);

    // Verify the signature
    const verifyResult = await adapter.verifySignature(receivedPayload, expectedSignature);

    if (isOk(verifyResult)) {
      if (verifyResult.value) {
        console.log('\n✓ Signature is VALID - webhook is authentic');
        console.log('Safe to process the webhook payload');
      } else {
        console.log('\n✗ Signature is INVALID - webhook may be forged');
        console.log('DO NOT process this webhook');
      }
    }

    // Try with wrong signature
    console.log('\n--- Testing with wrong signature ---');
    const wrongSignature = 'wrong-signature-value';
    const verifyWrongResult = await adapter.verifySignature(receivedPayload, wrongSignature);

    if (isOk(verifyWrongResult)) {
      if (verifyWrongResult.value) {
        console.log('✓ Signature is VALID');
      } else {
        console.log('✗ Signature is INVALID (as expected with wrong signature)');
      }
    }
  }
}

async function main() {
  await sendWebhookExample();
  await receiveWebhookExample();
}

main().catch(console.error);
