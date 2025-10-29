import { createDiscordAdapter } from '@servicejs/adapter-discord';
import { isOk } from '@servicejs/result';

async function main() {
  const discord = createDiscordAdapter();

  await discord.init({
    botToken: process.env.DISCORD_BOT_TOKEN || 'your-bot-token',
  });

  // Send a message
  const result = await discord.sendMessage('123456789', {
    content: 'Hello from ServiceJS! 👋',
    embeds: [{
      title: 'Deployment Complete',
      description: 'Version 1.2.3 deployed successfully',
      color: 0x00ff00,
      fields: [
        { name: 'Environment', value: 'Production', inline: true },
        { name: 'Duration', value: '2m 34s', inline: true },
      ],
    }],
  });

  if (isOk(result)) {
    console.log('Message sent:', result.value.id);

    // Add reaction
    await discord.addReaction(result.value.channel_id, result.value.id, '✅');
  }

  await discord.destroy();
}

main().catch(console.error);
