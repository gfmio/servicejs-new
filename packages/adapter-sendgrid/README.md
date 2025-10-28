# @servicejs/adapter-sendgrid

SendGrid email adapter for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-sendgrid @servicejs/adapter-email
npm install @sendgrid/mail  # peer dependency
```

## Usage

```typescript
import { createSendGridAdapter } from '@servicejs/adapter-sendgrid';
import { isOk } from '@servicejs/result';

const adapter = createSendGridAdapter();

// Initialize with API key
await adapter.init({
  apiKey: 'your-sendgrid-api-key',
});

await adapter.start();

// Send an email
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Hello from SendGrid!',
  html: '<h1>Welcome</h1><p>This email was sent via SendGrid.</p>',
  text: 'Welcome! This email was sent via SendGrid.',
});

if (isOk(result)) {
  console.log('Email sent:', result.value.id);
}

await adapter.stop();
await adapter.destroy();
```

## Configuration

### `SendGridConfig`

```typescript
interface SendGridConfig {
  apiKey: string;
}
```

- **`apiKey`** - Your SendGrid API key

## Features

- ✅ HTML and text email content
- ✅ Multiple recipients (to, cc, bcc)
- ✅ Reply-to headers
- ✅ File attachments (Buffer or base64)
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling

## Examples

### Send with attachments

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Document Attached',
  html: '<p>Please find the requested document attached.</p>',
  attachments: [
    {
      filename: 'report.pdf',
      content: Buffer.from('PDF content'),
      contentType: 'application/pdf',
    },
    {
      filename: 'data.csv',
      content: 'Name,Email\nJohn,john@example.com',
      contentType: 'text/csv',
    },
  ],
});
```

### Send to multiple recipients

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Team Announcement',
  html: '<h2>Important Update</h2><p>Please review the following information.</p>',
});
```

### Send with CC and BCC

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'primary@example.com',
  cc: 'manager@example.com',
  bcc: 'admin@example.com',
  subject: 'Project Status',
  html: '<p>Here is the latest project status update.</p>',
});
```

### Send rich HTML email

```typescript
const result = await adapter.send({
  from: 'marketing@example.com',
  to: 'user@example.com',
  subject: 'Special Offer',
  html: `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h1 style="color: #007bff;">Limited Time Offer!</h1>
          <p>Get <strong>50% off</strong> on all products this week.</p>
          <a href="https://example.com/offer"
             style="background-color: #007bff; color: white; padding: 10px 20px;
                    text-decoration: none; border-radius: 3px;">
            Shop Now
          </a>
        </div>
      </body>
    </html>
  `,
});
```

### Send with reply-to

```typescript
const result = await adapter.send({
  from: 'noreply@example.com',
  to: 'user@example.com',
  replyTo: 'support@example.com',
  subject: 'Support Request Received',
  html: '<p>We have received your support request and will respond shortly.</p>',
});
```

## Attachments

The SendGrid adapter supports attachments in two formats:

1. **Buffer**: File content as a Buffer (automatically converted to base64)
2. **String**: Pre-encoded base64 string

```typescript
// Using Buffer
attachments: [{
  filename: 'file.pdf',
  content: Buffer.from('file content'),
  contentType: 'application/pdf',
}]

// Using base64 string
attachments: [{
  filename: 'file.pdf',
  content: 'base64EncodedContent',
  contentType: 'application/pdf',
}]
```

## API Reference

See [@servicejs/adapter-email](../adapter-email) for the full `EmailAdapter` interface.

## Related Packages

- [@servicejs/adapter-email](../adapter-email) - Email adapter types
- [@servicejs/adapter-resend](../adapter-resend) - Resend adapter
- [@servicejs/adapter-ses](../adapter-ses) - AWS SES adapter
- [@servicejs/result](../result) - Result type

## License

MIT
