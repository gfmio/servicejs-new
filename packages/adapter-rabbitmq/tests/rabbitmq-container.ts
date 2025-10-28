/**
 * RabbitMQ Test Container Helper
 *
 * Starts a RabbitMQ container for testing using Docker
 */

import { $ } from 'bun';

export interface RabbitMQContainer {
  host: string;
  port: number;
  username: string;
  password: string;
  containerId: string;
  stop: () => Promise<void>;
}

const RABBITMQ_IMAGE = 'rabbitmq:3-management-alpine';
const RABBITMQ_PORT = 15672; // Use non-standard port to avoid conflicts
const RABBITMQ_AMQP_PORT = 15673;
const RABBITMQ_USER = 'guest';
const RABBITMQ_PASSWORD = 'guest';

/**
 * Start a RabbitMQ container for testing
 */
export async function startRabbitMQContainer(): Promise<RabbitMQContainer> {
  console.log('🐳 Starting RabbitMQ container...');

  try {
    // Pull the RabbitMQ image if not present
    await $`docker pull ${RABBITMQ_IMAGE}`.quiet();

    // Start RabbitMQ container
    const result = await $`docker run -d --rm \
      -e RABBITMQ_DEFAULT_USER=${RABBITMQ_USER} \
      -e RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD} \
      -p ${RABBITMQ_AMQP_PORT}:5672 \
      -p ${RABBITMQ_PORT}:15672 \
      ${RABBITMQ_IMAGE}`.text();
    const containerId = result.trim();

    console.log(`✅ RabbitMQ container started: ${containerId.substring(0, 12)}`);

    // Wait for RabbitMQ to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 90;

    while (!ready && attempts < maxAttempts) {
      try {
        await $`docker exec ${containerId} rabbitmq-diagnostics ping`.quiet();
        ready = true;
      } catch {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!ready) {
      try {
        await $`docker stop ${containerId}`.quiet();
      } catch {
        // Container may already be stopped
      }
      throw new Error('RabbitMQ container failed to become ready');
    }

    // Give it a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('✅ RabbitMQ is ready\n');

    return {
      host: 'localhost',
      port: RABBITMQ_AMQP_PORT,
      username: RABBITMQ_USER,
      password: RABBITMQ_PASSWORD,
      containerId,
      stop: async () => {
        console.log('\n🛑 Stopping RabbitMQ container...');
        try {
          await $`docker stop ${containerId}`.quiet();
          console.log('✅ RabbitMQ container stopped');
        } catch (error) {
          console.error('Failed to stop RabbitMQ container:', error);
        }
      },
    };
  } catch (error) {
    console.error('❌ Failed to start RabbitMQ container:', error);
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
