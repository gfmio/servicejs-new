# @servicejs/adapter-email

Email adapter types for ServiceJS. This package contains shared types used by all email adapter implementations.

## Installation

```bash
npm install @servicejs/adapter-email
```

## Usage

This package only exports TypeScript types. You should use it in conjunction with one of the email adapter implementation packages:

- [`@servicejs/adapter-resend`](../adapter-resend) - Resend email service
- [`@servicejs/adapter-ses`](../adapter-ses) - AWS Simple Email Service
- [`@servicejs/adapter-sendgrid`](../adapter-sendgrid) - SendGrid email service

## Types

### `EmailMessage`

The email message structure accepted by all adapters:

```typescript
interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}
```

### `EmailResponse`

The response returned after sending an email:

```typescript
interface EmailResponse {
  id: string;
  provider: string;
}
```

### `EmailAdapter`

The interface that all email adapters implement:

```typescript
interface EmailAdapter {
  init(config: unknown): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  send(message: EmailMessage): Promise<Result<EmailResponse, Error>>;
}
```

## Example

```typescript
import type { EmailAdapter, EmailMessage } from '@servicejs/adapter-email';
import { createResendAdapter } from '@servicejs/adapter-resend';

const adapter: EmailAdapter = createResendAdapter();

await adapter.init({ apiKey: 'your-api-key' });
await adapter.start();

const message: EmailMessage = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Hello',
  html: '<p>Hello, World!</p>',
  text: 'Hello, World!',
};

const result = await adapter.send(message);
```

## Related Packages

- [@servicejs/result](../result) - Result type used for error handling
- [@servicejs/adapter-resend](../adapter-resend) - Resend implementation
- [@servicejs/adapter-ses](../adapter-ses) - AWS SES implementation
- [@servicejs/adapter-sendgrid](../adapter-sendgrid) - SendGrid implementation

## License

MIT
