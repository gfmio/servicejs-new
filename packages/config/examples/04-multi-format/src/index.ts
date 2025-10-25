/**
 * Multi-Format Configuration Parsing Example
 *
 * This example demonstrates:
 * - Parsing different configuration file formats
 * - Auto-detection of format from content and file extension
 * - Handling parse errors gracefully
 * - Converting between formats
 */

import {
  detectFormatFromContent,
  detectFormatFromPath,
  parseAuto,
  parseINI,
  parseJSON,
  parseJSON5,
  parseJSONC,
  parseTOML,
  parseYAML,
} from '@servicejs/config';
import { isErr, isOk } from '@servicejs/result';

console.log('=== Multi-Format Configuration Parsing ===\n');

// Example configuration (same data in different formats)
const configData = {
  name: 'My Application',
  version: '1.0.0',
  server: {
    port: 3000,
    host: 'localhost',
  },
  features: ['auth', 'logging', 'metrics'],
};

// Example 1: JSON
console.log('1. JSON Format:');
const jsonConfig = `{
  "name": "My Application",
  "version": "1.0.0",
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "features": ["auth", "logging", "metrics"]
}`;

const jsonResult = parseJSON(jsonConfig);
if (isOk(jsonResult)) {
  console.log('   ✓ Parsed successfully');
  console.log('   Data:', jsonResult.value);
} else {
  console.error('   ✗ Parse error:', jsonResult.error.message);
}

// Example 2: JSONC (JSON with Comments)
console.log('\n2. JSONC Format (JSON with Comments):');
const jsoncConfig = `{
  // Application metadata
  "name": "My Application",
  "version": "1.0.0",

  /* Server configuration */
  "server": {
    "port": 3000,  // Development port
    "host": "localhost"
  },

  // Enabled features
  "features": ["auth", "logging", "metrics"]
}`;

const jsoncResult = parseJSONC(jsoncConfig);
if (isOk(jsoncResult)) {
  console.log('   ✓ Parsed successfully (comments removed)');
  console.log('   Data:', jsoncResult.value);
} else {
  console.error('   ✗ Parse error:', jsoncResult.error.message);
}

// Example 3: JSON5 (Extended JSON)
console.log('\n3. JSON5 Format (Extended JSON):');
const json5Config = `{
  // Unquoted keys and single quotes are allowed
  name: 'My Application',
  version: '1.0.0',
  server: {
    port: 3000,
    host: 'localhost',  // Trailing comma is OK
  },
  features: ['auth', 'logging', 'metrics'],
}`;

const json5Result = parseJSON5(json5Config);
if (isOk(json5Result)) {
  console.log('   ✓ Parsed successfully');
  console.log('   Data:', json5Result.value);
} else {
  console.error('   ✗ Parse error:', json5Result.error.message);
}

// Example 4: YAML
console.log('\n4. YAML Format:');
const yamlConfig = `
name: My Application
version: 1.0.0
server:
  port: 3000
  host: localhost
features:
  - auth
  - logging
  - metrics
`;

const yamlResult = parseYAML(yamlConfig);
if (isOk(yamlResult)) {
  console.log('   ✓ Parsed successfully');
  console.log('   Data:', yamlResult.value);
} else {
  console.error('   ✗ Parse error:', yamlResult.error.message);
}

// Example 5: TOML
console.log('\n5. TOML Format:');
const tomlConfig = `
name = "My Application"
version = "1.0.0"
features = ["auth", "logging", "metrics"]

[server]
port = 3000
host = "localhost"
`;

const tomlResult = parseTOML(tomlConfig);
if (isOk(tomlResult)) {
  console.log('   ✓ Parsed successfully');
  console.log('   Data:', tomlResult.value);
} else {
  console.error('   ✗ Parse error:', tomlResult.error.message);
}

// Example 6: INI
console.log('\n6. INI Format:');
const iniConfig = `
name=My Application
version=1.0.0

[server]
port=3000
host=localhost
`;

