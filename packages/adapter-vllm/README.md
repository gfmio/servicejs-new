# @servicejs/adapter-vllm

vLLM adapter for high-performance LLM inference.

## Features

- High-throughput inference
- Chat and completion APIs
- Embeddings (4096 dimensions)
- Compatible with OpenAI API

## Installation

```bash
npm install @servicejs/adapter-vllm
```

## Usage

```typescript
import { createVLLMAdapter } from '@servicejs/adapter-vllm';

const adapter = createVLLMAdapter();
await adapter.init({ baseURL: 'http://localhost:8000' });

const completion = await adapter.complete('prompt', { temperature: 0.8 });
const chat = await adapter.chat([{ role: 'user', content: 'Hi' }]);
const embeddings = await adapter.embeddings('text');
```

## License

MIT
