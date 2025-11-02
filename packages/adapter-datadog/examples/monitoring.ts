/**
 * Datadog system monitoring example
 *
 * This example demonstrates:
 * - Monitoring system metrics
 * - Custom business metrics
 * - Real-time monitoring patterns
 */

import { createDatadogAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

class SystemMonitor {
  private adapter = createDatadogAdapter();

  async init() {
    await this.adapter.init({
      apiKey: 'your-api-key',
      service: 'system-monitor',
      env: 'production',
      tags: ['monitoring:enabled', 'host:web-01']
    });
  }

  async monitorSystem() {
    // CPU usage
    await this.adapter.gauge('system.cpu.usage', 45.2, {
      core: 'average'
    });

    // Memory usage
    await this.adapter.gauge('system.memory.used', 8.5, {
      unit: 'GB'
    });
    await this.adapter.gauge('system.memory.total', 16, {
      unit: 'GB'
    });

    // Disk usage
    await this.adapter.gauge('system.disk.used', 125, {
      mount: '/',
      unit: 'GB'
    });

    console.log('✓ System metrics recorded');
  }

  async monitorApplication() {
    // Active connections
    await this.adapter.gauge('app.connections.active', 150);

    // Request rate
    await this.adapter.increment('app.requests.total', 1, {
      endpoint: '/api/users',
      method: 'GET'
    });

    // Response time distribution
    await this.adapter.distribution('app.response_time', 85, {
      endpoint: '/api/users',
      status: '200'
    });

    // Error rate
    await this.adapter.increment('app.errors.total', 0, {
      type: '5xx'
    });

    console.log('✓ Application metrics recorded');
  }

  async monitorBusiness() {
    // Active users
    await this.adapter.gauge('business.users.active', 1250);

    // Revenue (daily)
    await this.adapter.gauge('business.revenue.daily', 45000, {
      currency: 'USD'
    });

    // Conversions
    await this.adapter.increment('business.conversions', 1, {
      source: 'organic',
      plan: 'premium'
    });

    // Cart abandonment
    await this.adapter.gauge('business.cart.abandonment_rate', 0.25);

    console.log('✓ Business metrics recorded');
  }

  async monitorDatabase() {
    // Query performance
    await this.adapter.histogram('db.query.duration', 42, {
      operation: 'SELECT',
      table: 'users'
    });

    // Connection pool
    await this.adapter.gauge('db.pool.size', 10);
    await this.adapter.gauge('db.pool.active', 7);
    await this.adapter.gauge('db.pool.idle', 3);

    // Slow queries
    await this.adapter.increment('db.queries.slow', 1, {
      threshold: '1000ms'
    });

    console.log('✓ Database metrics recorded');
  }

  async logActivity() {
    await this.adapter.info('System monitoring cycle completed', {
      cycle_duration_ms: 150,
      metrics_sent: 20
    });
  }
}

async function main() {
  const monitor = new SystemMonitor();
  await monitor.init();

  console.log('Starting monitoring cycle...\n');

  // Monitor different aspects
  await monitor.monitorSystem();
  await monitor.monitorApplication();
  await monitor.monitorBusiness();
  await monitor.monitorDatabase();

  await monitor.logActivity();

  console.log('\nMonitoring cycle complete!');
  console.log('View your metrics at: https://app.datadoghq.com/metric/explorer');
}

main().catch(console.error);
