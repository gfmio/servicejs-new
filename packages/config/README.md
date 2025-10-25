# @servicejs/config

Configuration reading, parsing, validation and transformation capability for ServiceJS.

## Features

- 🔐 **Secret & PII Types**: Protect sensitive data from accidental exposure in logs and HTTP responses
- 📝 **Multiple Formats**: JSON, JSONC, JSON5, YAML, TOML, INI, TypeScript/JavaScript
- 🔍 **Auto-Detection**: Automatically detect and parse configuration formats
- 🌍 **Environment Variables**: Read and substitute environment variables with placeholders
- 🔄 **Merging & Extension**: Flexible configuration merging with multiple strategies
- ✅ **Schema Validation**: Built-in Zod integration for type-safe configuration
- 🎯 **Type-Safe**: Full TypeScript support with strict typing

## Installation

```bash
bun add @servicejs/config
```

## Quick Start

### Protecting Sensitive Data

```typescript
import { Secret, PII } from '@servicejs/config';

// Protect API keys and tokens
const apiKey = Secret.create('sk-1234567890');
console.log(apiKey); // Secret { [REDACTED] }
console.log(JSON.stringify({ apiKey })); // {"apiKey":"[REDACTED]"}

// Use the value safely
const key = apiKey.expose(); // 'sk-1234567890'

// Self-destruct after use
apiKey.destroy();
apiKey.expose(); // undefined

// Protect PII with different redaction strategies
const email = PII.create('user@example.com', 'partial');
console.log(email); // PII { ******.com }

const ssn = PII.create('123-45-6789', 'hash');
console.log(ssn); // PII { [HASH:a1b2c3d4] }
```

### Parsing Configuration Files

```typescript
import { parseAuto, parseJSON, parseYAML } from '@servicejs/config';
import { isOk } from '@servicejs/result';

// Auto-detect format from content and/or path
const result = parseAuto(configString, 'config.yaml');
if (isOk(result)) {
  console.log('Format:', result.value.format);
  console.log('Config:', result.value.value);
}

// Parse specific formats
const jsonResult = parseJSON('{"port": 3000}');
const yamlResult = parseYAML('port: 3000');
```

### Environment Variable Substitution

```typescript
import { createEnvSubstitution, substituteEnv } from '@servicejs/config';
import { isOk } from '@servicejs/result';

const config = {
  database: {
    host: '${DB_HOST}',
    port: '${DB_PORT}',
    password: '${DB_PASSWORD}',
  },
};

// Create substitution function
const substitute = createEnvSubstitution({
  required: true, // Fail if env var not found
  defaults: {
    DB_PORT: '5432',
  },
});

const result = substitute(config);
if (isOk(result)) {
  console.log(result.value);
  // {
  //   database: {
  //     host: 'localhost',
  //     port: '5432',
  //     password: 'secret123'
  //   }
  // }
}
```

### Merging Configurations

```typescript
import { merge, extend, mergeWithEnvironment } from '@servicejs/config';

// Merge multiple configs (later ones override earlier ones)
const baseConfig = { port: 3000, host: 'localhost' };
const prodConfig = { port: 8080, ssl: true };
const merged = merge([baseConfig, prodConfig]);
// { port: 8080, host: 'localhost', ssl: true }

// Deep merge with nested objects
const base = { server: { port: 3000, host: 'localhost' } };
const override = { server: { port: 8080 } };
const result = merge([base, override], { strategy: 'merge' });
// { server: { port: 8080, host: 'localhost' } }

// Extend without modifying original
const extended = extend(baseConfig, { debug: true });
// baseConfig is unchanged

// Common pattern: base -> environment -> local
const config = mergeWithEnvironment(
  baseConfig,
  process.env.NODE_ENV === 'production' ? prodConfig : devConfig,
  localConfig
);
```

### Schema Validation

```typescript
import { validate, schemas, coerceFromEnv } from '@servicejs/config';
import { z } from 'zod';
import { isOk } from '@servicejs/result';

// Define schema
const configSchema = z.object({
  port: schemas.port, // Built-in port validator (1-65535)
  host: schemas.host,
  database: z.object({
    url: schemas.url,
    poolSize: schemas.positiveInt,
  }),
  logLevel: schemas.logLevel,
});

// Validate configuration
const result = validate(config, configSchema);
if (isOk(result)) {
  // TypeScript knows the exact shape now
  const validConfig = result.value;
  console.log('Valid config:', validConfig);
} else {
  console.error('Validation errors:', result.error.errors);
}

// Coerce environment variables (which are always strings)
const envSchema = z.object({
  port: coerceFromEnv(z.number()), // Converts "3000" -> 3000
  enabled: coerceFromEnv(z.boolean()), // Converts "true" -> true
  items: coerceFromEnv(z.array(z.string())), // Parses JSON arrays
});
```

