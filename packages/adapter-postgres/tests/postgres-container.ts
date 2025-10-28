/**
 * PostgreSQL Test Container Helper
 *
 * Starts a PostgreSQL container for testing using Docker
 */

import { $ } from 'bun';

export interface PostgresContainer {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  containerId: string;
  stop: () => Promise<void>;
}

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_PORT = 15432; // Use non-standard port to avoid conflicts
const POSTGRES_PASSWORD = 'testpass';
const POSTGRES_USER = 'testuser';
const POSTGRES_DB = 'testdb';

/**
 * Start a PostgreSQL container for testing
 */
export async function startPostgresContainer(): Promise<PostgresContainer> {
  console.log('🐳 Starting PostgreSQL container...');

  try {
    // Pull the PostgreSQL image if not present
    await $`docker pull ${POSTGRES_IMAGE}`.quiet();

    // Start PostgreSQL container
    const result = await $`docker run -d --rm \
      -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
      -e POSTGRES_USER=${POSTGRES_USER} \
      -e POSTGRES_DB=${POSTGRES_DB} \
      -p ${POSTGRES_PORT}:5432 \
      ${POSTGRES_IMAGE}`.text();
    const containerId = result.trim();

    console.log(`✅ PostgreSQL container started: ${containerId.substring(0, 12)}`);

    // Wait for PostgreSQL to be ready
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      try {
        await $`docker exec ${containerId} pg_isready -U ${POSTGRES_USER}`.quiet();
        ready = true;
      } catch {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    if (!ready) {
      await $`docker stop ${containerId}`.quiet();
      throw new Error('PostgreSQL container failed to become ready');
    }

    // Give it a moment to fully initialize
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('✅ PostgreSQL is ready\n');

    return {
      host: 'localhost',
      port: POSTGRES_PORT,
      database: POSTGRES_DB,
      user: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      containerId,
      stop: async () => {
        console.log('\n🛑 Stopping PostgreSQL container...');
        try {
          await $`docker stop ${containerId}`.quiet();
          console.log('✅ PostgreSQL container stopped');
        } catch (error) {
          console.error('Failed to stop PostgreSQL container:', error);
        }
      },
    };
  } catch (error) {
    console.error('❌ Failed to start PostgreSQL container:', error);
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
