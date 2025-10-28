/**
 * Basic SendGrid adapter usage example
 */

import { createSendGridAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createSendGridAdapter();

  // Initialize with API key
  const initResult = await adapter.init({
    apiKey: 'your-sendgrid-api-key',
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
    subject: 'Hello from SendGrid!',
    html: '<h1>Welcome</h1><p>This email was sent via SendGrid.</p>',
    text: 'Welcome! This email was sent via SendGrid.',
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
    to: ['user1@example.com', 'user2@example.com'],
    subject: 'Team Announcement',
    html: '<h2>Important Update</h2><p>Please review the following information.</p>',
  });

  if (isOk(multipleResult)) {
    console.log('Email sent to multiple recipients:', multipleResult.value.id);
  }

  // Send email with CC and BCC
  const ccResult = await adapter.send({
    from: 'sender@example.com',
    to: 'primary@example.com',
    cc: 'manager@example.com',
    bcc: 'admin@example.com',
    subject: 'Project Status',
    html: '<p>Here is the latest project status update.</p>',
  });

  if (isOk(ccResult)) {
    console.log('Email with CC/BCC sent:', ccResult.value.id);
  }

  // Send email with reply-to
  const replyToResult = await adapter.send({
    from: 'noreply@example.com',
    to: 'user@example.com',
    replyTo: 'support@example.com',
    subject: 'Support Request Received',
    html: '<p>We have received your support request and will respond shortly.</p>',
    text: 'We have received your support request and will respond shortly.',
  });

  if (isOk(replyToResult)) {
    console.log('Email with reply-to sent:', replyToResult.value.id);
  }

  // Send email with attachments
  const attachmentResult = await adapter.send({
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Document Attached',
    html: '<p>Please find the requested document attached.</p>',
    attachments: [
      {
        filename: 'report.pdf',
        content: Buffer.from('PDF content here'),
        contentType: 'application/pdf',
      },
      {
        filename: 'data.csv',
        content: 'Name,Email\nJohn,john@example.com\nJane,jane@example.com',
        contentType: 'text/csv',
      },
    ],
  });

  if (isOk(attachmentResult)) {
    console.log('Email with attachments sent:', attachmentResult.value.id);
  }

  // Send rich HTML email
  const richHtmlResult = await adapter.send({
    from: 'marketing@example.com',
    to: 'user@example.com',
    subject: 'Special Offer',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 5px;">
            <h1 style="color: #007bff;">Limited Time Offer!</h1>
            <p>Get <strong>50% off</strong> on all products this week.</p>
            <a href="https://example.com/offer" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px;">
              Shop Now
            </a>
          </div>
        </body>
      </html>
    `,
  });

  if (isOk(richHtmlResult)) {
    console.log('Rich HTML email sent:', richHtmlResult.value.id);
  }

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
