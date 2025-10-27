# Static Code Generation Proposal

## Current State

Both FlatBuffers and Cap'n Proto currently use **runtime interpretation** in our benchmarks:

### FlatBuffers
- Using `createDynamicFlatBuffersSchema()` - limited to flat structures
- Every field access goes through generic `builder.addFieldFloat64()`, `buffer.readFloat64()`, etc.
- Runtime vtable lookups for field offsets

### Cap'n Proto
- Using `createCapnpSchema()` with runtime `readStruct()`/`writeStruct()`
- Every field access: runtime field lookup → type check → offset calculation → read/write
- No compile-time optimizations possible

## Proposed: Static Code Generation

### Benefits

#### 1. Performance Improvements
**Expected speedup: 3-10x for both formats**

Current (runtime):
```typescript
// Every access does runtime lookups
const id = readPrimitive(segment, structOffset + getFieldOffset(field), field.type);
```

Generated (static):
```typescript
// Direct access, fully inlined
const id = segment.data.getUint32(structOffset + 0, true);
```

#### 2. Better JavaScript Engine Optimization
- Monomorphic call sites (not polymorphic)
- Inline caching works better
- Dead code elimination
- Better JIT compilation

#### 3. TypeScript Type Safety
Generated code provides full TypeScript types:
```typescript
interface ComplexMessage {
  id: number;
  user: User;  // Typed!
  tags: string[];
}
```

#### 4. Smaller Bundle Size
- No runtime interpreter needed
- Tree-shaking can remove unused schemas
- Generated code is minimal

---

## Implementation Options

### Option 1: FlatBuffers - Use Official `flatc` Compiler

**Status**: Already supported! Just not used in benchmark.

**How**:
1. Write `.fbs` schema files
2. Run `flatc --ts schema.fbs`
3. Use generated code with `createFlatBuffersSerializer()`

**Example**:
```fbs
// schema.fbs
table User {
  id: uint32;
  name: string;
  email: string;
}

table ComplexMessage {
  id: uint32;
  timestamp: uint64;
  user: User;           // ✅ Nested structures work!
  tags: [string];       // ✅ Arrays work!
  matrix: [[double]];   // ✅ Nested arrays work!
}
```

```bash
flatc --ts schema.fbs
# Generates: schema_generated.ts
```

```typescript
import { ComplexMessage } from './schema_generated.js';

const schema: FlatBuffersSchema<ComplexMessageData> = {
  encode(builder, value) {
    // Use generated ComplexMessage.startComplexMessage(), etc.
    // Full support for nested structures!
  },
  decode(buffer) {
    const msg = ComplexMessage.getRootAsComplexMessage(buffer);
    return {
      id: msg.id(),
      user: {
        id: msg.user()!.id(),
        name: msg.user()!.name()!,
      }
    };
  }
};
```

**Pros**:
- Official, mature tooling
- Full FlatBuffers feature support
- Excellent performance
- Cross-language schemas

**Cons**:
- Requires `flatc` in build pipeline
- Generated code is verbose
- Schema changes require recompilation

---

### Option 2: Cap'n Proto - Create TypeScript Code Generator

**Status**: Not implemented - would need to create.

**How**:
Build a tool that generates TypeScript accessor code from Cap'n Proto schemas.

**Input** (schema definition):
```typescript
// schema.capnp.ts
export const ComplexMessageSchema = {
  name: 'ComplexMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'timestamp', type: 'uint64', slot: 8 },
    { name: 'user', type: { kind: 'struct', schema: UserSchema }, slot: 0 },
    { name: 'tags', type: { kind: 'list', elementType: 'text' }, slot: 1 },
  ]
} as const;
```

**Generated Output**:
```typescript
// schema_generated.ts
export class ComplexMessage {
  constructor(
    private segment: CapnpSegment,
    private offset: number
  ) {}

  get id(): number {
    return this.segment.data.getUint32(this.offset + 0, true);
  }

  set id(value: number): void {
    this.segment.data.setUint32(this.offset + 0, value, true);
  }

  get timestamp(): number {
    return this.segment.data.getFloat64(this.offset + 8, true); // uint64 as float64
  }

  get user(): User {
    const pointerOffset = this.offset + (this.schema.dataWordCount * 8) + 0;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    const targetOffset = pointerOffset + 8 + ((pointer >> 2) * 8);
    return new User(this.segment, targetOffset);
  }

  get tags(): string[] {
    // Inline list reading logic
    const pointerOffset = this.offset + (this.schema.dataWordCount * 8) + 8;
    // ... optimized list reading
  }

  static serialize(segment: CapnpSegment, value: ComplexMessageData): number {
    const structOffset = allocate(segment, 96); // Pre-calculated size

    // Direct writes, no runtime lookups
    segment.data.setUint32(structOffset + 0, value.id, true);
    segment.data.setFloat64(structOffset + 8, value.timestamp, true);

    // ... handle nested structures

    return structOffset;
  }

  static deserialize(segment: CapnpSegment, offset: number): ComplexMessageData {
    return new ComplexMessage(segment, offset);
  }
}
```

**Pros**:
- Direct memory access (minimal overhead)
- TypeScript types included
- Works with existing Cap'n Proto schemas
- Can optimize for JavaScript specifically

