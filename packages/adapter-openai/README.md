# @servicejs/adapter-openai

OpenAI adapter for GPT models, embeddings, and AI capabilities.

## Features

- **Chat Completions**: GPT-4, GPT-3.5 Turbo with full conversation support
- **Streaming**: Real-time streaming responses with cancellation
- **Embeddings**: Text-to-vector with ada-002 (1536 dimensions)
- **Model Management**: List and query available models
- **Function Calling**: Support for function definitions (types provided)
- **Type-Safe API**: Full TypeScript support with Result types

## Installation

```bash
npm install @servicejs/adapter-openai
```

## Basic Usage

```typescript
import { createOpenAIAdapter } from '@servicejs/adapter-openai';
import { isOk } from '@servicejs/result';

const adapter = createOpenAIAdapter();

await adapter.init({
  apiKey: process.env.OPENAI_API_KEY,
  defaultModel: 'gpt-4',
});

await adapter.start();

// Chat completion
const result = await adapter.createChatCompletion([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is TypeScript?' },
]);

if (isOk(result)) {
  console.log(result.value.choices[0].message.content);
  console.log(`Tokens used: ${result.value.usage.totalTokens}`);
}
```

## API Reference

### Configuration

```typescript
interface OpenAIConfig {
  apiKey: string;              // OpenAI API key
  organization?: string;       // Organization ID
  baseURL?: string;            // Custom API endpoint
  defaultModel?: string;       // Default model (e.g., 'gpt-4')
  timeout?: number;            // Request timeout (ms)
}
```

### Chat Completions

```typescript
// Standard completion
createChatCompletion(
  messages: OpenAIMessage[],
  options?: OpenAIChatOptions
): Promise<Result<OpenAIChatCompletion, Error>>

// Streaming completion
createChatCompletionStream(
  messages: OpenAIMessage[],
  options?: OpenAIChatOptions
): Promise<Result<OpenAIStream, Error>>
```

**Options:**
- `model` - Model to use (overrides default)
- `temperature` - Sampling temperature (0-2)
- `maxTokens` - Maximum tokens to generate
- `topP` - Nucleus sampling parameter
- `frequencyPenalty` - Penalty for frequency
- `presencePenalty` - Penalty for presence
- `stop` - Stop sequences
- `functions` - Function definitions for function calling
- `functionCall` - Control function calling behavior

### Embeddings

```typescript
createEmbedding(
  input: string | string[],
  model?: string
): Promise<Result<OpenAIEmbeddingResponse, Error>>
```

Returns 1536-dimensional vectors for text-embedding-ada-002.

### Model Management

```typescript
listModels(): Promise<Result<OpenAIModel[], Error>>
getModel(modelId: string): Promise<Result<OpenAIModel, Error>>
```

### Streaming API

```typescript
const stream = result.value; // OpenAIStream

stream.on('data', (chunk: OpenAIStreamChunk) => {
  const content = chunk.choices[0].delta.content;
  if (content) process.stdout.write(content);
});

stream.on('end', () => {
  console.log('\nComplete!');
});

stream.on('error', (error) => {
  console.error('Stream error:', error);
});

// Cancel stream
stream.cancel();
```

## Examples

See the `examples/` directory:
- `basic.ts` - Chat completions, embeddings, model listing
- `streaming.ts` - Streaming responses with cancellation
- `embeddings-similarity.ts` - Semantic search with cosine similarity

## License

MIT
