/**
 * Advanced Usage Example for @servicejs/config
 *
 * This example demonstrates a complete real-world application configuration setup:
 * - Multi-environment configuration (dev, staging, production)
 * - Layered configuration merging (base -> environment -> local)
 * - Environment variable substitution with validation
 * - Type-safe configuration with Zod schemas
 * - Secret and PII protection
 */

import {
  createEnvSubstitution,
  mergeWithEnvironment,
  parseAuto,
  PII,
  schemas,
  Secret,
  validate,
} from '@servicejs/config';
import { isErr } from '@servicejs/result';
import { z } from 'zod';

// Define comprehensive application config schema
const AppConfigSchema = z.object({
  environment: schemas.environment,

  server: z.object({
    port: schemas.port,
    host: schemas.host,
    ssl: z.boolean(),
    workers: schemas.positiveInt.optional(),
  }),

  database: z.object({
    url: z.string().url(),
    poolSize: schemas.positiveInt,
    ssl: z.boolean(),
    // Transform password to Secret
    password: z.string().transform(Secret.create),
  }),

  redis: z.object({
    host: schemas.host,
    port: schemas.port,
    // Transform password to Secret
    password: z.string().transform(Secret.create),
  }),

  logging: z.object({
    level: schemas.logLevel,
    format: z.enum(['json', 'text']),
    destination: z.string(),
  }),

  auth: z.object({
    // Transform JWT secret to Secret
    jwtSecret: z.string().min(32).transform(Secret.create),
    tokenExpiry: z.string().regex(/^\d+[smhd]$/),
    providers: z.array(z.enum(['google', 'github', 'email'])),
  }),

  features: z.object({
    analytics: z.boolean(),
    betaFeatures: z.boolean(),
    maintenanceMode: z.boolean(),
  }),

  admin: z.object({
    // Transform admin emails to PII with partial redaction
    emails: z.array(z.string().email().transform(email => PII.create(email, 'partial'))),
  }),
});

type AppConfig = z.infer<typeof AppConfigSchema>;

// Base configuration (shared across all environments)
const baseConfigYAML = `
environment: development

server:
  port: 3000
  host: localhost
  ssl: false

database:
  url: postgresql://localhost:5432/myapp
  poolSize: 10
  ssl: false
  password: dev-password

redis:
  host: localhost
  port: 6379
  password: dev-redis-password

logging:
  level: info
  format: text
  destination: stdout

auth:
  jwtSecret: default-secret-key-that-should-be-changed-in-production
  tokenExpiry: 24h
  providers:
    - email

features:
  analytics: false
  betaFeatures: true
  maintenanceMode: false

admin:
  emails:
    - admin@example.com
`;

// Production environment overrides
const productionConfigYAML = `
environment: production

server:
  port: "\${PORT}"
  host: "\${HOST}"
  ssl: true
  workers: 4

database:
  url: "\${DATABASE_URL}"
  poolSize: 50
  ssl: true
  password: "\${DB_PASSWORD}"

redis:
  host: "\${REDIS_HOST}"
  port: "\${REDIS_PORT}"
  password: "\${REDIS_PASSWORD}"

logging:
  level: error
  format: json
  destination: /var/log/app.log

auth:
  jwtSecret: "\${JWT_SECRET}"
  tokenExpiry: 1h

features:
  analytics: true
  betaFeatures: false
  maintenanceMode: false

admin:
  emails:
    - "\${ADMIN_EMAIL}"
`;

// Development environment overrides
const developmentConfigYAML = `
environment: development

logging:
  level: debug

features:
  betaFeatures: true
  analytics: false
`;

// Local overrides (not committed to git)
const localConfigYAML = `
features:
  betaFeatures: true
  maintenanceMode: false
`;