**Cons**:
- Need to build the generator
- Maintenance burden
- No official Cap'n Proto tooling for TypeScript

---

### Option 3: Cap'n Proto - Use `capnpc` with Plugin

**Status**: Could leverage official tooling.

**How**:
Write a `capnpc-ts` plugin for the official Cap'n Proto compiler.

```bash
# Install Cap'n Proto compiler
brew install capnp  # or build from source

# Write schema in .capnp format
# schema.capnp
@0x123456789abcdef0;

struct ComplexMessage {
  id @0 :UInt32;
  timestamp @1 :UInt64;
  user @2 :User;
  tags @3 :List(Text);
}

# Generate TypeScript with plugin
capnpc -o ts schema.capnp
```

**Pros**:
- Uses official Cap'n Proto schema format
- Mature schema evolution support
- Cross-language compatibility
- Official compiler handles validation

**Cons**:
- Requires Cap'n Proto installation
- Need to write/maintain TypeScript plugin
- More complex build pipeline

---

## Performance Comparison: Runtime vs Static

### Expected Results with Static Generation

**Simple Messages:**
```
Current (Dynamic):
- FlatBuffers: 18.98ms, 3.43x slower than JSON
- Cap'n Proto: 20.50ms, 3.70x slower than JSON

Expected (Static):
- FlatBuffers: ~6-8ms, 1.1-1.4x slower than JSON  ✨
- Cap'n Proto: ~7-10ms, 1.3-1.8x slower than JSON  ✨
```

**Complex Messages:**
```
Current (Dynamic):
- Cap'n Proto: 53.04ms, 3.51x slower than JSON

Expected (Static):
- Cap'n Proto: ~15-20ms, 1.0-1.3x slower than JSON  ✨
```

**Large Messages:**
```
Current (Dynamic):
- Cap'n Proto: 148.42ms, 1.62x slower than JSON

Expected (Static):
- Cap'n Proto: ~50-70ms, 0.55-0.75x slower (FASTER than JSON!)  ✨✨✨
```

### Why Static Generation Helps More for Large Messages

1. **Repeated Operations**: Large messages have many repeated read/write operations
2. **Amortized Overhead**: Static generation eliminates per-field overhead
3. **Better Caching**: Monomorphic code allows better CPU cache usage
4. **Vectorization**: Engines can potentially vectorize tight loops

---

## Recommendation

### Short Term (Now)
1. **Re-run FlatBuffers benchmark with `flatc`-compiled schemas**
   - Shows true FlatBuffers performance
   - Tests nested structure support
   - Minimal work (just use existing tooling)

### Medium Term (1-2 weeks)
2. **Build Cap'n Proto TypeScript generator**
   - Option 2 (standalone tool) is simplest
   - Can reuse existing schema definitions
   - Full control over generated code

### Long Term (1-2 months)
3. **Create `capnpc-ts` plugin**
   - Option 3 (official compiler plugin)
   - Better for ecosystem
   - Cross-language schema support

---

## Implementation Plan

### Phase 1: FlatBuffers Static (1-2 days)

1. Create `.fbs` schema files for benchmark messages
2. Add `flatc` to build tooling
3. Generate TypeScript code
4. Update benchmark to use compiled schemas
5. Document performance improvements

**Expected outcome**: FlatBuffers 3-5x faster, nested structures work.

### Phase 2: Cap'n Proto Generator (1-2 weeks)

1. Design generator API
2. Implement code generator for:
   - Struct accessor classes
   - Serialize/deserialize methods
   - List handling
   - Nested structure support
3. Add to build tooling
4. Update benchmark
5. Document results

**Expected outcome**: Cap'n Proto 3-5x faster, competitive with JSON.

### Phase 3: Optimization (1 week)

1. Profile generated code
2. Optimize hot paths
3. Add inline hints for JIT
4. Benchmark edge cases
5. Document best practices

**Expected outcome**: Cap'n Proto potentially faster than JSON for large messages.

---

## Questions to Consider

1. **Build Complexity**: Is code generation worth the build pipeline complexity?
   - For development: Maybe not (use dynamic)
   - For production: Absolutely yes

2. **Bundle Size**: Generated code vs runtime interpreter?
   - Generated: ~1-2KB per schema
   - Runtime: ~10-20KB interpreter (shared)
   - Break-even: ~10 schemas

3. **DX Trade-offs**: Schema compilation step?
   - Pro: Better TypeScript types, faster runtime
   - Con: Extra build step, need to regenerate on schema changes

4. **Maintenance**: Who maintains the generators?
   - FlatBuffers: Google (official)
   - Cap'n Proto TS: Us (would be custom)

---

## Conclusion

**Static code generation would dramatically improve performance** for both FlatBuffers and Cap'n Proto:

- **FlatBuffers**: 3-5x faster + nested structure support
- **Cap'n Proto**: 3-5x faster, potentially faster than JSON for large messages

**Recommendation**:
1. Start with FlatBuffers + `flatc` (easy, immediate benefit)
2. Then build Cap'n Proto generator if results justify it
3. Long-term: contribute `capnpc-ts` to Cap'n Proto project

The current benchmark results are showing **runtime interpretation overhead**, not the true performance of these formats!
