/**
 * Basic Resend adapter usage example
 */

import { createResendAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createResendAdapter();

  // Initialize with API key
  const initResult = await adapter.init({
    apiKey: 'your-resend-api-key',
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
    from: 'onboarding@resend.dev',
    to: 'user@example.com',
    subject: 'Hello from Resend!',
    html: '<h1>Welcome</h1><p>Thanks for signing up!</p>',
    text: 'Welcome! Thanks for signing up!',
  });

  if (isOk(sendResult)) {
    console.log('Email sent successfully!');
    console.log('Message ID:', sendResult.value.id);
    console.log('Provider:', sendResult.value.provider);
  } else {
    console.error('Failed to send email:', sendResult.error);
  }

  // Send email with CC and BCC
  const ccResult = await adapter.send({
    from: 'onboarding@resend.dev',
    to: 'user@example.com',
    cc: 'manager@example.com',
    bcc: ['admin@example.com', 'archive@example.com'],
    subject: 'Team Update',
    html: '<p>Here is the latest team update.</p>',
  });

  if (isOk(ccResult)) {
    console.log('Email with CC/BCC sent:', ccResult.value.id);
  }

  // Send email with reply-to
  const replyToResult = await adapter.send({
    from: 'noreply@example.com',
    to: 'user@example.com',
    replyTo: 'support@example.com',
    subject: 'Support Ticket',
    html: '<p>Your support ticket has been created.</p>',
  });

  if (isOk(replyToResult)) {
    console.log('Email with reply-to sent:', replyToResult.value.id);
  }

  // Send email with attachments
  const attachmentResult = await adapter.send({
    from: 'onboarding@resend.dev',
    to: 'user@example.com',
    subject: 'Invoice',
    html: '<p>Please find your invoice attached.</p>',
    attachments: [
      {
        filename: 'invoice.pdf',
        content: Buffer.from('PDF content here'),
        contentType: 'application/pdf',
      },
    ],
  });

  if (isOk(attachmentResult)) {
    console.log('Email with attachment sent:', attachmentResult.value.id);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
