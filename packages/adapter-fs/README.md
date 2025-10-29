# @servicejs/adapter-fs

Local filesystem storage adapter for ServiceJS with S3-compatible interface.

## Installation

```bash
npm install @servicejs/adapter-fs
```

## Usage

```typescript
import { createFilesystemAdapter } from '@servicejs/adapter-fs';
import { isOk } from '@servicejs/result';

const adapter = createFilesystemAdapter();

// Initialize with base path
await adapter.init({
  basePath: '/path/to/storage',
  createIfMissing: true,
});

await adapter.start();

// Create a bucket (directory)
await adapter.createBucket({ bucket: 'my-bucket' });

// Put an object (file)
const result = await adapter.putObject({
  bucket: 'my-bucket',
  key: 'hello.txt',
  body: 'Hello, Filesystem!',
  contentType: 'text/plain',
  metadata: {
    author: 'system',
    version: '1.0',
  },
});

if (isOk(result)) {
  console.log('File saved, ETag:', result.value.etag);
}

// Get object
const getResult = await adapter.getObject({
  bucket: 'my-bucket',
  key: 'hello.txt',
});

if (isOk(getResult)) {
  console.log('Content:', getResult.value.body.toString());
  console.log('Metadata:', getResult.value.metadata);
}

await adapter.stop();
await adapter.destroy();
```

## Configuration

### `FilesystemConfig`

```typescript
interface FilesystemConfig {
  basePath: string;
  createIfMissing?: boolean;
}
```

- **`basePath`** (required) - Base directory for storage
- **`createIfMissing`** (optional, default: false) - Create base directory if it doesn't exist

## Features

- ✅ S3-compatible interface
- ✅ Bucket operations (create, delete, list)
- ✅ Object operations (put, get, delete, list, copy)
- ✅ Metadata support with `.meta.json` files
- ✅ Content type preservation
- ✅ Prefix-based listing
- ✅ Nested directory support
- ✅ Type-safe with TypeScript
- ✅ Result-based error handling

## API Reference

### Bucket Operations

#### `createBucket(options)`
Creates a new bucket (directory).

```typescript
await adapter.createBucket({ bucket: 'my-bucket' });
```

#### `deleteBucket(options)`
Deletes a bucket and all its contents.

```typescript
await adapter.deleteBucket({ bucket: 'my-bucket' });
```

#### `listBuckets()`
Lists all buckets.

```typescript
const result = await adapter.listBuckets();
if (isOk(result)) {
  console.log('Buckets:', result.value);
}
```

### Object Operations

#### `putObject(options)`
Stores a file with optional metadata.

```typescript
await adapter.putObject({
  bucket: 'my-bucket',
  key: 'data/file.json',
  body: JSON.stringify({ foo: 'bar' }),
  contentType: 'application/json',
  metadata: {
    createdBy: 'user-123',
    timestamp: new Date().toISOString(),
  },
});
```

#### `getObject(options)`
Retrieves a file with its metadata.

```typescript
const result = await adapter.getObject({
  bucket: 'my-bucket',
  key: 'data/file.json',
});

if (isOk(result)) {
  console.log('Body:', result.value.body);
  console.log('Content-Type:', result.value.contentType);
  console.log('Metadata:', result.value.metadata);
  console.log('Size:', result.value.size);
  console.log('Last Modified:', result.value.lastModified);
}
```

#### `headObject(options)`
Gets file metadata without downloading the content.

```typescript
const result = await adapter.headObject({
  bucket: 'my-bucket',
  key: 'large-file.dat',
});

if (isOk(result)) {
  console.log('Size:', result.value.size);
  console.log('Last Modified:', result.value.lastModified);
}
```

#### `deleteObject(options)`
Deletes a file and its metadata.

```typescript
await adapter.deleteObject({
  bucket: 'my-bucket',
  key: 'old-file.txt',
});
```

#### `listObjects(options)`
Lists objects in a bucket with optional filtering.

```typescript
// List all objects
const allResult = await adapter.listObjects({
  bucket: 'my-bucket',
});

// List with prefix
const dataResult = await adapter.listObjects({
  bucket: 'my-bucket',
  prefix: 'data/',
});

// List with limit
const limitedResult = await adapter.listObjects({
  bucket: 'my-bucket',
  maxKeys: 100,
});

if (isOk(allResult)) {
  allResult.value.contents.forEach((obj) => {
    console.log(`${obj.key} - ${obj.size} bytes`);
  });
  console.log('Truncated:', allResult.value.isTruncated);
}
```

#### `copyObject(options)`
Copies a file within or across buckets.

```typescript
await adapter.copyObject({
  sourceBucket: 'source-bucket',
  sourceKey: 'original.txt',
  destinationBucket: 'dest-bucket',
  destinationKey: 'copy.txt',
});
```

## Storage Structure

Files are stored in a directory structure like:

```
/base/path/
├── bucket1/
│   ├── file1.txt
│   ├── file1.txt.meta.json    # Metadata
│   └── nested/
│       ├── file2.json
│       └── file2.json.meta.json
└── bucket2/
    └── data.bin
```

Metadata files (`.meta.json`) store:
- Content-Type
- Custom metadata key-value pairs

## Use Cases

- **Local development**: S3-compatible storage for development without AWS
- **Testing**: Fast, predictable storage for integration tests
- **Caching**: Local file cache with S3-like interface
- **Small deployments**: Simple storage for applications that don't need cloud storage
- **Migration**: Easy transition between local and cloud storage

## Examples

### Store and retrieve JSON data

```typescript
const data = { users: [{ id: 1, name: 'Alice' }] };

await adapter.putObject({
  bucket: 'app-data',
  key: 'users.json',
  body: JSON.stringify(data, null, 2),
  contentType: 'application/json',
});

const result = await adapter.getObject({
  bucket: 'app-data',
  key: 'users.json',
});

if (isOk(result)) {
  const users = JSON.parse(result.value.body.toString());
  console.log(users);
}
```

### Organize files by date

```typescript
const date = new Date();
const key = `logs/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/app.log`;

await adapter.putObject({
  bucket: 'logs',
  key,
  body: 'Application started\n',
  contentType: 'text/plain',
});

// List all logs for a month
const monthLogs = await adapter.listObjects({
  bucket: 'logs',
  prefix: `logs/${date.getFullYear()}/${date.getMonth() + 1}/`,
});
```

### Store binary files

```typescript
const imageBuffer = await fs.readFile('photo.jpg');

await adapter.putObject({
  bucket: 'images',
  key: 'profile/photo.jpg',
  body: imageBuffer,
  contentType: 'image/jpeg',
  metadata: {
    uploadedBy: 'user-123',
    originalName: 'IMG_1234.jpg',
  },
});
```

## Related Packages

- [@servicejs/adapter-s3](../adapter-s3) - AWS S3 adapter
- [@servicejs/adapter-r2](../adapter-r2) - Cloudflare R2 adapter
- [@servicejs/result](../result) - Result type

## License

MIT
