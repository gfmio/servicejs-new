import { createHuggingFaceAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createHuggingFaceAdapter();
  await adapter.init({ apiToken: process.env.HF_TOKEN || 'your-token' });
  await adapter.start();

  // Text generation
  const genResult = await adapter.textGeneration('Once upon a time', { maxLength: 100 });
  if (isOk(genResult)) {
    console.log('Generated:', genResult.value[0].generatedText);
  }

  // Text classification
  const classResult = await adapter.textClassification('I love this!');
  if (isOk(classResult)) {
    console.log('Sentiment:', classResult.value[0]);
  }

  // Question answering
  const qaResult = await adapter.questionAnswering({
    question: 'What is AI?',
    context: 'AI is artificial intelligence.',
  });
  if (isOk(qaResult)) {
    console.log('Answer:', qaResult.value.answer);
  }
}

main().catch(console.error);
