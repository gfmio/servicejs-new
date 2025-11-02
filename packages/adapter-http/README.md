# @servicejs/adapter-http

Modern HTTP client adapter with interceptors, retry logic, and comprehensive request/response handling.

## Features

- **Full HTTP Methods**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request Interceptors**: Transform requests before sending
- **Response Interceptors**: Process responses before returning
- **Error Interceptors**: Handle and transform errors
- **Automatic Retries**: Configurable retry logic with exponential backoff
- **Timeout Handling**: AbortController-based request cancellation
- **Type-Safe API**: Full TypeScript support with Result types
- **Query Parameters**: Automatic URL encoding and parameter handling
- **Base URL Support**: Configure base URL for all requests
- **JSON Handling**: Automatic JSON parsing and serialization

## Installation

```bash
npm install @servicejs/adapter-http
```

## Basic Usage

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();

// Initialize with base configuration
await adapter.init({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer token123'
  },
  timeout: 30000,
  retries: 3
});

// Make a GET request
const result = await adapter.get('/users/123');
if (isOk(result)) {
  console.log('User:', result.value.data);
  console.log('Status:', result.value.status);
}

// Make a POST request
const createResult = await adapter.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

if (isOk(createResult)) {
  console.log('Created user:', createResult.value.data);
}
```

## Examples

### REST API Client

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

class APIClient {
  private adapter = createHTTPAdapter();

  async init(apiKey: string) {
    await this.adapter.init({
      baseURL: 'https://api.example.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      retries: 2
    });
  }

  async getUser(id: string) {
    const result = await this.adapter.get(`/users/${id}`);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async createUser(user: { name: string; email: string }) {
    const result = await this.adapter.post('/users', user);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async updateUser(id: string, updates: Partial<{ name: string; email: string }>) {
    const result = await this.adapter.patch(`/users/${id}`, updates);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async deleteUser(id: string) {
    const result = await this.adapter.delete(`/users/${id}`);
    if (!isOk(result)) throw result.error;
    return true;
  }

  async listUsers(params?: { page?: number; limit?: number }) {
    const result = await this.adapter.get('/users', { params });
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }
}

// Usage
const client = new APIClient();
await client.init('your-api-key');

const users = await client.listUsers({ page: 1, limit: 10 });
console.log('Users:', users);

const newUser = await client.createUser({
  name: 'Alice',
  email: 'alice@example.com'
});
console.log('Created:', newUser);
```

### Request Interceptors (Authentication)

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();
await adapter.init({ baseURL: 'https://api.example.com' });

// Add authentication header to all requests
adapter.addRequestInterceptor((url, options) => {
  const token = localStorage.getItem('auth_token');
  return {
    url,
    options: {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    }
  };
});

// Add request ID for tracing
adapter.addRequestInterceptor((url, options) => {
  const requestId = crypto.randomUUID();
  return {
    url,
    options: {
      ...options,
      headers: {
        ...options.headers,
        'X-Request-ID': requestId
      }
    }
  };
});

// Now all requests will include auth token and request ID
const result = await adapter.get('/protected/resource');
```

### Response Interceptors (Data Transformation)

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';

const adapter = createHTTPAdapter();
await adapter.init({ baseURL: 'https://api.example.com' });

// Transform API response format
adapter.addResponseInterceptor((response) => {
  // API returns { success: true, payload: {...} }
  // Transform to just the payload
  if (response.data.success && response.data.payload) {
    return {
      ...response,
      data: response.data.payload
    };
  }
  return response;
});

// Log all responses
adapter.addResponseInterceptor((response) => {
  console.log(`[${response.status}] ${response.url}`);
  return response;
});

// Parse dates
adapter.addResponseInterceptor((response) => {
  const data = response.data;
  if (data.createdAt) {
    data.createdAt = new Date(data.createdAt);
  }
  if (data.updatedAt) {
    data.updatedAt = new Date(data.updatedAt);
  }
  return { ...response, data };
});

const result = await adapter.get('/users/123');
// Response is automatically transformed
```

### Error Interceptors (Retry Logic)

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';

const adapter = createHTTPAdapter();
await adapter.init({ baseURL: 'https://api.example.com' });

// Handle authentication errors
adapter.addErrorInterceptor(async (error) => {
  if (error.message.includes('HTTP 401')) {
    // Try to refresh token
    const newToken = await refreshAuthToken();
    localStorage.setItem('auth_token', newToken);

    // Return error to trigger retry with new token
    return error;
  }
  return error;
});