## Complete Example

```typescript
import {
  parseAuto,
  createEnvSubstitution,
  merge,
  validate,
  Secret,
  PII,
} from '@servicejs/config';
import { z } from 'zod';
import { isOk, isErr } from '@servicejs/result';

// 1. Parse config file with auto-detection
const fileResult = parseAuto(configFileContent, 'config.yaml');
if (isErr(fileResult)) {
  throw new Error(`Failed to parse config: ${fileResult.error.message}`);
}

let config = fileResult.value.value;

// 2. Substitute environment variables
const substitute = createEnvSubstitution({
  prefix: 'APP_',
  defaults: {
    PORT: '3000',
    HOST: 'localhost',
  },
});

const envResult = substitute(config);
if (isErr(envResult)) {
  throw new Error(`Missing env var: ${envResult.error.variable}`);
}

config = envResult.value;

// 3. Merge with environment-specific config
const envConfig = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;
config = merge([config, envConfig]);

// 4. Validate against schema
const schema = z.object({
  port: z.number().int().positive(),
  host: z.string(),
  database: z.object({
    url: z.string().url(),
    password: z.string().transform(Secret.create),
  }),
  users: z.array(
    z.object({
      email: z.string().email().transform(email => PII.create(email, 'partial')),
    })
  ),
});

const validResult = validate(config, schema);
if (isErr(validResult)) {
  throw new Error(`Invalid config: ${validResult.error.message}`);
}

const finalConfig = validResult.value;

// Now you have a fully validated, type-safe configuration
// with secrets and PII properly protected!
console.log(finalConfig);
// Secrets and PII are redacted in logs automatically
```

## API Reference

### Secret Type

- `Secret.create<T>(value: T): Secret<T>` - Create a secret wrapper
- `secret.expose(): T | undefined` - Expose the wrapped value
- `secret.destroy(): void` - Destroy the secret (clears value)
- `secret.isDestroyed(): boolean` - Check if destroyed
- `secret.map<U>(fn: (value: T) => U): Secret<U>` - Transform the secret

### PII Type

- `PII.create<T>(value: T, strategy?: RedactionStrategy): PII<T>` - Create a PII wrapper
- `pii.expose(): T` - Expose the wrapped value
- `pii.map<U>(fn: (value: T) => U): PII<U>` - Transform the PII

Redaction strategies: `'full'` (default), `'partial'`, `'hash'`

### Parsers

- `parseJSON(content: string)` - Parse JSON
- `parseJSONC(content: string)` - Parse JSON with comments
- `parseJSON5(content: string)` - Parse JSON5 (extended JSON)
- `parseYAML(content: string)` - Parse YAML
- `parseTOML(content: string)` - Parse TOML
- `parseINI(content: string)` - Parse INI
- `parseTypeScript(content: string)` - Parse TypeScript/JavaScript config files
- `parseAuto(content: string, path?: string)` - Auto-detect and parse

### Environment Variables

- `substituteEnv(config, getEnv, options?)` - Substitute env vars in config
- `createEnvSubstitution(options?)` - Create substitution function using process.env/Bun.env
- `readEnvConfig(keys, options?)` - Read configuration from environment variables

### Merging

- `merge(configs, options?)` - Merge multiple configs
- `extend(base, overrides, options?)` - Extend base config (non-mutating)
- `deepClone<T>(config: T): T` - Deep clone a configuration
- `mergeWithEnvironment(base, env?, local?, options?)` - Common merge pattern

### Validation

- `validate<T>(config, schema): Result<T, ValidationError>` - Validate with Zod schema
- `createValidator<T>(schema)` - Create reusable validator function
- `validateAndTransform<T, U>(config, schema, transform?)` - Validate and transform
- `coerceFromEnv<T>(schema)` - Coerce string env vars to target type
- `schemas` - Built-in schema helpers (port, host, url, email, logLevel, etc.)

## License

MIT
