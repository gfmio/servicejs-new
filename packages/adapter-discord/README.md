# @servicejs/adapter-discord

Discord adapter for ServiceJS providing community platform and bot integration.

## Features

- 💬 **Messaging**: Send, edit, delete messages with rich embeds
- 🎭 **Reactions**: Add and remove emoji reactions
- 📺 **Channels**: Get channel info and list guild channels
- 🏰 **Guilds**: Get server information and member counts
- 👥 **Users**: Get user information
- 🪝 **Webhooks**: Send messages via webhooks
- 🔗 **Invites**: Create channel invites
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-discord
```

## Quick Start

```typescript
import { createDiscordAdapter } from '@servicejs/adapter-discord';

const discord = createDiscordAdapter();

await discord.init({
  botToken: 'your-bot-token',
});

await discord.sendMessage('channel-id', {
  content: 'Hello from ServiceJS!',
});
```

## License

MIT
