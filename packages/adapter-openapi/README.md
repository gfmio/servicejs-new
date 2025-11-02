# @servicejs/adapter-openapi

OpenAPI client adapter for ServiceJS - provides schema-based REST API client generation from OpenAPI specifications.

## Features

- **Schema-Based**: Generate clients from OpenAPI/Swagger specifications
- **Type-Safe Requests**: Full TypeScript support for requests and responses
- **Path Parameters**: Automatic path parameter replacement
- **Query Parameters**: Easy query string building
- **All HTTP Methods**: GET, POST, PUT, PATCH, DELETE support
- **Error Handling**: Comprehensive error handling with Result types
- **Spec Loading**: Load specs from URL or provide directly

## Installation

```bash
npm install @servicejs/adapter-openapi
```

## Usage

### Basic Usage

```typescript
import { createOpenAPIAdapter } from '@servicejs/adapter-openapi';
import { isOk } from '@servicejs/result';

const adapter = createOpenAPIAdapter();

await adapter.init({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer token',
  },
});

// GET request
const result = await adapter.get('/users/{id}', {
  path: { id: '123' },
});

if (isOk(result)) {
  console.log(result.value);
}
```

### With OpenAPI Specification

```typescript
const adapter = createOpenAPIAdapter();

await adapter.init({
  baseURL: 'https://api.example.com',
  specURL: 'https://api.example.com/openapi.json',
});

const spec = adapter.getSpec();
console.log('API:', spec?.info.title);
```

### CRUD Operations

```typescript
// Create
const createResult = await adapter.post('/users', {
  body: { name: 'John Doe', email: 'john@example.com' },
});

// Read
const readResult = await adapter.get('/users/{id}', {
  path: { id: '123' },
});

// Update
const updateResult = await adapter.put('/users/{id}', {
  path: { id: '123' },
  body: { name: 'Jane Doe' },
});

// Partial Update
const patchResult = await adapter.patch('/users/{id}', {
  path: { id: '123' },
  body: { name: 'Jane Smith' },
});

// Delete
const deleteResult = await adapter.delete('/users/{id}', {
  path: { id: '123' },
});
```

### Query Parameters

```typescript
const result = await adapter.get('/users', {
  query: {
    limit: 10,
    offset: 0,
    sort: 'name',
    active: true,
  },
});
```

## API Reference

### `createOpenAPIAdapter()`

Creates a new OpenAPI adapter instance.

### Methods

#### `init(config: OpenAPIConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

**Config options:**
- `baseURL`: Base URL for API requests
- `spec?`: OpenAPI specification object
- `specURL?`: URL to load OpenAPI specification from
- `headers?`: Optional headers for requests
- `fetchOptions?`: Additional fetch options

#### `get<T>(path: string, options?: RequestOptions): Promise<Result<T, Error>>`

Execute a GET request.

#### `post<T>(path: string, options?: RequestOptions): Promise<Result<T, Error>>`

Execute a POST request.

#### `put<T>(path: string, options?: RequestOptions): Promise<Result<T, Error>>`

Execute a PUT request.

#### `patch<T>(path: string, options?: RequestOptions): Promise<Result<T, Error>>`

Execute a PATCH request.

#### `delete<T>(path: string, options?: RequestOptions): Promise<Result<T, Error>>`

Execute a DELETE request.

#### `request<T>(method: string, path: string, options?: RequestOptions): Promise<Result<T, Error>>`

Execute a request with custom HTTP method.

#### `getSpec(): OpenAPISpec | null`

Get the loaded OpenAPI specification.

### Request Options

```typescript
interface RequestOptions {
  path?: Record<string, string | number>;
  query?: Record<string, string | number | boolean>;
  body?: any;
  headers?: Record<string, string>;
}
```

## Examples

See the `examples/` directory for more examples:
- `basic.ts` - Basic GET requests with path and query parameters
- `crud-operations.ts` - Full CRUD operations (Create, Read, Update, Delete)
- `with-spec.ts` - Loading and using OpenAPI specifications

## Notes

- This is a simplified implementation suitable for basic OpenAPI operations
- Path parameters are replaced using `{paramName}` syntax
- Query parameters are automatically URL-encoded
- All operations return `Result<T, Error>` for type-safe error handling
- For advanced OpenAPI features, consider using dedicated tools like openapi-generator

## License

MIT
