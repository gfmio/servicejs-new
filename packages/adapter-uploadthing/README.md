# @servicejs/adapter-uploadthing

UploadThing adapter for type-safe file uploads with access control and image optimization.

## Features

- 📤 **File Uploads**: Simple, type-safe file uploads
- 🔒 **Access Control**: Public/private file access
- 📦 **Metadata**: Attach custom metadata to files
- 🖼️ **Image Optimization**: Automatic image optimization
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-uploadthing
```

## Quick Start

```typescript
import { createUploadThingAdapter } from '@servicejs/adapter-uploadthing';

const uploadThing = createUploadThingAdapter();

await uploadThing.init({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
});

// Upload a file
const file = Buffer.from(await Bun.file('image.jpg').arrayBuffer());
const result = await uploadThing.upload(file, 'profile.jpg', {
  acl: 'public-read',
  contentType: 'image/jpeg',
  metadata: { userId: '123' },
});

if (result.ok) {
  console.log('File uploaded:', result.value.url);
}
```

## Examples

### Basic File Upload

```typescript
import { createUploadThingAdapter } from '@servicejs/adapter-uploadthing';
import { isOk } from '@servicejs/result';

const uploadThing = createUploadThingAdapter();

await uploadThing.init({
  apiKey: process.env.UPLOADTHING_API_KEY!,
  appId: process.env.UPLOADTHING_APP_ID!,
});

// Upload with metadata
const imageBuffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const uploadResult = await uploadThing.upload(imageBuffer, 'user-photo.jpg', {
  acl: 'public-read',
  contentType: 'image/jpeg',
  metadata: {
    userId: 'user_123',
    albumId: 'album_456',
  },
});

if (isOk(uploadResult)) {
  console.log('Upload successful!');
  console.log('URL:', uploadResult.value.url);
  console.log('Key:', uploadResult.value.key);
  console.log('Size:', uploadResult.value.size, 'bytes');
}
```

### Upload with Access Control

```typescript
// Upload a private file
const privateDoc = Buffer.from('Confidential data');
const result = await uploadThing.upload(privateDoc, 'contract.pdf', {
  acl: 'private',
  contentType: 'application/pdf',
  metadata: {
    department: 'legal',
    confidential: 'true',
  },
});

if (isOk(result)) {
  console.log('Private file uploaded:', result.value.key);
}
```

### File Management

```typescript
// List all files
const listResult = await uploadThing.listFiles({ limit: 50 });

if (isOk(listResult)) {
  for (const file of listResult.value) {
    console.log(`${file.name} (${file.size} bytes)`);
  }
}

// Get file information
const infoResult = await uploadThing.getFileInfo('user-photo.jpg');

if (isOk(infoResult)) {
  console.log('File:', infoResult.value.name);
  console.log('URL:', infoResult.value.url);
  console.log('Metadata:', infoResult.value.metadata);
}

// Delete a file
const deleteResult = await uploadThing.deleteFile('old-file.jpg');

if (isOk(deleteResult)) {
  console.log('File deleted successfully');
}
```

### Multiple File Uploads

```typescript
async function uploadMultipleFiles(files: Array<{ buffer: Buffer; name: string }>) {
  const results = await Promise.all(
    files.map(({ buffer, name }) =>
      uploadThing.upload(buffer, name, {
        acl: 'public-read',
        contentType: 'image/jpeg',
      })
    )
  );

  const successful = results.filter(isOk);
  const failed = results.filter(r => !isOk(r));

  console.log(`Uploaded ${successful.length}/${files.length} files`);

  return successful.map(r => isOk(r) ? r.value : null).filter(Boolean);
}

// Usage
const files = [
  { buffer: Buffer.from('...'), name: 'photo1.jpg' },
  { buffer: Buffer.from('...'), name: 'photo2.jpg' },
  { buffer: Buffer.from('...'), name: 'photo3.jpg' },
];

const uploaded = await uploadMultipleFiles(files);
```

### Upload Progress Tracking

```typescript
import { createUploadThingAdapter } from '@servicejs/adapter-uploadthing';

async function uploadWithProgress(file: Buffer, filename: string) {
  const uploadThing = createUploadThingAdapter();

  await uploadThing.init({
    apiKey: process.env.UPLOADTHING_API_KEY!,
    appId: process.env.UPLOADTHING_APP_ID!,
  });

  console.log(`Uploading ${filename} (${file.byteLength} bytes)...`);

  const result = await uploadThing.upload(file, filename, {
    acl: 'public-read',
  });

  if (isOk(result)) {
    console.log('✓ Upload complete:', result.value.url);
    return result.value;
  } else {
    console.error('✗ Upload failed:', result.error.message);
    throw result.error;
  }
}
```

### Integration with Express

```typescript
import express from 'express';
import { createUploadThingAdapter } from '@servicejs/adapter-uploadthing';
import { isOk } from '@servicejs/result';

const app = express();
const uploadThing = createUploadThingAdapter();

await uploadThing.init({
  apiKey: process.env.UPLOADTHING_API_KEY!,
  appId: process.env.UPLOADTHING_APP_ID!,
});

app.post('/upload', async (req, res) => {
  const fileBuffer = req.body; // Assuming raw buffer in body

  const result = await uploadThing.upload(fileBuffer, 'upload.jpg', {
    acl: 'public-read',
    metadata: {
      uploadedBy: req.headers['user-id'] as string,
      timestamp: new Date().toISOString(),
    },
  });

  if (isOk(result)) {
    res.json({
      success: true,
      url: result.value.url,
      key: result.value.key,
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error.message,
    });
  }
});

app.listen(3000);
```

## API Reference

### `UploadThingAdapter`

#### Configuration

```typescript
interface UploadThingConfig {
  apiKey: string;      // UploadThing API key
  appId: string;       // UploadThing App ID
}
```

#### Methods

- `init(config)` - Initialize with API credentials
- `upload(file, filename, options?)` - Upload a file
- `deleteFile(key)` - Delete a file by key
- `getFileInfo(key)` - Get file information
- `listFiles(options?)` - List uploaded files

## License

MIT
