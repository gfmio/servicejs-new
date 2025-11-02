# @servicejs/adapter-bunnycdn

BunnyCDN adapter for affordable CDN distribution, storage zones, and stream delivery.

## Features

- 🌐 **CDN Distribution**: Fast global content delivery
- 📦 **Storage Zones**: File storage with CDN delivery
- 🔄 **Cache Purging**: URL-specific or full zone cache purging
- 📊 **Statistics**: Bandwidth, requests, and cache hit rate tracking
- 💰 **Cost-Effective**: Affordable CDN pricing

## Installation

```bash
bun add @servicejs/adapter-bunnycdn
```

## Quick Start

```typescript
import { createBunnyCDNAdapter } from '@servicejs/adapter-bunnycdn';

const bunny = createBunnyCDNAdapter();

await bunny.init({
  apiKey: 'your-api-key',
  storageZone: 'your-storage-zone',
  pullZoneId: 12345,
});

// Upload a file
const file = Buffer.from('Hello, world!');
const result = await bunny.uploadFile('docs/hello.txt', file);

if (result.ok) {
  console.log('File URL:', result.value.url);
}
```

## Examples

### Basic File Upload and Storage

```typescript
import { createBunnyCDNAdapter } from '@servicejs/adapter-bunnycdn';
import { isOk } from '@servicejs/result';

const bunny = createBunnyCDNAdapter();

await bunny.init({
  apiKey: process.env.BUNNYCDN_API_KEY!,
  storageZone: 'my-storage-zone',
  pullZoneId: 12345,
});

// Upload an image
const imageBuffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const uploadResult = await bunny.uploadFile('images/photo.jpg', imageBuffer);

if (isOk(uploadResult)) {
  console.log('File uploaded successfully!');
  console.log('URL:', uploadResult.value.url);
  console.log('Path:', uploadResult.value.path);
  console.log('Size:', uploadResult.value.size, 'bytes');
}
```

### Cache Purging

```typescript
// Purge a specific URL from cache
const purgeResult = await bunny.purgeCache({
  url: 'https://my-zone.b-cdn.net/images/photo.jpg',
});

if (isOk(purgeResult)) {
  console.log('Cache purged for URL');
}

// Purge entire pull zone cache
const purgeAllResult = await bunny.purgeCache({
  purgeAll: true,
});

if (isOk(purgeAllResult)) {
  console.log('All cache purged for pull zone');
}
```

### File Management

```typescript
// List all files in storage zone
const listResult = await bunny.listFiles('/');

if (isOk(listResult)) {
  for (const file of listResult.value) {
    console.log(`${file.path} - ${file.size} bytes`);
  }
}

// List files in specific directory
const imagesResult = await bunny.listFiles('/images');

if (isOk(imagesResult)) {
  console.log(`Found ${imagesResult.value.length} images`);
}

// Delete a file
const deleteResult = await bunny.deleteFile('images/old-photo.jpg');

if (isOk(deleteResult)) {
  console.log('File deleted successfully');
}
```

### CDN Statistics

```typescript
// Get CDN statistics
const statsResult = await bunny.getStats();

if (isOk(statsResult)) {
  const stats = statsResult.value;
  console.log('Bandwidth used:', stats.bandwidth, 'bytes');
  console.log('Total requests:', stats.requests);
  console.log('Cache hit rate:', (stats.cacheHitRate * 100).toFixed(2) + '%');
}
```

### Bulk File Upload

```typescript
async function uploadDirectory(localPath: string, remotePath: string) {
  const bunny = createBunnyCDNAdapter();

  await bunny.init({
    apiKey: process.env.BUNNYCDN_API_KEY!,
    storageZone: 'my-storage-zone',
  });

  const files = await Bun.glob(`${localPath}/**/*`).toArray();

  const results = await Promise.all(
    files.map(async (filePath) => {
      const fileName = filePath.replace(localPath, '');
      const remoteName = `${remotePath}${fileName}`;
      const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());

      return bunny.uploadFile(remoteName, buffer);
    })
  );

  const successful = results.filter(isOk);
  console.log(`Uploaded ${successful.length}/${files.length} files`);

  return successful;
}

// Usage
await uploadDirectory('./public/assets', '/website/assets');
```

### Image CDN with Automatic Purge

```typescript
import { createBunnyCDNAdapter } from '@servicejs/adapter-bunnycdn';
import { isOk } from '@servicejs/result';

class ImageCDN {
  private bunny: ReturnType<typeof createBunnyCDNAdapter>;

  constructor() {
    this.bunny = createBunnyCDNAdapter();
  }

  async init(apiKey: string, storageZone: string, pullZoneId: number) {
    await this.bunny.init({ apiKey, storageZone, pullZoneId });
  }

  async uploadImage(path: string, imageBuffer: Buffer): Promise<string | null> {
    // Upload the image
    const uploadResult = await this.bunny.uploadFile(path, imageBuffer);

    if (!isOk(uploadResult)) {
      console.error('Upload failed:', uploadResult.error.message);
      return null;
    }

    const url = uploadResult.value.url;

    // Purge cache for this URL to ensure fresh content
    await this.bunny.purgeCache({ url });

    return url;
  }

  async replaceImage(path: string, newImageBuffer: Buffer): Promise<string | null> {
    // Delete old image
    await this.bunny.deleteFile(path);

    // Upload new image
    return this.uploadImage(path, newImageBuffer);
  }
}

// Usage
const imageCDN = new ImageCDN();
await imageCDN.init(
  process.env.BUNNYCDN_API_KEY!,
  'my-images',
  12345
);

const newImage = Buffer.from(await Bun.file('new-banner.jpg').arrayBuffer());
const url = await imageCDN.uploadImage('banners/main.jpg', newImage);
console.log('Image available at:', url);
```

