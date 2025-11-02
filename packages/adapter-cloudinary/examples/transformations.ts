/**
 * Image transformations example
 */

import { createCloudinaryAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createCloudinaryAdapter();

  await adapter.init({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo-cloud',
    apiKey: process.env.CLOUDINARY_API_KEY || 'api-key',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'api-secret',
  });

  await adapter.start();

  // Upload an image first
  const imageData = Buffer.from('sample image for transformation demo');
  const uploadResult = await adapter.upload(imageData, {
    publicId: 'transform-demo',
  });

  if (isOk(uploadResult)) {
    console.log('=== Image Uploaded ===');
    console.log('Original URL:', uploadResult.value.url);

    console.log('\n=== Various Transformations ===');

    // Thumbnail
    const thumbnail = adapter.generateUrl('transform-demo', {
      width: 150,
      height: 150,
      crop: 'thumb',
      gravity: 'face',
    });
    console.log('Thumbnail (face crop):', thumbnail);

    // Banner
    const banner = adapter.generateUrl('transform-demo', {
      width: 1200,
      height: 300,
      crop: 'fill',
      quality: 'auto',
    });
    console.log('Banner:', banner);

    // Responsive image
    const responsive = adapter.generateUrl('transform-demo', {
      width: 800,
      crop: 'scale',
      quality: 'auto',
      format: 'webp',
    });
    console.log('Responsive (WebP):', responsive);

    // Profile picture with effects
    const profilePic = adapter.generateUrl('transform-demo', {
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      effect: 'art:hokusai',
    });
    console.log('Profile pic (with effect):', profilePic);
  }

  await adapter.stop();
}

main().catch(console.error);
