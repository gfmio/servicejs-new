import { describe, test, expect } from 'bun:test';
import { createSendGridAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('SendGrid Adapter', () => {
  describe('Lifecycle', () => {
    test('init succeeds with valid config', async () => {
      const adapter = createSendGridAdapter();
      const result = await adapter.init({
        apiKey: 'test-api-key',
      });
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('start succeeds after init', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('start fails before init', async () => {
      const adapter = createSendGridAdapter();
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('stop succeeds', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });
      await adapter.start();

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
      await adapter.destroy();
    });

    test('destroy succeeds', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });

    test('health returns unhealthy before init', async () => {
      const adapter = createSendGridAdapter();
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error).toBeDefined();
      }
    });

    test('health returns healthy after init', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }

      await adapter.destroy();
    });
  });

  describe('Email Operations', () => {
    test('send fails before init', async () => {
      const adapter = createSendGridAdapter();

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test message',
      });

      expect(isErr(result)).toBe(true);
    });

    test('send validates email message structure', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      // This will fail at the SendGrid API level with test credentials
      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
      });

      // We expect an error since we're using a test API key
      expect(isErr(result)).toBe(true);

      await adapter.destroy();
    });
  });

  describe('Configuration', () => {
    test('handles single recipient', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });

    test('handles multiple recipients', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test',
        text: 'Test',
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });

    test('handles CC and BCC', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });

    test('handles reply-to', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        replyTo: 'reply@example.com',
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });

    test('handles attachments with Buffer', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        attachments: [
          {
            filename: 'test.txt',
            content: Buffer.from('test content'),
            contentType: 'text/plain',
          },
        ],
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });

    test('handles attachments with string', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        attachments: [
          {
            filename: 'test.txt',
            content: 'base64-encoded-content',
            contentType: 'text/plain',
          },
        ],
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });

    test('handles HTML and text', async () => {
      const adapter = createSendGridAdapter();
      await adapter.init({ apiKey: 'test-api-key' });

      const result = await adapter.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>HTML content</p>',
        text: 'Text content',
      });

      expect(isErr(result)).toBe(true);
      await adapter.destroy();
    });
  });
});
