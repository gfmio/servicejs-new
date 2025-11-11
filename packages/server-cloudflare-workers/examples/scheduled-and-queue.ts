/**
 * Example: Scheduled Events + Queue Processing
 *
 * This example shows scheduled cron jobs that process queued tasks,
 * send reports, and perform cleanup operations.
 */

import { createScheduledHandler, createQueueHandler, createFetchHandler } from '../src';

interface Env {
  EMAIL_QUEUE: Queue<EmailTask>;
  REPORT_QUEUE: Queue<ReportTask>;
  KV: KVNamespace;
  DB: D1Database;
}

interface EmailTask {
  to: string;
  subject: string;
  body: string;
  priority: 'high' | 'normal' | 'low';
}

interface ReportTask {
  type: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  data: Record<string, unknown>;
}

// ============================================================================
// Scheduled Handler - Cron Jobs
// ============================================================================

const scheduledHandler = createScheduledHandler<Env>();

scheduledHandler.onScheduled(async (event, env, ctx) => {
  console.log(`Scheduled event triggered: ${event.cron}`);
  console.log(`Scheduled time: ${new Date(event.scheduledTime).toISOString()}`);

  // Daily cleanup job (runs at midnight)
  if (event.cron === '0 0 * * *') {
    console.log('Running daily cleanup job...');

    // Delete old KV entries (older than 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const keys = await env.KV.list();

    for (const key of keys.keys) {
      const metadata = await env.KV.getWithMetadata(key.name);
      if (metadata.metadata?.timestamp < thirtyDaysAgo) {
        await env.KV.delete(key.name);
        console.log(`Deleted old key: ${key.name}`);
      }
    }

    // Clean up old database records
    await env.DB.prepare('DELETE FROM logs WHERE created_at < datetime("now", "-30 days")').run();
    console.log('Cleaned up old database records');

    // Queue daily report
    await env.REPORT_QUEUE.send({
      type: 'daily',
      recipients: ['admin@example.com'],
      data: {
        date: new Date().toISOString(),
        cleanedKVKeys: keys.keys.length,
      },
    });
  }

  // Hourly health check (runs every hour)
  if (event.cron === '0 * * * *') {
    console.log('Running hourly health check...');

    // Check system health
    const health = {
      timestamp: Date.now(),
      kvAvailable: true,
      dbAvailable: true,
    };

    try {
      await env.KV.put('health-check', new Date().toISOString());
    } catch (error) {
      health.kvAvailable = false;
      console.error('KV health check failed:', error);
    }

    try {
      await env.DB.prepare('SELECT 1').first();
    } catch (error) {
      health.dbAvailable = false;
      console.error('DB health check failed:', error);
    }

    // Store health status
    await env.KV.put('last-health-check', JSON.stringify(health));

    // Alert if unhealthy
    if (!health.kvAvailable || !health.dbAvailable) {
      await env.EMAIL_QUEUE.send({
        to: 'ops@example.com',
        subject: 'System Health Alert',
        body: `Health check failed: ${JSON.stringify(health)}`,
        priority: 'high',
      });
    }
  }

  // Weekly report (runs every Monday at 8 AM)
  if (event.cron === '0 8 * * 1') {
    console.log('Generating weekly report...');

    // Gather weekly stats
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_requests,
        AVG(response_time) as avg_response_time
      FROM logs
      WHERE created_at > datetime("now", "-7 days")
    `).first();

    await env.REPORT_QUEUE.send({
      type: 'weekly',
      recipients: ['team@example.com'],
      data: {
        week: new Date().toISOString(),
        stats,
      },
    });
  }
});

scheduledHandler.onError((error) => {
  console.error('Scheduled job error:', error);
});

// ============================================================================
// Email Queue Consumer
// ============================================================================

const emailQueueHandler = createQueueHandler<Env, EmailTask>();

emailQueueHandler.onQueue(async (batch, env, ctx) => {
  console.log(`Processing ${batch.messages.length} emails from ${batch.queue}`);

  // Sort by priority
  const sortedMessages = batch.messages.sort((a, b) => {
    const priority = { high: 0, normal: 1, low: 2 };
    return priority[a.body.priority] - priority[b.body.priority];
  });

  for (const message of sortedMessages) {
    try {
      console.log(`Sending email to ${message.body.to}: ${message.body.subject}`);

      // Simulate email sending (in production, use Resend/SendGrid adapter)
      const sent = await sendEmail(message.body);

      if (sent) {
        // Log successful send
        await env.DB.prepare(
          'INSERT INTO email_log (recipient, subject, sent_at) VALUES (?, ?, ?)'
        )
          .bind(message.body.to, message.body.subject, new Date().toISOString())
          .run();

        console.log(`✓ Email sent to ${message.body.to}`);
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error(`✗ Failed to send email to ${message.body.to}:`, error);

      // Check retry count (Cloudflare automatically tracks this)
      if (message.attempts >= 3) {
        console.error(`Max retries reached for message ${message.id}`);

        // Store failed message for manual review
        await env.KV.put(
          `failed-email:${message.id}`,
          JSON.stringify(message.body),
          { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
        );
      }

      throw error; // Will trigger retry
    }
  }
});

emailQueueHandler.onError((error) => {
  console.error('Email queue error:', error);
});

// ============================================================================
// Report Queue Consumer
// ============================================================================

const reportQueueHandler = createQueueHandler<Env, ReportTask>();

reportQueueHandler.onQueue(async (batch, env, ctx) => {
  console.log(`Processing ${batch.messages.length} reports from ${batch.queue}`);

  for (const message of batch.messages) {
    try {
      const { type, recipients, data } = message.body;

      console.log(`Generating ${type} report for ${recipients.join(', ')}`);

      // Generate report content
      const report = generateReport(type, data);

      // Send report to each recipient
      for (const recipient of recipients) {
        await env.EMAIL_QUEUE.send({
          to: recipient,
          subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
          body: report,
          priority: 'normal',
        });
      }

      console.log(`✓ Report sent to ${recipients.length} recipients`);
    } catch (error) {
      console.error(`✗ Failed to process report:`, error);
      throw error;
    }
  }
});

reportQueueHandler.onError((error) => {
  console.error('Report queue error:', error);
});

// ============================================================================
// HTTP Handler - Manual Triggers
// ============================================================================

const httpHandler = createFetchHandler<Env>();

httpHandler.onFetch(async (request, env, ctx) => {
  const url = new URL(request.url);

  // POST /api/send-email - Queue an email
  if (url.pathname === '/api/send-email' && request.method === 'POST') {
    const body = JSON.parse(request.body as string);

    await env.EMAIL_QUEUE.send(body);

    return {
      statusCode: 202,
      body: JSON.stringify({ queued: true }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // GET /api/health - Get last health check
  if (url.pathname === '/api/health') {
    const health = await env.KV.get('last-health-check', 'json');

    return {
      statusCode: 200,
      body: JSON.stringify(health || { error: 'No health check data' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  return {
    statusCode: 404,
    body: 'Not found',
  };
});

// ============================================================================
// Helper Functions
// ============================================================================

async function sendEmail(task: EmailTask): Promise<boolean> {
  // Simulate email sending
  console.log(`Sending to ${task.to}: ${task.subject}`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  return true;
}

function generateReport(type: string, data: Record<string, unknown>): string {
  return `
# ${type.toUpperCase()} REPORT

Generated: ${new Date().toISOString()}

## Data
${JSON.stringify(data, null, 2)}

## Summary
This is a ${type} report generated automatically.
  `.trim();
}

// ============================================================================
// Exports
// ============================================================================

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    httpHandler.handleFetch(request, env, ctx),

  scheduled: (controller: ScheduledController, env: Env, ctx: ExecutionContext) =>
    scheduledHandler.handleScheduled(controller, env, ctx),

  queue: (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
    // Route to appropriate queue handler based on queue name
    if (batch.queue === 'email-queue') {
      return emailQueueHandler.handleQueue(batch, env, ctx);
    } else if (batch.queue === 'report-queue') {
      return reportQueueHandler.handleQueue(batch, env, ctx);
    }
  },
};

/* wrangler.toml configuration:

[triggers]
crons = [
  "0 0 * * *",      # Daily at midnight
  "0 * * * *",      # Every hour
  "0 8 * * 1"       # Weekly on Monday at 8 AM
]

[[queues.producers]]
queue = "email-queue"
binding = "EMAIL_QUEUE"

[[queues.producers]]
queue = "report-queue"
binding = "REPORT_QUEUE"

[[queues.consumers]]
queue = "email-queue"
max_batch_size = 10
max_batch_timeout = 5

[[queues.consumers]]
queue = "report-queue"
max_batch_size = 5
max_batch_timeout = 10

*/
