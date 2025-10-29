# @servicejs/adapter-sns

AWS SNS SMS adapter implementing @servicejs/adapter-sms types.

## Features

- 📱 **SMS Sending**: Send SMS via AWS SNS
- 📦 **Batch Operations**: Send multiple messages
- 🌍 **Global**: Works in any AWS region
- ✅ **Type-Safe**: Implements @servicejs/adapter-sms

## Installation

```bash
bun add @servicejs/adapter-sns
```

## Quick Start

```typescript
import { createSNSSMSAdapter } from '@servicejs/adapter-sns';

const sms = createSNSSMSAdapter();

await sms.init({
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key',
  region: 'us-east-1',
});

await sms.send({
  to: '+1234567890',
  body: 'Hello from SNS!',
});
```

## License

MIT
