# @servicejs/adapter-anthropic

Anthropic adapter for Claude models via the Messages API.

## Features

- **Messages API**: Claude 3.5 Sonnet, Opus, Sonnet, Haiku
- **Streaming**: Real-time streaming with proper event handling
- **Vision**: Image analysis with content blocks
- **Multi-turn**: Full conversation support
- **Type-Safe API**: Full TypeScript support with Result types

## Installation

```bash
npm install @servicejs/adapter-anthropic
```

## Basic Usage

```typescript
import { createAnthropicAdapter } from '@servicejs/adapter-anthropic';
import { isOk } from '@servicejs/result';

const adapter = createAnthropicAdapter();

await adapter.init({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultModel: 'claude-3-5-sonnet-20241022',
  defaultMaxTokens: 1024,
});

await adapter.start();

const result = await adapter.createMessage([
  { role: 'user', content: 'Explain quantum computing simply' },
]);

if (isOk(result)) {
  console.log(result.value.content[0]);
  console.log(`Tokens: ${result.value.usage.inputTokens + result.value.usage.outputTokens}`);
}
```

## API Reference

### Configuration

```typescript
interface AnthropicConfig {
  apiKey: string;              // Anthropic API key
  baseURL?: string;            // Custom API endpoint
  defaultModel?: string;       // Default model
  defaultMaxTokens?: number;   // Default max tokens
  timeout?: number;            // Request timeout (ms)
}
```

### Messages

```typescript
createMessage(
  messages: AnthropicMessage[],
  options?: AnthropicMessageOptions
): Promise<Result<AnthropicMessageResponse, Error>>

createMessageStream(
  messages: AnthropicMessage[],
  options?: AnthropicMessageOptions
): Promise<Result<AnthropicStream, Error>>
```

**Options:**
- `model` - Model to use
- `maxTokens` - Maximum tokens
- `temperature` - Sampling temperature
- `topP`, `topK` - Sampling parameters
- `stopSequences` - Stop sequences
- `system` - System prompt
- `metadata` - Request metadata

### Vision (Content Blocks)

```typescript
const result = await adapter.createMessage([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Describe this image:' },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64ImageData,
        },
      },
    ],
  },
]);
```

### Streaming

```typescript
const stream = result.value;

stream.on('data', (event) => {
  if (event.type === 'content_block_delta') {
    process.stdout.write(event.delta.text);
  }
});

stream.on('end', () => console.log('\nDone!'));
stream.cancel(); // Cancel stream
```

### Models

```typescript
listModels(): Promise<Result<AnthropicModel[], Error>>
getModel(modelId: string): Promise<Result<AnthropicModel, Error>>
```

## Examples

See the `examples/` directory:
- `basic.ts` - Simple message completion
- `streaming.ts` - Streaming responses
- `vision.ts` - Image analysis with content blocks

## License

MIT
