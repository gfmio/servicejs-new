import { createHuggingFaceAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createHuggingFaceAdapter();
  await adapter.init({ apiToken: process.env.HF_TOKEN || 'your-token' });
  await adapter.start();

  // Text to image
  const imgResult = await adapter.textToImage('A beautiful landscape');
  if (isOk(imgResult)) {
    console.log('Image generated:', imgResult.value.size, 'bytes');
  }

  // Image classification
  const mockImage = new Blob(['image-data'], { type: 'image/jpeg' });
  const classResult = await adapter.imageClassification(mockImage);
  if (isOk(classResult)) {
    console.log('Classifications:', classResult.value);
  }
}

main().catch(console.error);
