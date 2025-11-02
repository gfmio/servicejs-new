/**
 * Basic Cloudinary adapter usage
 */

import { createCloudinaryAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createCloudinaryAdapter();

  // Initialize with credentials
  await adapter.init({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo-cloud',
    apiKey: process.env.CLOUDINARY_API_KEY || 'api-key',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'api-secret',
  });

  await adapter.start();

  console.log('=== Upload Image ===');

  // Upload an image
  const imageData = Buffer.from('fake image data for demo');
  const uploadResult = await adapter.upload(imageData, {
    publicId: 'demo-image',
    resourceType: 'image',
  });

  if (isOk(uploadResult)) {
    console.log('Upload successful:');
    console.log('  Public ID:', uploadResult.value.publicId);
    console.log('  URL:', uploadResult.value.url);
    console.log('  Secure URL:', uploadResult.value.secureUrl);
    console.log('  Size:', uploadResult.value.bytes, 'bytes');
  }

  console.log('\n=== Generate Transformed URL ===');

  // Generate a transformed URL
  const thumbnailUrl = adapter.generateUrl('demo-image', {
    width: 200,
    height: 200,
    crop: 'fill',
    quality: 'auto',
  });

  console.log('Thumbnail URL:', thumbnailUrl);

  await adapter.stop();
}

main().catch(console.error);
