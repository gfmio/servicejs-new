/**
 * Kafka Test Container Helper
 *
 * Starts a Kafka container for testing using Docker
 */

import { $ } from 'bun';

export interface KafkaContainer {
  host: string;
  port: number;
  containerId: string;
  stop: () => Promise<void>;
}

const KAFKA_IMAGE = 'apache/kafka:latest';
const KAFKA_PORT = 19092; // Use non-standard port to avoid conflicts

/**
 * Start a Kafka container for testing
 */
export async function startKafkaContainer(): Promise<KafkaContainer> {
  console.log('🐳 Starting Kafka container...');

  try {
    // Pull the Kafka image if not present
    await $`docker pull ${KAFKA_IMAGE}`.quiet();

    // Start Kafka container in KRaft mode (no ZooKeeper needed)
    const result = await $`docker run -d --rm \
      -e CLUSTER_ID=test-cluster \
      -p ${KAFKA_PORT}:9092 \
      -e KAFKA_NODE_ID=1 \
      -e KAFKA_PROCESS_ROLES=broker,controller \
      -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
      -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:${KAFKA_PORT} \
      -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
      -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
      -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
      -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
      -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
      -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
      -e KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0 \
      -e KAFKA_NUM_PARTITIONS=1 \
      ${KAFKA_IMAGE}`.text();
    const containerId = result.trim();

    console.log(`✅ Kafka container started: ${containerId.substring(0, 12)}`);

    // Wait for Kafka to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 120;

    while (!ready && attempts < maxAttempts) {
      try {
        // Try to get broker metadata to check if Kafka is ready
        const logs = await $`docker logs ${containerId}`.text();
        if (logs.includes('Kafka Server started') || logs.includes('[KafkaServer id=1] started')) {
          ready = true;
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
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
      throw new Error('Kafka container failed to become ready');
    }

    // Give Kafka extra time to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('✅ Kafka is ready\n');

    return {
      host: 'localhost',
      port: KAFKA_PORT,
      containerId,
      stop: async () => {
        console.log('\n🛑 Stopping Kafka container...');
        try {
          await $`docker stop ${containerId}`.quiet();
          console.log('✅ Kafka container stopped');
        } catch (error) {
          console.error('Failed to stop Kafka container:', error);
        }
      },
    };
  } catch (error) {
    console.error('❌ Failed to start Kafka container:', error);
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
