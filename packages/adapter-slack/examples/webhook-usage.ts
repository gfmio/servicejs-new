import { createSlackAdapter } from '@servicejs/adapter-slack';
import { isOk } from '@servicejs/result';

async function main() {
  const slack = createSlackAdapter();

  // Initialize with incoming webhook URL
  await slack.init({
    webhookUrl: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  });

  console.log('=== Posting via Webhook ===\n');

  // Post a simple message
  const result1 = await slack.postWebhook({
    text: 'Hello from webhook!',
  });

  if (isOk(result1)) {
    console.log('✓ Simple message sent');
  }

  // Post with custom username and icon
  const result2 = await slack.postWebhook({
    text: 'Custom bot message',
    username: 'ServiceJS Bot',
    icon_emoji: ':robot_face:',
  });

  if (isOk(result2)) {
    console.log('✓ Custom message sent');
  }

  // Post with rich formatting (blocks)
  const result3 = await slack.postWebhook({
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
          {
            type: 'mrkdwn',
            text: '*Environment:*\nProduction',
          },
          {
            type: 'mrkdwn',
            text: '*Version:*\nv1.2.3',
          },
          {
            type: 'mrkdwn',
            text: '*Status:*\n✅ Success',
          },
          {
            type: 'mrkdwn',
            text: '*Duration:*\n2m 34s',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Deployed by *ServiceJS* at ' + new Date().toLocaleTimeString(),
          },
        ],
      },
    ],
  });

  if (isOk(result3)) {
    console.log('✓ Rich message sent');
  }

  await slack.destroy();
}

main().catch(console.error);