### Static Site Deployment

```typescript
import { createBunnyCDNAdapter } from '@servicejs/adapter-bunnycdn';
import { isOk } from '@servicejs/result';

async function deployStaticSite(buildDir: string) {
  const bunny = createBunnyCDNAdapter();

  await bunny.init({
    apiKey: process.env.BUNNYCDN_API_KEY!,
    storageZone: 'my-website',
    pullZoneId: parseInt(process.env.BUNNYCDN_PULL_ZONE_ID!),
  });

  console.log('📦 Uploading files...');

  const files = await Bun.glob(`${buildDir}/**/*`).toArray();
  const uploads: Promise<any>[] = [];

  for (const filePath of files) {
    const remotePath = filePath.replace(buildDir, '');
    const buffer = Buffer.from(await Bun.file(filePath).arrayBuffer());

    uploads.push(bunny.uploadFile(remotePath, buffer));
  }

  const results = await Promise.all(uploads);
  const successful = results.filter(isOk);

  console.log(`✅ Uploaded ${successful.length}/${files.length} files`);

  // Purge all cache to serve fresh content
  console.log('🔄 Purging cache...');
  const purgeResult = await bunny.purgeCache({ purgeAll: true });

  if (isOk(purgeResult)) {
    console.log('✅ Cache purged successfully');
  }

  // Get deployment stats
  const statsResult = await bunny.getStats();
  if (isOk(statsResult)) {
    console.log('📊 Current stats:');
    console.log(`   Bandwidth: ${(statsResult.value.bandwidth / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Requests: ${statsResult.value.requests}`);
    console.log(`   Cache hit rate: ${(statsResult.value.cacheHitRate * 100).toFixed(2)}%`);
  }
}

// Usage
await deployStaticSite('./dist');
```

### Video Streaming Setup

```typescript
import { createBunnyCDNAdapter } from '@servicejs/adapter-bunnycdn';
import { isOk } from '@servicejs/result';

async function uploadVideoForStreaming(videoPath: string, title: string) {
  const bunny = createBunnyCDNAdapter();

  await bunny.init({
    apiKey: process.env.BUNNYCDN_API_KEY!,
    storageZone: 'video-storage',
    pullZoneId: parseInt(process.env.BUNNYCDN_VIDEO_PULL_ZONE_ID!),
  });

  // Upload video file
  const videoBuffer = Buffer.from(await Bun.file(videoPath).arrayBuffer());
  const remotePath = `videos/${title.toLowerCase().replace(/\s+/g, '-')}.mp4`;

  const uploadResult = await bunny.uploadFile(remotePath, videoBuffer);

  if (isOk(uploadResult)) {
    const file = uploadResult.value;
    console.log('Video uploaded successfully!');
    console.log('Streaming URL:', file.url);
    console.log('File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    return file.url;
  } else {
    console.error('Upload failed:', uploadResult.error.message);
    return null;
  }
}

// Usage
const streamUrl = await uploadVideoForStreaming('./video.mp4', 'Product Demo');
```

## API Reference

### `BunnyCDNAdapter`

#### Configuration

```typescript
interface BunnyCDNConfig {
  apiKey: string;          // BunnyCDN API key
  storageZone?: string;    // Storage zone name
  pullZoneId?: number;     // Pull zone ID for cache purging
}
```

#### Methods

- `init(config)` - Initialize with API key and zones
- `uploadFile(path, buffer)` - Upload a file to storage zone
- `deleteFile(path)` - Delete a file from storage zone
- `listFiles(directory?)` - List files in storage zone
- `purgeCache(options)` - Purge CDN cache (URL or full zone)
- `getStats()` - Get CDN statistics

#### Types

```typescript
interface StorageFile {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  url: string;
}

interface PullZoneStats {
  bandwidth: number;        // Total bandwidth in bytes
  requests: number;         // Total number of requests
  cacheHitRate: number;     // Cache hit rate (0-1)
}
```

## Best Practices

1. **Cache Purging**: Only purge cache when content changes to minimize API calls
2. **Bulk Uploads**: Use `Promise.all()` for parallel uploads of multiple files
3. **Error Handling**: Always check `isOk(result)` before accessing result values
4. **Path Naming**: Use consistent path naming conventions for easy management
5. **Statistics Monitoring**: Regularly check stats to optimize CDN usage

## License

MIT
