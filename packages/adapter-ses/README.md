# @servicejs/adapter-ses

AWS Simple Email Service (SES) adapter for ServiceJS.

## Installation

```bash
npm install @servicejs/adapter-ses @servicejs/adapter-email
npm install @aws-sdk/client-ses  # peer dependency
```

## Usage

```typescript
import { createSESAdapter } from '@servicejs/adapter-ses';
import { isOk } from '@servicejs/result';

const adapter = createSESAdapter();

// Initialize with AWS credentials
await adapter.init({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
  },
});

await adapter.start();

// Send an email
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Hello from AWS SES!',
  html: '<h1>Welcome</h1><p>This email was sent via AWS SES.</p>',
  text: 'Welcome! This email was sent via AWS SES.',
});

if (isOk(result)) {
  console.log('Email sent:', result.value.id);
}

await adapter.stop();
await adapter.destroy();
```

## Configuration

### `SESConfig`

```typescript
interface SESConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}
```

- **`region`** (required) - AWS region (e.g., 'us-east-1', 'eu-west-1')
- **`credentials`** (optional) - AWS credentials. If not provided, will use default AWS credential chain (environment variables, IAM roles, etc.)

## Features

- ✅ HTML and text email content
- ✅ Multiple recipients (to, cc, bcc)
- ✅ Reply-to headers
- ✅ AWS credential chain support
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling

## Examples

### Send to multiple recipients

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
  subject: 'Newsletter',
  html: '<h2>Monthly Newsletter</h2><p>Check out our latest updates!</p>',
});
```

### Send with CC and BCC

```typescript
const result = await adapter.send({
  from: 'sender@example.com',
  to: 'primary@example.com',
  cc: 'manager@example.com',
  bcc: ['admin@example.com', 'archive@example.com'],
  subject: 'Quarterly Report',
  html: '<p>Please find the quarterly report below.</p>',
});
```

### Send with reply-to

```typescript
const result = await adapter.send({
  from: 'noreply@example.com',
  to: 'user@example.com',
  replyTo: 'support@example.com',
  subject: 'Account Notification',
  html: '<p>Your account has been updated.</p>',
});
```

### Use with IAM roles (no explicit credentials)

```typescript
// When running on EC2, ECS, or Lambda, credentials can be automatically obtained
await adapter.init({
  region: 'us-east-1',
  // No credentials needed - will use IAM role
});
```

## Important Notes

- **Email verification**: You must verify sender email addresses or domains in AWS SES console before sending
- **Sandbox mode**: New SES accounts start in sandbox mode. You'll need to verify recipient addresses or request production access
- **Attachments**: SES adapter uses simple email API which doesn't support attachments directly. For attachments, use raw email API or consider other adapters

## API Reference

See [@servicejs/adapter-email](../adapter-email) for the full `EmailAdapter` interface.

## Related Packages

- [@servicejs/adapter-email](../adapter-email) - Email adapter types
- [@servicejs/adapter-resend](../adapter-resend) - Resend adapter
- [@servicejs/adapter-sendgrid](../adapter-sendgrid) - SendGrid adapter
- [@servicejs/result](../result) - Result type

## License

MIT
