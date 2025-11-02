/**
 * Image upload with access control example
 */

import { createUploadThingAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createUploadThingAdapter();

  await adapter.init({
    apiKey: process.env.UPLOADTHING_API_KEY || 'test-api-key',
    appId: process.env.UPLOADTHING_APP_ID || 'test-app-id',
  });

  await adapter.start();

  console.log('=== Upload Public Image ===');

  // Upload a public image
  const publicImage = Buffer.from('public image data');
  const publicResult = await adapter.upload(publicImage, 'public-banner.jpg', {
    contentType: 'image/jpeg',
    acl: 'public-read',
    metadata: {
      category: 'marketing',
      campaign: 'summer-2024',
    },
  });

  if (isOk(publicResult)) {
    console.log('Public image uploaded:');
    console.log('  URL:', publicResult.value.url);
    console.log('  ACL: public-read');
  }

  console.log('\n=== Upload Private Image ===');

  // Upload a private image
  const privateImage = Buffer.from('private user avatar');
  const privateResult = await adapter.upload(privateImage, 'user-avatar.png', {
    contentType: 'image/png',
    acl: 'private',
    metadata: {
      userId: 'user-12345',
      type: 'avatar',
    },
  });

  if (isOk(privateResult)) {
    console.log('Private image uploaded:');
    console.log('  URL:', privateResult.value.url);
    console.log('  ACL: private');
    console.log('  Metadata:', privateResult.value);
  }

  console.log('\n=== Upload Profile Photos ===');

  // Upload multiple profile photos
  const users = ['alice', 'bob', 'charlie'];

  for (const user of users) {
    const photo = Buffer.from(`${user}'s profile photo`);
    const result = await adapter.upload(photo, `${user}-profile.jpg`, {
      contentType: 'image/jpeg',
      acl: 'public-read',
      metadata: {
        username: user,
        uploadType: 'profile-photo',
      },
    });

    if (isOk(result)) {
      console.log(`  ${user}: ${result.value.url}`);
    }
  }

  console.log('\n=== List Image Files ===');

  const allFiles = await adapter.listFiles({ limit: 10 });
  if (isOk(allFiles)) {
    const images = allFiles.value.filter(f => f.type.startsWith('image/'));
    console.log(`Total image files: ${images.length}`);
    images.forEach(img => {
      console.log(`  - ${img.name} (${(img.size / 1024).toFixed(2)} KB)`);
    });
  }

  await adapter.stop();
}

main().catch(console.error);
