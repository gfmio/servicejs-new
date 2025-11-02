# @servicejs/adapter-cloudflare-ai

Cloudflare Workers AI adapter.

## Features

- Text generation, classification, translation
- Image classification
- Embeddings (768 dimensions)
- Runs on Cloudflare's edge network

## Installation

```bash
npm install @servicejs/adapter-cloudflare-ai
```

## Usage

```typescript
import { createCloudflareAIAdapter } from '@servicejs/adapter-cloudflare-ai';

const adapter = createCloudflareAIAdapter();
await adapter.init({ accountId: 'id', apiToken: 'token' });

const text = await adapter.textGeneration('@cf/meta/llama-2-7b', 'prompt');
const sentiment = await adapter.textClassification('I love this!');
const embeddings = await adapter.embeddings('text');
```

## License

MIT
