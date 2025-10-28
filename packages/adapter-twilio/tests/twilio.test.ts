import { describe, test, expect } from 'bun:test';
import { createTwilioAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Twilio Adapter', () => {
  describe('Lifecycle', () => {
    test('init succeeds with valid config', async () => {
      const adapter = createTwilioAdapter();
      const result = await adapter.init({
        accountSid: 'test-account-sid',
        authToken: 'test-auth-token',
      });
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('start succeeds after init', async () => {
      const adapter = createTwilioAdapter();
      await adapter.init({
        accountSid: 'test-account-sid',
        authToken: 'test-auth-token',
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('start fails before init', async () => {
      const adapter = createTwilioAdapter();
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('health returns unhealthy before init', async () => {
      const adapter = createTwilioAdapter();
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('SMS Operations', () => {
    test('sendSMS fails before init', async () => {
      const adapter = createTwilioAdapter();

      const result = await adapter.sendSMS({
        from: '+1234567890',
        to: '+0987654321',
        body: 'Test message',
      });
      expect(isErr(result)).toBe(true);
    });

    test('getMessageStatus fails before init', async () => {
      const adapter = createTwilioAdapter();
      const result = await adapter.getMessageStatus('test-sid');
      expect(isErr(result)).toBe(true);
    });
  });

  describe('Voice Operations', () => {
    test('makeCall fails before init', async () => {
      const adapter = createTwilioAdapter();

      const result = await adapter.makeCall({
        from: '+1234567890',
        to: '+0987654321',
        twiml: '<Response><Say>Hello</Say></Response>',
      });
      expect(isErr(result)).toBe(true);
    });

    test('getCallStatus fails before init', async () => {
      const adapter = createTwilioAdapter();
      const result = await adapter.getCallStatus('test-sid');
      expect(isErr(result)).toBe(true);
    });
  });
});
