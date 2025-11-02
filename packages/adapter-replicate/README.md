# @servicejs/adapter-replicate

Replicate adapter for ML model predictions and async jobs.

## Features

- **Predictions**: Create and manage model predictions
- **Async Jobs**: Handle long-running predictions
- **Model Discovery**: Search and explore models
- **Type-Safe API**: Full TypeScript with Result types

## Installation

```bash
npm install @servicejs/adapter-replicate
```

## Basic Usage

```typescript
import { createReplicateAdapter } from '@servicejs/adapter-replicate';
import { isOk } from '@servicejs/result';

const adapter = createReplicateAdapter();
await adapter.init({ apiToken: process.env.REPLICATE_API_TOKEN });
await adapter.start();

// Create prediction
const result = await adapter.createPrediction(
  'stability-ai/stable-diffusion:version',
  { prompt: 'A beautiful sunset' }
);

if (isOk(result)) {
  console.log('Prediction:', result.value.output);
}

// Run model directly
const output = await adapter.runModel('owner', 'model', { input: 'data' });
```

## API

- `createPrediction(version, input)` - Create new prediction
- `getPrediction(id)` - Get prediction status
- `cancelPrediction(id)` - Cancel running prediction
- `listPredictions()` - List all predictions
- `getModel(owner, name)` - Get model info
- `runModel(owner, name, input)` - Run model and wait

## License

MIT
