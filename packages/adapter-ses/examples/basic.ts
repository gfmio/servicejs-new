/**
 * Basic AWS SES adapter usage example
 */

import { createSESAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSESAdapter();

  // Initialize with AWS credentials
  const initResult = await adapter.init({
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'your-access-key-id',
      secretAccessKey: 'your-secret-access-key',
    },
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter
  const startResult = await adapter.start();
  if (!isOk(startResult)) {
    console.error('Failed to start:', startResult.error);
    return;
  }

  // Check health
  const healthResult = await adapter.health();
  if (isOk(healthResult)) {
    console.log('Health status:', healthResult.value.status);
  }

  // Send a simple email
  const sendResult = await adapter.send({
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Hello from AWS SES!',
    html: '<h1>Welcome</h1><p>This email was sent via AWS SES.</p>',
    text: 'Welcome! This email was sent via AWS SES.',
  });

  if (isOk(sendResult)) {
    console.log('Email sent successfully!');
    console.log('Message ID:', sendResult.value.id);
    console.log('Provider:', sendResult.value.provider);
  } else {
    console.error('Failed to send email:', sendResult.error);
  }

  // Send email to multiple recipients
  const multipleResult = await adapter.send({
    from: 'sender@example.com',
    to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
    subject: 'Newsletter',
    html: '<h2>Monthly Newsletter</h2><p>Check out our latest updates!</p>',
  });

  if (isOk(multipleResult)) {
    console.log('Email sent to multiple recipients:', multipleResult.value.id);
  }

  // Send email with CC and BCC
  const ccResult = await adapter.send({
    from: 'sender@example.com',
    to: 'primary@example.com',
    cc: 'manager@example.com',
    bcc: ['admin@example.com', 'archive@example.com'],
    subject: 'Quarterly Report',
    html: '<p>Please find the quarterly report below.</p>',
  });

  if (isOk(ccResult)) {
    console.log('Email with CC/BCC sent:', ccResult.value.id);
  }

  // Send email with reply-to
  const replyToResult = await adapter.send({
    from: 'noreply@example.com',
    to: 'user@example.com',
    replyTo: 'support@example.com',
    subject: 'Account Notification',
    html: '<p>Your account has been updated.</p>',
    text: 'Your account has been updated.',
  });

  if (isOk(replyToResult)) {
    console.log('Email with reply-to sent:', replyToResult.value.id);
  }

  // Send HTML-only email
  const htmlOnlyResult = await adapter.send({
    from: 'marketing@example.com',
    to: 'user@example.com',
    subject: 'New Features Available',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h1 style="color: #333;">New Features!</h1>
          <p>We've just launched some exciting new features:</p>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
            <li>Feature 3</li>
          </ul>
        </body>
      </html>
    `,
  });

  if (isOk(htmlOnlyResult)) {
    console.log('HTML email sent:', htmlOnlyResult.value.id);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
