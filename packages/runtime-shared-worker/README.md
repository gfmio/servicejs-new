# @servicejs/runtime-shared-worker

Shared Worker runtime for ServiceJS - cross-tab browser worker integration with port management.

## Features

- **Environment**: Configuration from main thread
- **Time**: setTimeout/setInterval, performance.now()
- **Lifecycle**: Graceful shutdown handlers
- **Console**: All log levels
- **HTTP**: Fetch API with Result types
- **Crypto**: Web Crypto API (SHA-1/256/384/512, HMAC)
- **Ports**: Multi-port management for cross-tab communication

## Key Differentiator

Shared Workers differ from Web Workers in that they can be accessed from multiple browser tabs/windows simultaneously. The `ports` capability manages connections from all tabs.

## Installation

```bash
npm add @servicejs/runtime-shared-worker
```

## Usage

### Shared Worker Script

```typescript
import { bootstrap } from '@servicejs/runtime-shared-worker';

const runtime = bootstrap();

// State shared across all tabs
const sharedState = {
  count: 0,
  connectedTabs: 0,
};

// Handle new tab connections
runtime.ports.onConnect((port) => {
  sharedState.connectedTabs++;
  runtime.console.log(`Tab connected. Total: ${sharedState.connectedTabs}`);

  // Send current state to new connection
  runtime.ports.sendToPort(port, {
    type: 'state',
    data: sharedState,
  });

  // Listen for messages from this port
  port.addEventListener('message', (event) => {
    const { type, payload } = event.data;

    if (type === 'increment') {
      sharedState.count++;

      // Broadcast to all connected tabs
      runtime.ports.broadcast({
        type: 'update',
        count: sharedState.count,
      });
    }
  });

  port.addEventListener('close', () => {
    sharedState.connectedTabs--;
    runtime.console.log(`Tab disconnected. Total: ${sharedState.connectedTabs}`);
  });
});
```

### Main Thread (Multiple Tabs)

```typescript
// Tab 1, Tab 2, Tab 3, etc.
const worker = new SharedWorker(new URL('./shared-worker.ts', import.meta.url), {
  type: 'module',
  name: 'my-shared-worker',
});

worker.port.start();

// Listen for updates from shared worker
worker.port.addEventListener('message', (event) => {
  console.log('Received from shared worker:', event.data);

  if (event.data.type === 'update') {
    document.getElementById('count').textContent = event.data.count;
  }
});

// Send message to shared worker
document.getElementById('increment').addEventListener('click', () => {
  worker.port.postMessage({ type: 'increment' });
});
```

## Capabilities

### Ports Capability

```typescript
// Get all connected ports
const allPorts = runtime.ports.ports; // ReadonlySet<MessagePort>

// Handle new connections
runtime.ports.onConnect((port) => {
  // New tab connected
  port.addEventListener('message', (event) => {
    // Handle messages from this port
  });
});

// Broadcast to all connected tabs
runtime.ports.broadcast({ type: 'notification', message: 'Hello all tabs!' });

// Send to specific port
runtime.ports.sendToPort(specificPort, { type: 'private', data: 'For you only' });
```

## Use Cases

- **Cross-tab state synchronization**: Share state across browser tabs
- **Real-time collaboration**: Multiple users in same browser
- **Resource pooling**: Share expensive resources (WebSocket, database)
- **Background sync**: Coordinate background operations across tabs

## License

MIT
