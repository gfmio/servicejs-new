/**
 * Build application configuration from environment variables
 */

import { createInMemoryEnv } from '@servicejs/capability-env';
import type { EnvironmentCapability } from '@servicejs/capability-env';

// Application configuration interface
interface AppConfig {
  environment: 'development' | 'production' | 'test';
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    poolSize: number;
  };
  features: {
    debug: boolean;
    analytics: boolean;
  };
}

// Helper to get required env var
function requireEnv(env: EnvironmentCapability, key: string): string {
  const value = env.get(key);
  if (!value.some) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value.value;
}

// Helper to get optional env var with default
function getEnvOr(env: EnvironmentCapability, key: string, defaultValue: string): string {
  const value = env.get(key);
  return value.some ? value.value : defaultValue;
}

// Create environment with configuration
const env = createInMemoryEnv({
  NODE_ENV: 'production',
  PORT: '8080',
  HOST: '0.0.0.0',
  DATABASE_URL: 'postgresql://localhost:5432/myapp',
  DATABASE_POOL_SIZE: '20',
  DEBUG: 'false',
  ANALYTICS_ENABLED: 'true',
});

// Build configuration from environment
const config: AppConfig = {
  environment: requireEnv(env, 'NODE_ENV') as AppConfig['environment'],
  server: {
    port: parseInt(requireEnv(env, 'PORT'), 10),
    host: getEnvOr(env, 'HOST', '127.0.0.1'),
  },
  database: {
    url: requireEnv(env, 'DATABASE_URL'),
    poolSize: parseInt(getEnvOr(env, 'DATABASE_POOL_SIZE', '10'), 10),
  },
  features: {
    debug: getEnvOr(env, 'DEBUG', 'false') === 'true',
    analytics: getEnvOr(env, 'ANALYTICS_ENABLED', 'false') === 'true',
  },
};

console.log('Application Configuration:\n');
console.log(JSON.stringify(config, null, 2));
