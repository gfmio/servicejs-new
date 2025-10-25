# @servicejs/config Examples

This directory contains comprehensive examples demonstrating the capabilities of the `@servicejs/config` package.

## Examples Overview

### 1. Basic Usage (`01-basic-usage`)

Demonstrates the fundamental features:
- Parsing JSON and YAML configurations
- Environment variable substitution
- Configuration merging
- Schema validation with Zod
- Complete workflow example

**Run:**
```bash
cd 01-basic-usage
bun install
bun run dev
```

### 2. Advanced Usage (`02-advanced-usage`)

Real-world application configuration setup:
- Multi-environment configuration (development, staging, production)
- Layered configuration merging (base → environment → local)
- Environment variable substitution with validation
- Type-safe configuration with comprehensive Zod schemas
- Secret and PII protection integrated into config
- Production-grade error handling

**Run:**
```bash
cd 02-advanced-usage
bun install
bun run dev
```

### 3. Secret and PII Protection (`03-secrets-pii`)

Comprehensive guide to protecting sensitive data:
- Basic Secret usage for API keys, passwords, tokens
- Self-destructing secrets for one-time use
- Mapping and transforming secrets
- PII protection with different redaction strategies (full, partial, hash)
- Combining Secret and PII in application data
- Best practices for sensitive data handling

**Run:**
```bash
cd 03-secrets-pii
bun install
bun run dev
```

### 4. Multi-Format Parsing (`04-multi-format`)

Demonstrates support for multiple configuration formats:
- JSON, JSONC, JSON5, YAML, TOML, INI formats
- Auto-detection from file extension
- Auto-detection from content
- Error handling for invalid configs
- Complex nested structures
- Format comparison and recommendations

**Run:**
```bash
cd 04-multi-format
bun install
bun run dev
```

## Running All Examples

From the `examples` directory:

```bash
# Install dependencies for all examples
for dir in 0*/; do
  cd "$dir"
  bun install
  cd ..
done

# Run all examples
for dir in 0*/; do
  echo "Running $dir..."
  cd "$dir"
  bun run dev
  cd ..
  echo ""
done
```

## Quick Start

If you just want to see the package in action:

```bash
# Basic usage example
cd 01-basic-usage && bun install && bun run dev
```

## Learning Path

1. **Start with `01-basic-usage`** - Learn the core concepts
2. **Move to `03-secrets-pii`** - Understand data protection
3. **Try `04-multi-format`** - Explore format support
4. **Study `02-advanced-usage`** - See everything together in a real-world scenario

## Key Concepts Demonstrated

### Configuration Parsing
- ✅ Multiple format support
- ✅ Auto-detection
- ✅ Error handling with Result types

### Environment Variables
- ✅ Placeholder substitution (`${VAR}`)
- ✅ Default values
- ✅ Required vs optional variables
- ✅ Prefix support

### Configuration Merging
- ✅ Layered configuration (base → env → local)
- ✅ Deep merging strategies
- ✅ Array handling options
- ✅ Custom merge functions

### Validation
- ✅ Zod schema integration
- ✅ Built-in validators (port, host, url, email, etc.)
- ✅ Type coercion from environment variables
- ✅ Comprehensive error messages

### Security
- ✅ Secret protection (API keys, passwords)
- ✅ PII protection (emails, phone numbers, SSN)
- ✅ Multiple redaction strategies
- ✅ Self-destructing secrets
- ✅ Safe JSON serialization

## Common Patterns

### Loading Configuration

```typescript
import { parseAuto, createEnvSubstitution, validate } from '@servicejs/config';
import { isErr } from '@servicejs/result';

// 1. Parse config file
const parseResult = parseAuto(configContent, 'config.yaml');
if (isErr(parseResult)) {
  throw new Error(`Parse failed: ${parseResult.error.message}`);
}

// 2. Substitute environment variables
const substitute = createEnvSubstitution();
const envResult = substitute(parseResult.value.value);
if (isErr(envResult)) {
  throw new Error(`Env substitution failed: ${envResult.error.message}`);
}

// 3. Validate
const validResult = validate(envResult.value, mySchema);
if (isErr(validResult)) {
  throw new Error(`Validation failed: ${validResult.error.message}`);
}

const config = validResult.value;
```

### Protecting Secrets

```typescript
import { Secret, PII } from '@servicejs/config';

// API keys and passwords
const apiKey = Secret.create(process.env.API_KEY);
const dbPassword = Secret.create(process.env.DB_PASSWORD);

// User data
const userEmail = PII.create('user@example.com', 'partial');
const userSSN = PII.create('123-45-6789', 'full');

// Use safely
function authenticate(key: Secret<string>) {
  const actualKey = key.expose();
  // ... use for authentication
  key.destroy(); // Clean up if one-time use
}
```

## Additional Resources

- [Main README](../README.md) - Full API documentation
- [Tests](../tests/) - More usage examples in test files
- [ServiceJS Documentation](https://github.com/your-org/servicejs) - Framework documentation

## Need Help?

- Check the [main README](../README.md) for API reference
- Look at the [test files](../tests/) for more examples
- Open an issue on GitHub if you find bugs or have questions
