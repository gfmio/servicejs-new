/**
 * URN (Uniform Resource Name) Example
 *
 * Demonstrates how to use URNs for component identification.
 */

import { createURN, safeCreateURN, parseURN, equalURN } from '../src/urn';

console.log('=== URN Examples ===\n');

// Example 1: Creating URNs
console.log('1. Creating URNs');
const counterURN = createURN('app', 'counter-123');
const loggerURN = createURN('system', 'logger-main');

console.log('Counter URN:', counterURN.toString());
console.log('Logger URN:', loggerURN.toString());
console.log('');

// Example 2: Safe creation with validation
console.log('2. Safe creation with validation');
const validResult = safeCreateURN('app', 'valid-component_v1.0');
if (validResult.ok) {
  console.log('Valid URN created:', validResult.value.toString());
} else {
  console.error('Failed to create URN:', validResult.error);
}

const invalidResult = safeCreateURN('app:bad', 'component');
if (!invalidResult.ok) {
  console.log('Invalid URN rejected:', invalidResult.error.type);
}
console.log('');

// Example 3: Parsing URN strings
console.log('3. Parsing URN strings');
const parseResult = parseURN('urn:database:users-table');
if (parseResult.ok) {
  console.log('Parsed URN:');
  console.log('  Namespace:', parseResult.value.namespace);
  console.log('  ID:', parseResult.value.id);
  console.log('  Full:', parseResult.value.toString());
}
console.log('');

// Example 4: Comparing URNs
console.log('4. Comparing URNs');
const urn1 = createURN('app', 'counter-1');
const urn2 = createURN('app', 'counter-1');
const urn3 = createURN('app', 'counter-2');

console.log('urn1 equals urn2?', equalURN(urn1, urn2)); // true
console.log('urn1 equals urn3?', equalURN(urn1, urn3)); // false
console.log('');

// Example 5: Using URNs for logging/debugging
console.log('5. Using URNs for logging/debugging');
function logComponentEvent(urn: ReturnType<typeof createURN>, event: string) {
  console.log(`[${urn.toString()}] ${event}`);
}

const componentURN = createURN('app', 'user-service-1');
logComponentEvent(componentURN, 'Component initialized');
logComponentEvent(componentURN, 'Processing request');
logComponentEvent(componentURN, 'Request completed');
console.log('');

// Example 6: Round-trip (create -> string -> parse)
console.log('6. Round-trip conversion');
const original = createURN('service', 'api-gateway_v2.0');
const urnString = original.toString();
const parsedBack = parseURN(urnString);

if (parsedBack.ok) {
  console.log('Original:', original.toString());
  console.log('String:', urnString);
  console.log('Parsed:', parsedBack.value.toString());
  console.log('Equal?', equalURN(original, parsedBack.value));
}
console.log('');

// Example 7: Generating unique URNs
console.log('7. Generating unique URNs');
function generateComponentURN(type: string, instanceId: number): ReturnType<typeof createURN> {
  return createURN('app', `${type}-${instanceId}`);
}

for (let i = 1; i <= 3; i++) {
  const urn = generateComponentURN('worker', i);
  console.log(`Worker ${i}:`, urn.toString());
}
