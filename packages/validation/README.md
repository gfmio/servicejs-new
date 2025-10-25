# @servicejs/validation

Validation type for ServiceJS - accumulating validation errors.

## Features

- **Error Accumulation**: Collect all validation errors, not just the first
- **Applicative**: Combine multiple validations
- **HKTO Support**: Higher-Kinded Type Object implementation
- **Type-Safe**: Full TypeScript support
- **Use Case**: Form validation, data validation

## Installation

```bash
bun add @servicejs/validation
```

## Usage

```typescript
import { Validation, Success, Failure } from '@servicejs/validation';

// Create validations
const valid = Success(42);
const invalid = Failure(['Error 1', 'Error 2']);

// Combine validations (accumulates errors)
const combined = valid.ap(invalid);
// Failure(['Error 1', 'Error 2'])

// Use for form validation
function validateForm(data: FormData): Validation<string[], User> {
  const nameValidation = validateName(data.name);
  const emailValidation = validateEmail(data.email);
  const ageValidation = validateAge(data.age);

  // Combines all validation results
  // Returns Success(user) if all valid
  // Returns Failure([...all errors]) if any invalid
  return liftA3(createUser, nameValidation, emailValidation, ageValidation);
}
```

## License

MIT
