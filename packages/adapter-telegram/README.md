# @servicejs/adapter-telegram

Telegram adapter for ServiceJS providing bot messaging capabilities.

## Features

- 💬 **Messaging**: Send, edit, delete messages
- 📷 **Media**: Send photos with captions
- 🔔 **Notifications**: Silent messages support
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-telegram
```

## Quick Start

```typescript
import { createTelegramAdapter } from '@servicejs/adapter-telegram';

const telegram = createTelegramAdapter();

await telegram.init({
  botToken: 'your-bot-token',
});

await telegram.sendMessage({
  chat_id: '123456789',
  text: 'Hello from ServiceJS!',
});
```

## License

MIT
