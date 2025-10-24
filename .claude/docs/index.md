# ServiceJS Documentation Index

This directory contains technical documentation for working on ServiceJS.

## Core Concepts

### [HKT Pattern Guide](./hkt.md)
Complete guide to the Higher-Kinded Types pattern used throughout ServiceJS. Read this first to understand the foundation of ServiceJS's type-level programming.

**Key Topics:**
- Explicit Args/Result pattern for type safety
- FunctionHKTF - representing all functions as HKTs
- HKTO - type-level message dispatch
- Method pattern for HKTO methods
- Naming conventions and best practices
- Complete examples and troubleshooting

## Quick Reference

### When to Read What

**Starting a new feature:**
1. Read [HKT Pattern Guide](./hkt.md) to understand the type system
2. Review existing package implementations in `packages/`
3. Follow the naming conventions and patterns

**Implementing HKT types:**
1. Use the explicit Args/Result pattern (see [HKT Guide](./hkt.md#pattern-structure))
2. Use `FunctionHKTF.*` for all function types
3. Follow the checklists in the HKT guide

**Debugging type errors:**
1. Check [HKT Troubleshooting](./hkt.md#troubleshooting)
2. Verify Args/Result separation
3. Ensure all functions use FunctionHKTF

## Package Documentation

Each package has its own README with API reference:

- `packages/hkt/README.md` - HKT foundation
- `packages/result/README.md` - Result<T, E> type
- `packages/option/README.md` - Option<T> type
- `packages/either/README.md` - Either<L, R> type
- `packages/pure/README.md` - Pure function utilities

## Project Documentation

- `DESIGN_DOC.md` - Overall architecture and design decisions
- `IMPLEMENTATION_PLAN.md` - Detailed implementation roadmap
- `CLAUDE.md` - AI collaboration guidelines
