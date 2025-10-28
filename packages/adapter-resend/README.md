# @servicejs/adapter-resend

Resend email adapter for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-resend @servicejs/adapter-email
npm install resend  # peer dependency
```

## Usage

```typescript
import { createResendAdapter } from '@servicejs/adapter-resend';
import { isOk } from '@servicejs/result';

const adapter = createResendAdapter();

// Initialize with API key
await adapter.init({
  apiKey: 'your-resend-api-key',
});

await adapter.start();

// Send an email
const result = await adapter.send({
  from: 'onboarding@resend.dev',
  to: 'user@example.com',
  subject: 'Hello from Resend!',
  html: '<h1>Welcome</h1><p>Thanks for signing up!</p>',
  text: 'Welcome! Thanks for signing up!',
});

if (isOk(result)) {
  console.log('Email sent:', result.value.id);
}

await adapter.stop();
await adapter.destroy();
```

## Configuration

### `ResendConfig`

```typescript
interface ResendConfig {
  apiKey: string;
}
```

- **`apiKey`** - Your Resend API key

## Features

- ✅ HTML and text email content
- ✅ Multiple recipients (to, cc, bcc)
- ✅ Reply-to headers
- ✅ File attachments
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling

## Examples

### Send with attachments

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Invoice',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: Buffer.from('PDF content'),
      contentType: 'application/pdf',
    },
  ],
});
```

### Send with CC and BCC

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'user@example.com',
  cc: 'manager@example.com',
  bcc: ['admin@example.com', 'archive@example.com'],
  subject: 'Team Update',
  html: '<p>Latest team update</p>',
});
```

### Send with reply-to

```typescript
const result = await adapter.send({
  from: 'noreply@example.com',
  to: 'user@example.com',
  replyTo: 'support@example.com',
  subject: 'Support Ticket',
  html: '<p>Your support ticket has been created.</p>',
});
```

## API Reference

See [@servicejs/adapter-email](../adapter-email) for the full `EmailAdapter` interface.

## Related Packages

- [@servicejs/adapter-email](../adapter-email) - Email adapter types
- [@servicejs/adapter-ses](../adapter-ses) - AWS SES adapter
- [@servicejs/adapter-sendgrid](../adapter-sendgrid) - SendGrid adapter
- [@servicejs/result](../result) - Result type

## License

MIT
