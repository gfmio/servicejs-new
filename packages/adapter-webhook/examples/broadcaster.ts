/**
 * Multi-endpoint webhook broadcaster example
 *
 * This example demonstrates:
 * - Broadcasting webhooks to multiple endpoints
 * - Tracking success/failure for each endpoint
 * - Parallel webhook delivery
 */

import { createWebhookAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

class WebhookBroadcaster {
  private adapter = createWebhookAdapter();
  private endpoints: string[] = [];

  async init(secret: string, endpoints: string[]) {
    await this.adapter.init({
      secret,
      maxRetries: 3,
      retryDelay: 1000
    });
    this.endpoints = endpoints;
  }

  async broadcast(event: string, data: any) {
    console.log(`Broadcasting event "${event}" to ${this.endpoints.length} endpoints...`);

    const payload = {
      event,
      data,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    };

    // Send to all endpoints in parallel
    const results = await Promise.allSettled(
      this.endpoints.map(url =>
        this.adapter.send(url, payload)
      )
    );

    // Analyze results
    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      results: [] as any[]
    };

    results.forEach((result, index) => {
      const url = this.endpoints[index];

      if (result.status === 'fulfilled' && isOk(result.value)) {
        summary.successful++;
        summary.results.push({
          url,
          status: 'success',
          response: result.value.value
        });
        console.log(`  ✓ ${url}`);
      } else {
        summary.failed++;
        const error = result.status === 'rejected'
          ? result.reason
          : (result.value as any).error;
        summary.results.push({
          url,
          status: 'failed',
          error
        });
        console.log(`  ✗ ${url}: ${error}`);
      }
    });

    return summary;
  }
}

async function main() {
  const broadcaster = new WebhookBroadcaster();

  // Initialize with multiple endpoints
  // Note: Replace these with your actual webhook URLs
  await broadcaster.init('webhook-secret', [
    'https://webhook.site/endpoint-1',
    'https://webhook.site/endpoint-2',
    'https://webhook.site/endpoint-3'
  ]);

  // Broadcast an order completed event
  const summary = await broadcaster.broadcast('order.completed', {
    orderId: '12345',
    amount: 150.00,
    currency: 'USD',
    customer: {
      email: 'customer@example.com',
      name: 'Jane Smith'
    },
    items: [
      { id: 'item-1', name: 'Product A', quantity: 2, price: 50.00 },
      { id: 'item-2', name: 'Product B', quantity: 1, price: 50.00 }
    ]
  });

  console.log(`\n📊 Broadcast Summary:`);
  console.log(`  Total endpoints: ${summary.total}`);
  console.log(`  Successful: ${summary.successful}`);
  console.log(`  Failed: ${summary.failed}`);

  // Show detailed results
  console.log('\n📋 Detailed Results:');
  summary.results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.url}`);
    console.log(`   Status: ${result.status}`);
    if (result.response) {
      console.log(`   HTTP Status: ${result.response.statusCode}`);
      console.log(`   Attempts: ${result.response.attempts}`);
      console.log(`   Duration: ${result.response.duration}ms`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
}

main().catch(console.error);