// Log errors
adapter.addErrorInterceptor((error) => {
  console.error('HTTP Error:', error.message);
  return error;
});

// Transform error messages
adapter.addErrorInterceptor((error) => {
  if (error.message.includes('HTTP 404')) {
    return new Error('Resource not found');
  }
  if (error.message.includes('HTTP 500')) {
    return new Error('Server error - please try again later');
  }
  return error;
});

const result = await adapter.get('/users/123');
// Errors are automatically handled by interceptors
```

### File Upload

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();
await adapter.init({ baseURL: 'https://api.example.com' });

async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('description', 'My uploaded file');

  const result = await adapter.post('/uploads', formData, {
    headers: {
      // Don't set Content-Type - browser will set it with boundary
    },
    timeout: 60000 // 60 second timeout for large files
  });

  if (isOk(result)) {
    return result.value.data;
  } else {
    throw result.error;
  }
}

// Usage
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files?.[0];
if (file) {
  const uploadedFile = await uploadFile(file);
  console.log('Uploaded:', uploadedFile);
}
```

### Query Parameters and URL Building

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();
await adapter.init({ baseURL: 'https://api.example.com' });

// Query parameters are automatically encoded
const result = await adapter.get('/search', {
  params: {
    q: 'javascript frameworks',
    page: '1',
    sort: 'relevance',
    filter: 'recent'
  }
});
// Requests: https://api.example.com/search?q=javascript%20frameworks&page=1&sort=relevance&filter=recent

if (isOk(result)) {
  console.log('Search results:', result.value.data);
}

// Can also use with POST/PUT/etc
const updateResult = await adapter.put('/users/123',
  { name: 'Updated Name' },
  {
    params: {
      notify: 'true',
      reason: 'admin update'
    }
  }
);
// Requests: https://api.example.com/users/123?notify=true&reason=admin%20update
```

### Custom Headers Per Request

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();
await adapter.init({
  baseURL: 'https://api.example.com',
  headers: {
    'X-App-Version': '1.0.0'
  }
});

// Add custom headers to specific request
const result = await adapter.get('/users', {
  headers: {
    'X-Custom-Header': 'special-value',
    'Accept-Language': 'en-US'
  }
});
// Request includes both default headers and custom headers

if (isOk(result)) {
  console.log('Headers sent:', result.value.headers);
}
```

### Timeout and Abort

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();
await adapter.init({ baseURL: 'https://api.example.com' });

// Set timeout per request
const result = await adapter.get('/slow-endpoint', {
  timeout: 5000 // 5 second timeout for this specific request
});

if (!isOk(result)) {
  if (result.error.message.includes('aborted')) {
    console.log('Request timed out');
  }
}

// Or use default timeout from init
await adapter.init({
  baseURL: 'https://api.example.com',
  timeout: 10000 // 10 second default for all requests
});
```

### Retry Configuration

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

const adapter = createHTTPAdapter();
await adapter.init({
  baseURL: 'https://api.example.com',
  retries: 3,        // Retry up to 3 times
  retryDelay: 1000   // Wait 1 second between retries (exponential backoff)
});

// This request will retry up to 3 times if it fails
const result = await adapter.get('/unreliable-endpoint');

if (isOk(result)) {
  console.log('Success after retries:', result.value.data);
} else {
  console.error('Failed after all retries:', result.error);
}

// Override retries for specific request
const criticalResult = await adapter.post('/critical-operation', data, {
  retries: 5 // Try 5 times for this critical operation
});
```

### API Client with TypeScript Generics

```typescript
import { createHTTPAdapter, type HTTPResponse } from '@servicejs/adapter-http';
import { type Result, isOk } from '@servicejs/result';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  totalCount: number;
}

class TypedAPIClient {
  private adapter = createHTTPAdapter();

  async init(baseURL: string, apiKey: string) {
    await this.adapter.init({
      baseURL,
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  }

  async get<T>(path: string): Promise<T> {
    const result = await this.adapter.get<T>(path);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async post<T>(path: string, body: any): Promise<T> {
    const result = await this.adapter.post<T>(path, body);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }
}

// Usage with types
const client = new TypedAPIClient();
await client.init('https://api.example.com', 'key123');

// TypeScript knows the return type is User
const user = await client.get<User>('/users/123');
console.log(user.name); // Type-safe!

// TypeScript knows the return type is PaginatedResponse<User>
const users = await client.get<PaginatedResponse<User>>('/users');
console.log(`Page ${users.page} of ${users.totalPages}`);
users.data.forEach(user => console.log(user.name));
```

### GraphQL Client

