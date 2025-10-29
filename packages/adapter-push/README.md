# @servicejs/adapter-push

Push notifications adapter supporting FCM, APNs, and Web Push.

## Features

- 📱 **FCM**: Firebase Cloud Messaging
- 🍎 **APNs**: Apple Push Notification service  
- 🌐 **Web Push**: Web Push Protocol
- 📦 **Batch**: Send multiple notifications
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-push
```

## Quick Start

```typescript
import { createPushAdapter } from '@servicejs/adapter-push';

const push = createPushAdapter();

await push.init({
  provider: 'fcm',
  fcm: { serverKey: 'your-server-key' },
});

await push.send({
  token: 'device-token',
  title: 'Hello',
  body: 'World',
});
```

## License

MIT
