/**
 * Basic Twilio adapter usage example
 */

import { createTwilioAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTwilioAdapter();

  // Initialize with Twilio credentials
  const initResult = await adapter.init({
    accountSid: 'your-account-sid',
    authToken: 'your-auth-token',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter
  const startResult = await adapter.start();
  if (!isOk(startResult)) {
    console.error('Failed to start:', startResult.error);
    return;
  }

  // Check health
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.value.status);
  }

  // Send SMS
  const smsResult = await adapter.sendSMS({
    from: '+1234567890', // Your Twilio number
    to: '+0987654321', // Recipient number
    body: 'Hello from Twilio!',
  });

  if (isOk(smsResult)) {
    console.log('SMS sent, SID:', smsResult.value.sid);
    console.log('Status:', smsResult.value.status);
  }

  // Send SMS with media (MMS)
  const mmsResult = await adapter.sendSMS({
    from: '+1234567890',
    to: '+0987654321',
    body: 'Check out this image!',
    mediaUrl: ['https://example.com/image.jpg'],
  });

  if (isOk(mmsResult)) {
    console.log('MMS sent, SID:', mmsResult.value.sid);
  }

  // Make voice call with TwiML
  const callResult = await adapter.makeCall({
    from: '+1234567890',
    to: '+0987654321',
    twiml: '<Response><Say>Hello! This is a call from Twilio.</Say></Response>',
  });

  if (isOk(callResult)) {
    console.log('Call initiated, SID:', callResult.value.sid);
    console.log('Status:', callResult.value.status);
  }

  // Make voice call with callback URL
  const callWithUrlResult = await adapter.makeCall({
    from: '+1234567890',
    to: '+0987654321',
    url: 'https://example.com/twiml', // URL that returns TwiML
    statusCallback: 'https://example.com/status',
    statusCallbackMethod: 'POST',
  });

  if (isOk(callWithUrlResult)) {
    console.log('Call with URL initiated, SID:', callWithUrlResult.value.sid);
  }

  // Check SMS status
  if (isOk(smsResult)) {
    const statusResult = await adapter.getMessageStatus(smsResult.value.sid);
    if (isOk(statusResult)) {
      console.log('Message status:', statusResult.value.status);
    }
  }

  // Check call status
  if (isOk(callResult)) {
    const callStatusResult = await adapter.getCallStatus(callResult.value.sid);
    if (isOk(callStatusResult)) {
      console.log('Call status:', callStatusResult.value.status);
      console.log('Direction:', callStatusResult.value.direction);
    }
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
