# @servicejs/adapter-ollama

Ollama adapter for local LLM server.

## Features

- Local LLM inference (Llama 2, Mistral, etc.)
- Chat and completion APIs
- Embeddings generation (384 dimensions)
- Model management

## Installation

```bash
npm install @servicejs/adapter-ollama
```

## Usage

```typescript
import { createOllamaAdapter } from '@servicejs/adapter-ollama';

const adapter = createOllamaAdapter();
await adapter.init({ baseURL: 'http://localhost:11434' });

const response = await adapter.generate('llama2', 'Explain AI');
const chat = await adapter.chat('llama2', [{ role: 'user', content: 'Hi' }]);
const embeddings = await adapter.embeddings('llama2', 'text');
```

## License

MIT
