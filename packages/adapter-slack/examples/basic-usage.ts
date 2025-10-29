import { createSlackAdapter } from '@servicejs/adapter-slack';
import { isOk } from '@servicejs/result';

async function main() {
  const slack = createSlackAdapter();

  // Initialize with bot token
  await slack.init({
    botToken: process.env.SLACK_BOT_TOKEN || 'xoxb-your-bot-token',
  });

  console.log('=== Posting a Message ===\n');

  // Post a simple message
  const messageResult = await slack.postMessage({
    channel: 'C1234567890', // Replace with your channel ID
    text: 'Hello from ServiceJS! 👋',
  });

  if (isOk(messageResult)) {
    console.log('Message posted:', messageResult.value.ts);

    // Add a reaction to the message
    await slack.addReaction(messageResult.value.channel, messageResult.value.ts, 'tada');
    console.log('Reaction added!');

    // Update the message
    const updateResult = await slack.updateMessage(
      messageResult.value.channel,
      messageResult.value.ts,
      'Updated message! ✨'
    );

    if (isOk(updateResult)) {
      console.log('Message updated!');
    }
  }

  console.log('\n=== Channel Management ===\n');

  // List all channels
  const channelsResult = await slack.listChannels();
  if (isOk(channelsResult)) {
    console.log(`Found ${channelsResult.value.length} channels:`);
    channelsResult.value.slice(0, 5).forEach((channel) => {
      console.log(`  - ${channel.name} (${channel.id})`);
    });
  }

  console.log('\n=== User Management ===\n');

  // List users
  const usersResult = await slack.listUsers({ limit: 10 });
  if (isOk(usersResult)) {
    console.log(`Found ${usersResult.value.length} users:`);
    usersResult.value.slice(0, 5).forEach((user) => {
      console.log(`  - ${user.name} ${user.is_bot ? '(bot)' : ''}`);
    });
  }

  await slack.destroy();
}

main().catch(console.error);
