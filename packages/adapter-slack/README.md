# @servicejs/adapter-slack

Slack adapter for ServiceJS providing team communication and collaboration features.

## Features

- 💬 **Messaging**: Post, update, and delete messages
- 📺 **Channels**: Create, list, and manage channels
- 👥 **Users**: Get user information and list workspace members
- 🎭 **Reactions**: Add and remove emoji reactions
- 🪝 **Webhooks**: Send messages via incoming webhooks
- 🔗 **Threads**: Post threaded messages
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-slack
```

## Quick Start

### With Bot Token

```typescript
import { createSlackAdapter } from '@servicejs/adapter-slack';

const slack = createSlackAdapter();

await slack.init({
  botToken: 'xoxb-your-bot-token',
});

// Post a message
const result = await slack.postMessage({
  channel: 'C1234567890',
  text: 'Hello from ServiceJS! 👋',
});
```

### With Incoming Webhook

```typescript
import { createSlackAdapter } from '@servicejs/adapter-slack';

const slack = createSlackAdapter();

await slack.init({
  webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
});

// Post via webhook
await slack.postWebhook({
  text: 'Hello from webhook!',
  username: 'ServiceJS Bot',
  icon_emoji: ':robot_face:',
});
```

## Messaging

### Post Message

```typescript
const result = await slack.postMessage({
  channel: 'C1234567890',
  text: 'Hello World!',
});

if (isOk(result)) {
  console.log('Message timestamp:', result.value.ts);
}
```

### Post with Blocks (Rich Formatting)

```typescript
await slack.postMessage({
  channel: 'C1234567890',
  text: 'Deployment notification',
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚀 Deployment Complete',
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: '*Environment:*\nProduction' },
        { type: 'mrkdwn', text: '*Status:*\n✅ Success' },
      ],
    },
  ],
});
```

### Post Threaded Message

```typescript
// Post initial message
const parent = await slack.postMessage({
  channel: 'C1234567890',
  text: 'Main thread message',
});

// Reply in thread
if (isOk(parent)) {
  await slack.postMessage({
    channel: 'C1234567890',
    text: 'Reply in thread',
    thread_ts: parent.value.ts,
  });
}
```

### Update Message

```typescript
await slack.updateMessage(
  'C1234567890',
  '1234567890.123456',
  'Updated text'
);
```

### Delete Message

```typescript
await slack.deleteMessage('C1234567890', '1234567890.123456');
```

## Reactions

### Add Reaction

```typescript
await slack.addReaction('C1234567890', '1234567890.123456', 'thumbsup');
// Or with emoji syntax
await slack.addReaction('C1234567890', '1234567890.123456', ':tada:');
```

### Remove Reaction

```typescript
await slack.removeReaction('C1234567890', '1234567890.123456', 'thumbsup');
```

## Channel Management

### List Channels

```typescript
const result = await slack.listChannels();

if (isOk(result)) {
  result.value.forEach((channel) => {
    console.log(`${channel.name} (${channel.id})`);
  });
}
```

### Get Channel Info

```typescript
const result = await slack.getChannel('C1234567890');

if (isOk(result)) {
  console.log('Channel:', result.value.name);
  console.log('Members:', result.value.num_members);
}
```

### Create Channel

```typescript
// Public channel
const result = await slack.createChannel('new-channel');

// Private channel
const privateResult = await slack.createChannel('private-channel', true);
```

### Archive Channel

```typescript
await slack.archiveChannel('C1234567890');
```

### Invite Users to Channel

```typescript
await slack.inviteToChannel('C1234567890', ['U1234567890', 'U0987654321']);
```

## User Management

### Get User Info

```typescript
const result = await slack.getUser('U1234567890');

if (isOk(result)) {
  console.log('User:', result.value.name);
  console.log('Email:', result.value.profile?.email);
}
```

### List Users

```typescript
const result = await slack.listUsers({ limit: 100 });

if (isOk(result)) {
  result.value.forEach((user) => {
    console.log(`${user.name} ${user.is_bot ? '(bot)' : ''}`);
  });
}
```

## Webhooks

### Post via Incoming Webhook

```typescript
await slack.init({
  webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
});

await slack.postWebhook({
  text: 'Hello from webhook!',
  username: 'Custom Bot',
  icon_emoji: ':robot_face:',
});
```

### Webhook with Rich Formatting

```typescript
await slack.postWebhook({
  text: 'Fallback text',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Bold* and _italic_ text',
      },
    },
  ],
});
```

## Configuration

```typescript
await slack.init({
  // Bot token (for API methods)
  botToken: 'xoxb-your-bot-token',

  // User token (for user-level operations)
  userToken: 'xoxp-your-user-token',

  // Signing secret (for webhook verification)
  signingSecret: 'your-signing-secret',

  // Incoming webhook URL
  webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',

  // Custom API URL (optional)
  apiUrl: 'https://slack.com/api',
});
```

## Examples

### Notification Bot

```typescript
const slack = createSlackAdapter();

await slack.init({
  botToken: process.env.SLACK_BOT_TOKEN,
});

// Send deployment notification
await slack.postMessage({
  channel: 'deployments',
  text: '🚀 Deployment started',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Deployment Status:* In Progress\n*Environment:* Production',
      },
    },
  ],
});
```

### Alert System

```typescript
async function sendAlert(severity: string, message: string) {
  const emoji = severity === 'error' ? '🚨' : '⚠️';

  await slack.postMessage({
    channel: 'alerts',
    text: `${emoji} ${severity.toUpperCase()}: ${message}`,
  });
}

await sendAlert('error', 'Database connection failed');
```

## Testing

```bash
bun test
```

## Note

This adapter requires valid Slack credentials:
- **Bot Token**: Create a Slack app and install it to your workspace to get a bot token
- **Webhook URL**: Configure an incoming webhook in your Slack app settings
- **Scopes**: Ensure your bot has the necessary OAuth scopes for the operations you need

Required scopes for common operations:
- `chat:write` - Post messages
- `channels:read` - List public channels
- `channels:manage` - Create and archive channels
- `users:read` - Get user information
- `reactions:write` - Add reactions

## License

MIT