```typescript
import { createHTTPAdapter } from '@servicejs/adapter-http';
import { isOk } from '@servicejs/result';

class GraphQLClient {
  private adapter = createHTTPAdapter();

  async init(endpoint: string, token?: string) {
    await this.adapter.init({
      baseURL: endpoint,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const result = await this.adapter.post<{ data: T; errors?: any[] }>('', {
      query,
      variables
    });

    if (!isOk(result)) throw result.error;

    if (result.value.data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.value.data.errors)}`);
    }

    return result.value.data.data;
  }
}

// Usage
const client = new GraphQLClient();
await client.init('https://api.example.com/graphql', 'token123');

interface UserQueryResult {
  user: {
    id: string;
    name: string;
    posts: Array<{ title: string; content: string }>;
  };
}

const result = await client.query<UserQueryResult>(
  `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        posts {
          title
          content
        }
      }
    }
  `,
  { id: '123' }
);

console.log('User:', result.user.name);
console.log('Posts:', result.user.posts);
```

## API Reference

### `createHTTPAdapter()`

Creates a new HTTP adapter instance.

**Returns**: `HTTPAdapter`

### Lifecycle Methods

#### `init(config: HTTPConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

**Config**:
- `baseURL?: string` - Base URL for all requests
- `headers?: Record<string, string>` - Default headers
- `timeout?: number` - Request timeout in ms (default: 30000)
- `retries?: number` - Number of retry attempts (default: 0)
- `retryDelay?: number` - Delay between retries in ms (default: 1000)

#### `start(): Promise<Result<void, Error>>`

Start the adapter (no-op for HTTP).

#### `stop(): Promise<Result<void, Error>>`

Stop the adapter (no-op for HTTP).

#### `destroy(): Promise<Result<void, Error>>`

Destroy the adapter and clean up resources.

#### `health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>`

Check adapter health status.

### HTTP Methods

#### `request<T>(url: string, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>`

Make a generic HTTP request.

#### `get<T>(url: string, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>`

Make a GET request.

#### `post<T>(url: string, body?: any, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>`

Make a POST request.

#### `put<T>(url: string, body?: any, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>`

Make a PUT request.

#### `patch<T>(url: string, body?: any, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>`

Make a PATCH request.

#### `delete<T>(url: string, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>`

Make a DELETE request.

### Interceptor Methods

#### `addRequestInterceptor(interceptor: RequestInterceptor): void`

Add a request interceptor to transform requests before sending.

**Interceptor signature**:
```typescript
(url: string, options: RequestOptions) => { url: string; options: RequestOptions }
```

#### `addResponseInterceptor(interceptor: ResponseInterceptor): void`

Add a response interceptor to transform responses.

**Interceptor signature**:
```typescript
(response: HTTPResponse) => HTTPResponse
```

#### `addErrorInterceptor(interceptor: ErrorInterceptor): void`

Add an error interceptor to handle or transform errors.

**Interceptor signature**:
```typescript
(error: Error) => Error | HTTPResponse
```

### Types

#### `HTTPResponse<T>`

```typescript
interface HTTPResponse<T = any> {
  data: T;              // Response body
  status: number;       // HTTP status code
  statusText: string;   // HTTP status text
  headers: Headers;     // Response headers
  url: string;          // Final URL
}
```

#### `RequestOptions`

```typescript
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  params?: Record<string, string>;
}
```

## Best Practices

1. **Always check Result types**:
   ```typescript
   const result = await adapter.get('/users');
   if (isOk(result)) {
     console.log('Success:', result.value.data);
   } else {
     console.error('Error:', result.error);
   }
   ```

2. **Use base URL for consistent API calls**:
   ```typescript
   await adapter.init({
     baseURL: 'https://api.example.com/v1'
   });
   ```

3. **Add authentication via interceptors**:
   ```typescript
   adapter.addRequestInterceptor((url, options) => ({
     url,
     options: {
       ...options,
       headers: {
         ...options.headers,
         'Authorization': `Bearer ${getToken()}`
       }
     }
   }));
   ```

4. **Set appropriate timeouts**:
   ```typescript
   await adapter.init({
     timeout: 10000 // 10 seconds for most requests
   });

   // Longer timeout for specific requests
   await adapter.post('/large-upload', data, { timeout: 60000 });
   ```

5. **Use retries for idempotent operations**:
   ```typescript
   await adapter.init({
     retries: 3,      // Safe for GET requests
     retryDelay: 1000
   });

   // Don't retry non-idempotent operations
   await adapter.post('/payment', data, { retries: 0 });
   ```

## License

MIT
