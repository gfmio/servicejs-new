# @servicejs/adapter-sms

Common types and interfaces for SMS adapters in ServiceJS.

## Overview

This package provides type definitions that all SMS provider adapters must implement, similar to `@servicejs/email-types`. It does not contain any implementation logic.

## Features

- 📝 **Type Definitions**: Common interfaces for SMS operations
- 🔌 **Provider Abstraction**: Unified API for any SMS provider
- 📦 **Batch Operations**: Standard batch send interface
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-sms
```

## Usage

### Implementing an SMS Adapter

```typescript
import type { SMSAdapter, SMSMessage, SMSMessageResponse } from '@servicejs/adapter-sms';
import { ok, err, type Result } from '@servicejs/result';

interface MyProviderConfig {
  apiKey: string;
  from: string;
}

export const createMyProviderAdapter = (): SMSAdapter<MyProviderConfig> => {
  let config: MyProviderConfig | null = null;

  return {
    init: async (cfg) => {
      config = cfg;
      return ok(undefined);
    },

    send: async (message: SMSMessage): Promise<Result<SMSMessageResponse, Error>> => {
      // Your implementation here
      return ok({
        messageId: 'msg-123',
        success: true,
        status: 'sent',
      });
    },

    // ... implement other methods
  };
};
```

### Using an SMS Adapter

```typescript
import { createTwilioSMSAdapter } from '@servicejs/adapter-twilio';

const sms = createTwilioSMSAdapter();

await sms.init({
  accountSid: 'your-account-sid',
  authToken: 'your-auth-token',
  from: '+1234567890',
});

const result = await sms.send({
  to: '+0987654321',
  body: 'Hello from ServiceJS!',
});
```

## Available SMS Adapters

- **[@servicejs/adapter-twilio](../adapter-twilio)**: Twilio SMS/MMS
- **[@servicejs/adapter-sns](../adapter-sns)**: AWS SNS SMS

## Types

### SMSMessage

```typescript
interface SMSMessage {
  to: string;           // Recipient phone number (E.164 format)
  body: string;         // Message text
  from?: string;        // Sender (optional, uses default from config)
  mediaUrls?: string[]; // Media URLs for MMS
}
```

### SMSMessageResponse

```typescript
interface SMSMessageResponse {
  messageId: string;    // Unique message ID
  success: boolean;     // Delivery acceptance status
  status?: string;      // Message status
  cost?: {
    amount: string;
    currency: string;
  };
}
```

### SMSAdapter

```typescript
interface SMSAdapter<TConfig = any> {
  init(config: TConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;
  send(message: SMSMessage): Promise<Result<SMSMessageResponse, Error>>;
  sendBatch(messages: SMSMessage[]): Promise<Result<SMSBatchResult[], Error>>;
}
```

## License

MIT
