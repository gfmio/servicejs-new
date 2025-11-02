# @servicejs/adapter-huggingface

Hugging Face adapter for ML models and inference API.

## Features

- **Text Generation**: GPT-2, BLOOM, and other LLMs
- **Text Classification**: Sentiment, NER, and classification
- **Question Answering**: Extract answers from context
- **Summarization & Translation**: Text processing tasks
- **Image Generation**: Stable Diffusion and text-to-image
- **Image Classification**: Vision tasks
- **Feature Extraction**: Text embeddings (768 dimensions)
- **Model Search**: Find and query 100,000+ models
- **Type-Safe API**: Full TypeScript support with Result types

## Installation

```bash
npm install @servicejs/adapter-huggingface
```

## Basic Usage

```typescript
import { createHuggingFaceAdapter } from '@servicejs/adapter-huggingface';
import { isOk } from '@servicejs/result';

const adapter = createHuggingFaceAdapter();

await adapter.init({
  apiToken: process.env.HF_TOKEN,
});

await adapter.start();

// Text generation
const result = await adapter.textGeneration('Once upon a time', {
  maxLength: 100,
  temperature: 0.8,
});

if (isOk(result)) {
  console.log(result.value[0].generatedText);
}

// Text classification
const classResult = await adapter.textClassification('I love this product!');
if (isOk(classResult)) {
  console.log('Sentiment:', classResult.value[0]);
}
```

## API Reference

### Configuration

```typescript
interface HuggingFaceConfig {
  apiToken: string;     // Hugging Face API token
  baseURL?: string;     // Custom API endpoint
  timeout?: number;     // Request timeout (ms)
}
```

### Text Tasks

```typescript
textGeneration(input: string, options?: TextGenerationOptions): Promise<Result<TextGenerationResponse[], Error>>
textClassification(input: string): Promise<Result<ClassificationLabel[], Error>>
questionAnswering(input: QuestionAnsweringInput): Promise<Result<QuestionAnsweringResponse, Error>>
summarization(text: string, options?: { maxLength?: number; minLength?: number }): Promise<Result<string, Error>>
translation(text: string, targetLang?: string): Promise<Result<string, Error>>
```

### Image Tasks

```typescript
textToImage(prompt: string, options?: ImageGenerationOptions): Promise<Result<Blob, Error>>
imageClassification(image: Blob): Promise<Result<ClassificationLabel[], Error>>
```

### Embeddings

```typescript
featureExtraction(input: string | string[]): Promise<Result<number[][], Error>>
```

Returns 768-dimensional embeddings for single or batch inputs.

### Model Management

```typescript
searchModels(options?: ModelSearchOptions): Promise<Result<HuggingFaceModel[], Error>>
getModel(modelId: string): Promise<Result<HuggingFaceModel, Error>>
inference<T>(modelId: string, input: any, options?: Record<string, any>): Promise<Result<T, Error>>
```

**Search Options:**
- `task` - Filter by task type
- `author` - Filter by author/organization
- `limit` - Limit results
- `sort` - Sort by downloads, likes, or trending

## Supported Tasks

- Text: generation, classification, QA, summarization, translation
- Image: generation, classification, object detection
- Audio: classification, speech recognition, text-to-speech
- Embeddings: feature extraction, sentence similarity

## Examples

See the `examples/` directory:
- `text-tasks.ts` - Text generation, classification, QA
- `image-tasks.ts` - Image generation and classification
- `model-search.ts` - Model search and embeddings

## License

MIT