// Simulate different environments
async function loadConfig(env: 'development' | 'production'): Promise<AppConfig> {
  console.log(`\n=== Loading Configuration for ${env.toUpperCase()} ===\n`);

  // Set environment variables for production
  if (env === 'production' && typeof Bun !== 'undefined') {
    Bun.env.PORT = '8080';
    Bun.env.HOST = '0.0.0.0';
    Bun.env.DATABASE_URL = 'postgresql://prod-user@prod-db.example.com:5432/prod_db';
    Bun.env.DB_PASSWORD = 'super-secret-db-password-123';
    Bun.env.REDIS_HOST = 'redis.example.com';
    Bun.env.REDIS_PORT = '6379';
    Bun.env.REDIS_PASSWORD = 'super-secret-redis-password-456';
    Bun.env.JWT_SECRET = 'very-long-and-secure-jwt-secret-key-for-production-use-only';
    Bun.env.ADMIN_EMAIL = 'admin@production.example.com';
  }

  // 1. Parse base configuration
  console.log('1. Parsing base configuration...');
  const baseResult = parseAuto(baseConfigYAML, 'base.yaml');
  if (isErr(baseResult)) {
    throw new Error(`Failed to parse base config: ${baseResult.error.message}`);
  }
  console.log('   ✓ Base config parsed');

  // 2. Parse environment-specific configuration
  console.log(`2. Parsing ${env} environment configuration...`);
  const envConfigYAML = env === 'production' ? productionConfigYAML : developmentConfigYAML;
  const envResult = parseAuto(envConfigYAML, `${env}.yaml`);
  if (isErr(envResult)) {
    throw new Error(`Failed to parse ${env} config: ${envResult.error.message}`);
  }
  console.log(`   ✓ ${env} config parsed`);

  // 3. Parse local configuration
  console.log('3. Parsing local configuration...');
  const localResult = parseAuto(localConfigYAML, 'local.yaml');
  if (isErr(localResult)) {
    throw new Error(`Failed to parse local config: ${localResult.error.message}`);
  }
  console.log('   ✓ Local config parsed');

  // 4. Merge configurations (base -> env -> local)
  console.log('4. Merging configurations...');
  const mergedConfig = mergeWithEnvironment(
    baseResult.value.value,
    envResult.value.value,
    localResult.value.value,
    { strategy: 'merge' }
  );
  console.log('   ✓ Configurations merged');

  // 5. Substitute environment variables
  console.log('5. Substituting environment variables...');
  const substitute = createEnvSubstitution({
    required: env === 'production', // Strict in production
    defaults: {
      PORT: '3000',
      HOST: 'localhost',
    },
  });

  const substitutedResult = substitute(mergedConfig);
  if (isErr(substitutedResult)) {
    throw new Error(`Failed to substitute env vars: ${substitutedResult.error.message}`);
  }
  console.log('   ✓ Environment variables substituted');

  // 6. Validate against schema
  console.log('6. Validating configuration...');
  const validationResult = validate(substitutedResult.value, AppConfigSchema);
  if (isErr(validationResult)) {
    console.error('   ✗ Validation failed:');
    validationResult.error.errors.forEach((err) => {
      console.error(`     - ${err.path.join('.')}: ${err.message}`);
    });
    throw new Error('Configuration validation failed');
  }
  console.log('   ✓ Configuration validated\n');

  return validationResult.value;
}

// Demo: Load configuration for different environments
async function main() {
  try {
    // Development configuration
    const devConfig = await loadConfig('development');
    console.log('Development Configuration:');
    console.log('  Environment:', devConfig.environment);
    console.log('  Server:', `${devConfig.server.host}:${devConfig.server.port}`);
    console.log('  Database URL:', devConfig.database.url);
    console.log('  Database Password:', devConfig.database.password); // Shows: Secret { [REDACTED] }
    console.log('  JWT Secret:', devConfig.auth.jwtSecret); // Shows: Secret { [REDACTED] }
    console.log('  Log Level:', devConfig.logging.level);
    console.log('  Admin Emails:', devConfig.admin.emails); // Shows: [ PII { ****@example.com } ]
    console.log('  Beta Features:', devConfig.features.betaFeatures);

    console.log('\n' + '='.repeat(60) + '\n');

    // Production configuration
    const prodConfig = await loadConfig('production');
    console.log('Production Configuration:');
    console.log('  Environment:', prodConfig.environment);
    console.log('  Server:', `${prodConfig.server.host}:${prodConfig.server.port}`);
    console.log('  Database URL:', prodConfig.database.url);
    console.log('  Database Password:', prodConfig.database.password); // Shows: Secret { [REDACTED] }
    console.log('  JWT Secret:', prodConfig.auth.jwtSecret); // Shows: Secret { [REDACTED] }
    console.log('  Redis:', `${prodConfig.redis.host}:${prodConfig.redis.port}`);
    console.log('  Redis Password:', prodConfig.redis.password); // Shows: Secret { [REDACTED] }
    console.log('  Workers:', prodConfig.server.workers);
    console.log('  Pool Size:', prodConfig.database.poolSize);
    console.log('  Log Level:', prodConfig.logging.level);
    console.log('  Admin Emails:', prodConfig.admin.emails); // Shows: [ PII { ****@production.example.com } ]
    console.log('  Analytics:', prodConfig.features.analytics);

    console.log('\n' + '='.repeat(60) + '\n');

    // Demonstrate accessing secrets safely
    console.log('Accessing Secrets Safely:');
    console.log('  Dev DB Password (exposed):', devConfig.database.password.expose());
    console.log('  Dev DB Password (in JSON):', JSON.stringify({ password: devConfig.database.password }));

    console.log('\n  Destroying dev password...');
    devConfig.database.password.destroy();
    console.log('  Dev DB Password (after destroy):', devConfig.database.password.expose()); // undefined
    console.log('  Is destroyed?', devConfig.database.password.isDestroyed()); // true

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('✓ Configuration loading complete!');

  } catch (error) {
    console.error('\n✗ Failed to load configuration:', error);
    process.exit(1);
  }
}

main();
