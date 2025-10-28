import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createCassandraAdapter } from '../src/cassandra.js';
import { isOk } from '@servicejs/result';

describe('Cassandra Adapter', () => {
  let container: StartedTestContainer | undefined;
  let adapter: ReturnType<typeof createCassandraAdapter>;

  beforeAll(async () => {
    try {
      container = await new GenericContainer('cassandra:4.1')
        .withExposedPorts(9042)
        .withStartupTimeout(120000)
        .start();

      await new Promise((resolve) => setTimeout(resolve, 30000));
    } catch (error) {
      console.warn('Failed to start Cassandra container:', error);
    }

    adapter = createCassandraAdapter();
  }, 150000);

  afterAll(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  test('init succeeds', async () => {
    const config = container
      ? {
          contactPoints: [container.getHost()],
          localDataCenter: 'datacenter1',
        }
      : {
          contactPoints: ['127.0.0.1'],
          localDataCenter: 'datacenter1',
        };

    const result = await adapter.init(config);
    expect(isOk(result)).toBe(true);
  }, 60000);

  test('health check works', async () => {
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
  });
});
