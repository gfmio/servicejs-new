# @servicejs/adapter-cloudinary

Cloudinary adapter for media management - image and video uploads, transformations, and CDN delivery.

## Features

- 📷 **Image/Video Uploads**: Upload media to Cloudinary
- 🔄 **Transformations**: Dynamic image/video transformations
- 🌐 **CDN Delivery**: Fast global content delivery
- 📦 **Asset Management**: List, retrieve, and delete assets
- 🎨 **Effects**: Apply filters, overlays, and effects
- 📐 **Smart Cropping**: Face detection and auto-cropping

## Installation

```bash
bun add @servicejs/adapter-cloudinary
```

## Quick Start

```typescript
import { createCloudinaryAdapter } from '@servicejs/adapter-cloudinary';

const cloudinary = createCloudinaryAdapter();

await cloudinary.init({
  cloudName: 'your-cloud-name',
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
});

// Upload an image
const imageBuffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const result = await cloudinary.upload(imageBuffer, {
  publicId: 'my-image',
  folder: 'uploads',
});

// Generate transformed URL
const url = cloudinary.generateUrl('my-image', {
  width: 300,
  height: 200,
  crop: 'fill',
  quality: 'auto',
});
```

## Examples

### Basic Image Upload

```typescript
import { createCloudinaryAdapter } from '@servicejs/adapter-cloudinary';
import { isOk } from '@servicejs/result';

const cloudinary = createCloudinaryAdapter();

await cloudinary.init({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
});

const imageBuffer = Buffer.from(await Bun.file('photo.jpg').arrayBuffer());
const uploadResult = await cloudinary.upload(imageBuffer, {
  publicId: 'profile-photo',
  folder: 'users/123',
  tags: ['profile', 'user'],
});

if (isOk(uploadResult)) {
  console.log('Upload successful!');
  console.log('URL:', uploadResult.value.url);
  console.log('Size:', uploadResult.value.width, 'x', uploadResult.value.height);
}
```

### Image Transformations

```typescript
// Thumbnail (300x200, cropped to fill)
const thumbnailUrl = cloudinary.generateUrl('my-image', {
  width: 300,
  height: 200,
  crop: 'fill',
});

// Automatic quality and WebP format
const optimizedUrl = cloudinary.generateUrl('my-image', {
  width: 800,
  quality: 'auto',
  format: 'webp',
});

// Face detection cropping
const faceUrl = cloudinary.generateUrl('portrait', {
  width: 400,
  height: 400,
  crop: 'crop',
  gravity: 'face',
});

// Apply sepia effect
const effectUrl = cloudinary.generateUrl('photo', {
  width: 600,
  effect: 'sepia',
});
```

### Responsive Images

```typescript
function generateResponsiveImages(publicId: string) {
  const cloudinary = createCloudinaryAdapter();

  const sizes = [
    { width: 320, name: 'mobile' },
    { width: 768, name: 'tablet' },
    { width: 1024, name: 'desktop' },
    { width: 1920, name: 'full-hd' },
  ];

  return sizes.map(({ width, name }) => ({
    size: name,
    url: cloudinary.generateUrl(publicId, {
      width,
      quality: 'auto',
      format: 'webp',
    }),
  }));
}

const urls = generateResponsiveImages('hero-image');
```

### Social Media Images

```typescript
async function generateSocialMediaImages(publicId: string) {
  const formats = {
    'twitter-card': { width: 1200, height: 628 },
    'facebook-post': { width: 1200, height: 630 },
    'instagram-post': { width: 1080, height: 1080 },
  };

  const urls: Record<string, string> = {};

  for (const [platform, dimensions] of Object.entries(formats)) {
    urls[platform] = cloudinary.generateUrl(publicId, {
      width: dimensions.width,
      height: dimensions.height,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto',
    });
  }

  return urls;
}
```

## API Reference

### Configuration

```typescript
interface CloudinaryConfig {
  cloudName: string;      // Cloudinary cloud name
  apiKey: string;         // API key
  apiSecret: string;      // API secret
  uploadPreset?: string;  // Upload preset (optional)
}
```

### Methods

- `init(config)` - Initialize with credentials
- `upload(file, options?)` - Upload image or video
- `destroyAsset(publicId, resourceType?)` - Delete an asset
- `getAsset(publicId)` - Get asset information
- `generateUrl(publicId, transformation?)` - Generate transformed URL
- `listAssets(options?)` - List assets

### Transformation Options

```typescript
interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: 'scale' | 'fit' | 'fill' | 'limit' | 'pad' | 'crop';
  quality?: number | 'auto';
  format?: string;
  gravity?: 'face' | 'center' | 'auto';
  effect?: string;
}
```

## License

MIT