const iniResult = parseINI(iniConfig);
if (isOk(iniResult)) {
  console.log('   ✓ Parsed successfully');
  console.log('   Data:', iniResult.value);
  console.log('   Note: INI doesn\'t support arrays, so features are missing');
} else {
  console.error('   ✗ Parse error:', iniResult.error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Example 7: Auto-detection from file extension
console.log('7. Auto-Detection from File Extension:');
const files = [
  { path: 'config.json', content: jsonConfig },
  { path: 'config.yaml', content: yamlConfig },
  { path: 'config.toml', content: tomlConfig },
  { path: 'config.ini', content: iniConfig },
];

files.forEach(({ path, content }) => {
  const format = detectFormatFromPath(path);
  console.log(`   ${path} -> detected as: ${format}`);

  const result = parseAuto(content, path);
  if (isOk(result)) {
    console.log(`     ✓ Parsed successfully using ${result.value.format} parser`);
  } else {
    console.error(`     ✗ Failed to parse`);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

// Example 8: Auto-detection from content
console.log('8. Auto-Detection from Content (no filename):');
const contentSamples = [
  { name: 'JSON object', content: '{"key": "value"}' },
  { name: 'JSON array', content: '[1, 2, 3]' },
  { name: 'YAML', content: 'key: value\nlist:\n  - item1\n  - item2' },
  { name: 'TOML', content: '[section]\nkey = "value"' },
];

contentSamples.forEach(({ name, content }) => {
  const format = detectFormatFromContent(content);
  console.log(`   ${name}:`);
  console.log(`     Detected format: ${format || 'unknown'}`);

  const result = parseAuto(content);
  if (isOk(result)) {
    console.log(`     ✓ Parsed as: ${result.value.format}`);
    console.log(`     Data:`, result.value.value);
  } else {
    console.error(`     ✗ Failed to parse`);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

// Example 9: Handling parse errors
console.log('9. Handling Parse Errors:');
const invalidConfigs = [
  { format: 'JSON', content: '{invalid json}' },
  { format: 'YAML', content: 'invalid:\n  - yaml\n    - structure' },
  { format: 'TOML', content: '[invalid\ntoml' },
];

invalidConfigs.forEach(({ format, content }) => {
  console.log(`   ${format}:`);
  const result = parseAuto(content);
  if (isErr(result)) {
    console.log(`     ✗ Error: ${result.error.message}`);
  } else {
    console.log(`     ✓ Unexpectedly parsed`);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

// Example 10: Complex nested structures
console.log('10. Complex Nested Structures:');
const complexYAML = `
application:
  name: Complex App
  version: 2.0.0

environments:
  development:
    server:
      port: 3000
      host: localhost
    database:
      url: postgresql://localhost:5432/dev_db
      pool:
        min: 2
        max: 10
    features:
      debug: true
      analytics: false

  production:
    server:
      port: 8080
      host: 0.0.0.0
    database:
      url: postgresql://prod-db:5432/prod_db
      pool:
        min: 10
        max: 100
    features:
      debug: false
      analytics: true
`;

const complexResult = parseYAML(complexYAML);
if (isOk(complexResult)) {
  console.log('   ✓ Complex YAML parsed successfully');
  console.log('   Structure:');
  console.log(JSON.stringify(complexResult.value, null, 2));
} else {
  console.error('   ✗ Parse error:', complexResult.error.message);
}

console.log('\n' + '='.repeat(60) + '\n');
console.log('=== Format Comparison ===\n');

console.log('Best format for:');
console.log('  • Simple configs: JSON or YAML');
console.log('  • Configs with comments: JSONC, JSON5, or YAML');
console.log('  • Complex nested data: YAML or JSON');
console.log('  • Human-editable configs: YAML or TOML');
console.log('  • Legacy systems: INI');
console.log('  • TypeScript projects: TS/JS config files');
console.log('');
console.log('Feature support:');
console.log('  ✓ Arrays: JSON, JSONC, JSON5, YAML, TOML');
console.log('  ✓ Comments: JSONC, JSON5, YAML, TOML, INI');
console.log('  ✓ Multi-line strings: YAML, TOML');
console.log('  ✓ Type safety: TypeScript config files');
console.log('  ✓ Nested objects: All except INI (limited)');
