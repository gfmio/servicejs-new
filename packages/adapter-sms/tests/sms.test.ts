import { describe, test, expect } from 'bun:test';
import type { SMSAdapter, SMSMessage, SMSMessageResponse, SMSBatchResult } from '../src/index.js';

describe('SMS Types', () => {
  test('SMSMessage type', () => {
    const message: SMSMessage = {
      to: '+1234567890',
      body: 'Test message',
      from: '+0987654321',
      mediaUrls: ['https://example.com/image.jpg'],
    };

    expect(message.to).toBe('+1234567890');
    expect(message.body).toBe('Test message');
    expect(message.from).toBe('+0987654321');
    expect(message.mediaUrls).toHaveLength(1);
  });

  test('SMSMessageResponse type', () => {
    const response: SMSMessageResponse = {
      messageId: 'msg-123',
      success: true,
      status: 'sent',
      cost: {
        amount: '0.0075',
        currency: 'USD',
      },
    };

    expect(response.messageId).toBe('msg-123');
    expect(response.success).toBe(true);
    expect(response.status).toBe('sent');
    expect(response.cost?.amount).toBe('0.0075');
  });

  test('SMSBatchResult type', () => {
    const successResult: SMSBatchResult = {
      success: true,
      messageId: 'msg-123',
    };

    const failureResult: SMSBatchResult = {
      success: false,
      error: 'Invalid phone number',
    };

    expect(successResult.success).toBe(true);
    expect(successResult.messageId).toBe('msg-123');
    expect(failureResult.success).toBe(false);
    expect(failureResult.error).toBe('Invalid phone number');
  });
});
