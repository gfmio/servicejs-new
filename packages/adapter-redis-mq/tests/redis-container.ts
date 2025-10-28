/**
 * Redis Test Container Helper
 *
 * Starts a Redis container for testing using Docker
 */

import { $ } from 'bun';

export interface RedisContainer {
  host: string;
  port: number;
  containerId: string;
  stop: () => Promise<void>;
}

const REDIS_IMAGE = 'redis:7-alpine';
const REDIS_PORT = 16379; // Use non-standard port to avoid conflicts

/**
 * Start a Redis container for testing
 */
export async function startRedisContainer(): Promise<RedisContainer> {
  console.log('🐳 Starting Redis container...');

  try {
    // Pull the Redis image if not present
    await $`docker pull ${REDIS_IMAGE}`.quiet();

    // Start Redis container
    const result = await $`docker run -d --rm -p ${REDIS_PORT}:6379 ${REDIS_IMAGE}`.text();
    const containerId = result.trim();

    console.log(`✅ Redis container started: ${containerId.substring(0, 12)}`);

    // Wait for Redis to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      try {
        await $`docker exec ${containerId} redis-cli ping`.quiet();
        ready = true;
      } catch {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (!ready) {
      await $`docker stop ${containerId}`.quiet();
      throw new Error('Redis container failed to become ready');
    }

    console.log('✅ Redis is ready\n');

    return {
      host: 'localhost',
      port: REDIS_PORT,
      containerId,
      stop: async () => {
        console.log('\n🛑 Stopping Redis container...');
        try {
          await $`docker stop ${containerId}`.quiet();
          console.log('✅ Redis container stopped');
        } catch (error) {
          console.error('Failed to stop Redis container:', error);
        }
      },
    };
  } catch (error) {
    console.error('❌ Failed to start Redis container:', error);
    throw error;
  }
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await $`docker --version`.quiet();
    return true;
  } catch {
    return false;
  }
}
