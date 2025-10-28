# Contributing to ServiceJS

Thank you for your interest in contributing to ServiceJS! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Other conduct that would be considered inappropriate

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a branch** for your changes
4. **Make your changes** following our guidelines
5. **Test your changes** thoroughly
6. **Submit a pull request**

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.0 or later
- Node.js v16+ (optional, for compatibility testing)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/servicejs.git
cd servicejs

# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test
```

### Project Structure

```
servicejs/
├── packages/           # Monorepo packages
│   ├── core/          # Core types
│   ├── result/        # Result type
│   ├── mailbox/       # Mailbox implementations
│   ├── cas/           # Content-addressed storage
│   ├── security/      # Security features
│   └── .../           # Other packages
├── benchmarks/        # Performance benchmarks
├── docs/              # Documentation
└── examples/          # Example applications
```

## Contributing Guidelines

### What to Contribute

We welcome contributions in many forms:

- **Bug fixes** - Fix issues and improve stability
- **New features** - Add functionality that aligns with our design principles
- **Documentation** - Improve or add documentation
- **Examples** - Add example applications
- **Tests** - Improve test coverage
- **Performance** - Optimize critical paths

### Before Starting

1. **Check existing issues** - See if someone is already working on it
2. **Open an issue** - Discuss your idea before implementing large changes
3. **Get feedback** - Make sure your approach aligns with the project goals

### Design Principles

All contributions must adhere to ServiceJS core principles:

1. **Pure Message Passing** - Components communicate only via messages
2. **Capability-Based Security** - Access through explicit capabilities only
3. **No Ambient Authority** - No global state or implicit dependencies
4. **Type Safety** - Full TypeScript support, no `any` types
5. **Functional Core** - Pure functions, immutable data
6. **Testability** - Easy to test without mocks

## Pull Request Process

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/issue-123
```

Branch naming:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `perf/` - Performance improvements
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Follow our [coding standards](#coding-standards)
- Write tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
bun test

# Run tests for specific package
cd packages/mailbox
bun test

# Run with coverage
bun test --coverage

# Build to check for errors
bun run build
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git commit -m "feat(mailbox): add priority mailbox implementation

- Implement PriorityMailbox with min-heap
- Add tests for priority ordering
- Update documentation with examples

Closes #123"
```

Commit message format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Adding or updating tests
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `chore` - Build process or tooling changes

### 5. Push and Create Pull Request

```bash
git push origin feature/my-feature
```

Then create a pull request on GitHub with:

- **Clear title** - Describe what the PR does
- **Description** - Explain why and how
- **Testing** - Describe how you tested the changes
- **Breaking changes** - Note any breaking changes
- **Related issues** - Reference related issues

### 6. Code Review

- Respond to feedback promptly
- Make requested changes
- Keep the discussion constructive
- Be patient - reviews take time

### 7. Merge

Once approved:
- Squash commits if requested
- Ensure CI passes
- Wait for maintainer to merge

## Coding Standards

### TypeScript Style

```typescript
// ✅ Good
export const createMailbox = <T extends Message>(
  config?: MailboxConfig
): Mailbox<T> => {
  // Implementation
};

// ❌ Bad
export function createMailbox(config) {
  // Implementation
}
```

### Guidelines

1. **Use TypeScript strict mode** - No `any` types
2. **Functional style** - Prefer pure functions
3. **Explicit types** - Don't rely on inference for public APIs
4. **Immutability** - Use readonly, const
5. **No side effects** - Pure functions where possible
6. **Result types** - Use Result<T, E> instead of throwing
7. **Descriptive names** - Clear, meaningful names

### Code Formatting

We use Prettier for formatting. Run before committing:

```bash
bun run format
```

Configuration in `.prettierrc`:
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

### Linting

We use ESLint. Fix issues before committing:

```bash
bun run lint
bun run lint:fix
```

## Testing Guidelines

### Test Requirements

- **All new features** must have tests
- **All bug fixes** must have tests that fail without the fix
- **Aim for >90% coverage** on new code
- **Test public APIs** thoroughly
- **Test edge cases** and error conditions

### Test Structure

```typescript
import { describe, test, expect } from 'bun:test';

describe('Feature Name', () => {
  test('should do something specific', () => {
    // Arrange
    const mailbox = createSyncMailbox<Message>();

    // Act
    mailbox.send({ type: 'test' });

    // Assert
    expect(mailbox.size).toBe(1);
  });

  test('should handle error case', () => {
    const result = divide(10, 0);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.message).toBe('Division by zero');
    }
  });
});
```

### Test Guidelines

1. **Descriptive names** - Test names should describe what is tested
2. **Arrange-Act-Assert** - Follow AAA pattern
3. **One assertion focus** - Test one thing at a time
4. **Fast tests** - Tests should run quickly
5. **No flaky tests** - Tests must be deterministic
6. **Use Result helpers** - `isOk()`, `isErr()` for checking

### Running Tests

```bash
# All tests
bun test

# Specific file
bun test packages/mailbox/tests/sync.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

## Documentation

### Documentation Requirements

- **All public APIs** must have JSDoc comments
- **All packages** must have README.md
- **Examples** for all major features
- **Architecture docs** for design decisions

### JSDoc Style

```typescript
/**
 * Creates a synchronous mailbox that processes messages immediately.
 *
 * Messages are processed synchronously in the order they are received.
 * The handler function is called immediately when a message is sent.
 *
 * @example
 * ```typescript
 * const mailbox = createSyncMailbox<Message>();
 *
 * mailbox.onMessage((msg) => {
 *   console.log('Received:', msg);
 * });
 *
 * mailbox.send({ type: 'hello' });
 * ```
 *
 * @template T - Message type
 * @param config - Optional mailbox configuration
 * @returns A sync mailbox instance
 */
export const createSyncMailbox = <T extends Message>(
  config?: MailboxConfig
): SyncMailbox<T> => {
  // ...
};
```

### README Template

Each package should have a README with:

1. **Title and description**
2. **Installation**
3. **Quick start example**
4. **API reference**
5. **Usage examples**
6. **Error handling**
7. **Performance notes** (if relevant)

## Release Process

Releases are managed by maintainers:

1. **Version bump** - Update version in package.json
2. **Changelog** - Update CHANGELOG.md
3. **Tag release** - Create Git tag
4. **Publish** - Publish to npm
5. **GitHub release** - Create release on GitHub

## Getting Help

- **Documentation** - Check docs/ directory
- **Issues** - Search existing issues
- **Discussions** - Use GitHub Discussions for questions
- **Discord** - Join our community Discord

## License

By contributing to ServiceJS, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in package.json contributors
- Mentioned in release notes
- Credited in CONTRIBUTORS.md

## Thank You!

Thank you for contributing to ServiceJS! Your help makes this project better for everyone.

---

**Questions?** Open an issue or discussion on GitHub.
