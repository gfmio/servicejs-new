/**
 * Basic Usage Example for @servicejs/config
 *
 * This example demonstrates:
 * - Parsing configuration from different formats
 * - Environment variable substitution
 * - Configuration merging
 * - Schema validation with Zod
 */

import {
  createEnvSubstitution,
  merge,
  parseJSON,
  parseYAML,
  schemas,
  validate,
} from '@servicejs/config';
import { isErr, isOk } from '@servicejs/result';
import { z } from 'zod';

// Example 1: Parse JSON configuration
console.log('=== Example 1: Parse JSON ===');
const jsonConfig = `{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "url": "postgresql://localhost:5432/mydb"
  }
}`;

const jsonResult = parseJSON(jsonConfig);
if (isOk(jsonResult)) {
  console.log('✓ Parsed JSON config:', jsonResult.value);
} else {
  console.error('✗ Failed to parse:', jsonResult.error.message);
}

// Example 2: Parse YAML configuration
console.log('\n=== Example 2: Parse YAML ===');
const yamlConfig = `
server:
  port: 3000
  host: localhost
database:
  url: postgresql://localhost:5432/mydb
`;

const yamlResult = parseYAML(yamlConfig);
if (isOk(yamlResult)) {
  console.log('✓ Parsed YAML config:', yamlResult.value);
} else {
  console.error('✗ Failed to parse:', yamlResult.error.message);
}

// Example 3: Environment variable substitution
console.log('\n=== Example 3: Environment Variable Substitution ===');

// Set some example environment variables
if (typeof Bun !== 'undefined') {
  Bun.env.DB_HOST = 'production-db.example.com';
  Bun.env.DB_PORT = '5432';
  Bun.env.API_KEY = 'secret-key-123';
}

const configWithEnv = {
  database: {
    host: '${DB_HOST}',
    port: '${DB_PORT}',
  },
  api: {
    key: '${API_KEY}',
    endpoint: 'https://api.example.com',
  },
};

const substitute = createEnvSubstitution({
  defaults: {
    DB_HOST: 'localhost',
    DB_PORT: '5432',
  },
});

const envResult = substitute(configWithEnv);
if (isOk(envResult)) {
  console.log('✓ Config with env vars substituted:', envResult.value);
} else {
  console.error('✗ Failed to substitute:', envResult.error.message);
}

// Example 4: Merge configurations
console.log('\n=== Example 4: Merge Configurations ===');

const baseConfig = {
  server: {
    port: 3000,
    host: 'localhost',
    ssl: false,
  },
  logging: {
    level: 'info',
  },
};

const prodConfig = {
  server: {
    port: 8080,
    ssl: true,
  },
  logging: {
    level: 'error',
  },
};

const mergedConfig = merge([baseConfig, prodConfig], { strategy: 'merge' });
console.log('✓ Merged config:', mergedConfig);

// Example 5: Validate configuration with Zod
console.log('\n=== Example 5: Schema Validation ===');

const configSchema = z.object({
  server: z.object({
    port: schemas.port,
    host: schemas.host,
    ssl: z.boolean(),
  }),
  logging: z.object({
    level: schemas.logLevel,
  }),
});

const validationResult = validate(mergedConfig, configSchema);
if (isOk(validationResult)) {
  console.log('✓ Valid config:', validationResult.value);
  console.log('  Port:', validationResult.value.server.port);
  console.log('  Log level:', validationResult.value.logging.level);
} else {
  console.error('✗ Validation failed:');
  validationResult.error.errors.forEach((err) => {
    console.error(`  - ${err.path.join('.')}: ${err.message}`);
  });
}

// Example 6: Complete workflow
console.log('\n=== Example 6: Complete Workflow ===');

// Start with a config string
const configString = `{
  "server": {
    "port": "\${PORT}",
    "host": "\${HOST}"
  },
  "database": {
    "url": "\${DATABASE_URL}"
  }
}`;

// Set environment variables
if (typeof Bun !== 'undefined') {
  Bun.env.PORT = '8080';
  Bun.env.HOST = '0.0.0.0';
  Bun.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/mydb';
}

// 1. Parse
const parseResult = parseJSON(configString);
if (isErr(parseResult)) {
  console.error('✗ Parse failed:', parseResult.error.message);
  process.exit(1);
}

// 2. Substitute env vars
const substituteResult = substitute(parseResult.value);
if (isErr(substituteResult)) {
  console.error('✗ Substitution failed:', substituteResult.error.message);
  process.exit(1);
}

// 3. Validate
const finalSchema = z.object({
  server: z.object({
    port: z.string().regex(/^\d+$/),
    host: z.string(),
  }),
  database: z.object({
    url: z.string().url(),
  }),
});

const finalResult = validate(substituteResult.value, finalSchema);
if (isOk(finalResult)) {
  console.log('✓ Final validated config:', finalResult.value);
} else {
  console.error('✗ Final validation failed:', finalResult.error.message);
}
