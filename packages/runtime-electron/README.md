# @servicejs/runtime-electron

Electron runtime capabilities for ServiceJS - capability-based access to Electron APIs in both main and renderer processes.

## Features

- **Multi-Process Support**: Works in main process, renderer process, and preload scripts
- **IPC Communication**: Type-safe inter-process communication
- **Window Management**: Create and control browser windows (main process)
- **File System**: Full Node.js filesystem access (main process)
- **Shell Integration**: Open files and URLs with system apps
- **Dialog APIs**: Native file and message dialogs
- **Type-Safe**: Full TypeScript support with strict typing
- **Result Types**: All fallible operations return `Result<T, E>`

## Installation

```bash
npm install @servicejs/runtime-electron
```

### Peer Dependencies

This package requires Electron:

```bash
npm install electron
```

## Usage

### Main Process

```typescript
import { bootstrap } from '@servicejs/runtime-electron';

// Bootstrap in main process
const runtime = bootstrap();

// Access main-process capabilities
runtime.console.log('Main process started');
runtime.window.create({ width: 800, height: 600, title: 'My App' });
```

### Renderer Process

```typescript
import { bootstrap } from '@servicejs/runtime-electron';

// Bootstrap in renderer process
const runtime = bootstrap();

// Access renderer capabilities
runtime.console.log('Renderer process started');

// Communicate with main process via IPC
const result = await runtime.ipc.invoke?.('get-user-data');
```

### Process Detection

```typescript
const runtime = bootstrap();

// Check process type
const platform = runtime.env.platform();
// 'electron-main' | 'electron-renderer' | 'electron-preload'

// Process information
console.log(runtime.process.type); // 'browser' | 'renderer' | 'worker'
console.log(runtime.process.versions.electron); // Electron version
console.log(runtime.process.versions.chrome); // Chrome version
console.log(runtime.process.versions.node); // Node.js version
```

## Main Process Capabilities

### Window Management

```typescript
const { window } = runtime; // Main process only

// Create window
const result = window.create({
  width: 800,
  height: 600,
  title: 'My Application',
  frame: true,
  transparent: false,
});

if (result.ok) {
  const handle = result.value; // Window handle (WebContents ID)

  // Control window
  window.show(handle);
  window.focus(handle);
  window.maximize(handle);
  window.setTitle(handle, 'New Title');
  window.loadURL(handle, 'https://example.com');

  // Close window
  window.close(handle);
}
```

### IPC (Main Process)

```typescript
const { ipc } = runtime; // Main process

// Listen for messages
const unsubscribe = ipc.on?.('channel-name', (event, ...args) => {
  console.log('Received:', args);
  event.reply('response-channel', 'response data');
});

// Handle async requests
const removeHandler = ipc.handle?.('get-data', async (event, ...args) => {
  const data = await fetchData();
  return data;
});

// Send to specific renderer
const sendResult = ipc.send?.(webContentsId, 'channel-name', 'data');

// Clean up
unsubscribe?.();
removeHandler?.();
```

### File System

```typescript
const { fs } = runtime; // Main process only

// Read file
const readResult = await fs.readFile('/path/to/file.txt');
if (readResult.ok) {
  const data = readResult.value; // Uint8Array
  console.log(new TextDecoder().decode(data));
}

// Write file
const writeResult = await fs.writeFile('/path/to/file.txt', 'content');

// Check existence
const existsResult = await fs.exists('/path/to/file.txt');
if (existsResult.ok && existsResult.value) {
  console.log('File exists');
}

// Directory operations
await fs.mkdir('/path/to/dir', { recursive: true });
const entries = await fs.readdir('/path/to/dir');
if (entries.ok) {
  console.log('Files:', entries.value);
}

// File stats
const statsResult = await fs.stat('/path/to/file.txt');
if (statsResult.ok) {
  const { isFile, isDirectory, size, mtime } = statsResult.value;
  console.log('File size:', size, 'bytes');
}

// Delete
await fs.unlink('/path/to/file.txt');
await fs.rmdir('/path/to/dir', { recursive: true });
```

### Shell Integration

```typescript
const { shell } = runtime; // Main process

// Open URL in default browser
await shell.openExternal('https://example.com');

// Open file with default application
const openResult = await shell.openPath('/path/to/file.pdf');
if (openResult.ok) {
  const error = openResult.value; // Empty string if successful
  if (error) {
    console.error('Failed to open:', error);
  }
}

// Show file in folder
shell.showItemInFolder('/path/to/file.txt');

// Move to trash
await shell.trashItem('/path/to/file.txt');
```

### Dialogs

```typescript
const { dialog } = runtime; // Main process

// Open file dialog
const openResult = await dialog.showOpenDialog({
  title: 'Select Files',
  defaultPath: '/home/user',
  buttonLabel: 'Select',
  filters: [
    { name: 'Images', extensions: ['png', 'jpg', 'gif'] },
    { name: 'All Files', extensions: ['*'] },
  ],
  properties: ['openFile', 'multiSelections'],
});

if (openResult.ok) {
  const filePaths = openResult.value; // string[]
  console.log('Selected:', filePaths);
}

// Save file dialog
const saveResult = await dialog.showSaveDialog({
  title: 'Save File',
  defaultPath: '/home/user/document.txt',
  filters: [{ name: 'Text Files', extensions: ['txt'] }],
});

if (saveResult.ok) {
  const filePath = saveResult.value; // string | undefined
  if (filePath) {
    console.log('Save to:', filePath);
  }
}

// Message box
const msgResult = await dialog.showMessageBox({
  type: 'question',
  title: 'Confirm',
  message: 'Are you sure?',
  detail: 'This action cannot be undone',
  buttons: ['Yes', 'No'],
});

if (msgResult.ok) {
  const buttonIndex = msgResult.value.response;
  if (buttonIndex === 0) {
    console.log('User clicked Yes');
  }
}
```

## Renderer Process Capabilities

### IPC (Renderer Process)

```typescript
const { ipc } = runtime; // Renderer process

// Invoke async request to main process
const result = await ipc.invoke?.('get-user-data', userId);
if (result?.ok) {
  const userData = result.value;
  console.log('User data:', userData);
}

// Send to host (for webviews)
ipc.sendToHost?.('webview-ready');

// Synchronous IPC (avoid if possible - blocks renderer)
const syncResult = ipc.sendSync?.('get-sync-data');
if (syncResult?.ok) {
  console.log('Sync data:', syncResult.value);
}
```

## Common Capabilities (All Processes)

### Environment

```typescript
const { env } = runtime;

// Get environment variable
const pathOption = env.get('PATH');
if (pathOption.some) {
  console.log('PATH:', pathOption.value);
}

// Get all environment variables
const allEnv = env.getAll();
console.log('NODE_ENV:', allEnv.NODE_ENV);
```

### HTTP

```typescript
const { http } = runtime;

const result = await http.fetch('https://api.example.com/data');
if (result.ok) {
  const response = result.value;
  const data = await response.json();
  console.log('Data:', data);
}
```

### Crypto

```typescript
const { crypto } = runtime;

// Generate UUID
const id = crypto.randomUUID();
console.log('UUID:', id);

// Random bytes
const buffer = new Uint8Array(32);
crypto.getRandomValues(buffer);

// Hash data (using Node.js crypto)
const data = new TextEncoder().encode('hello world');
const hashResult = await crypto.createHash('sha256', data);
if (hashResult.ok) {
  const hash = hashResult.value;
  console.log('Hash:', Buffer.from(hash).toString('hex'));
}
```

### Timers

```typescript
const { time } = runtime;

// High-resolution time
const hrTime = time.highResolutionTime();
if (hrTime.some) {
  console.log('Performance.now:', hrTime.value);
}

// setTimeout
const timeoutResult = time.setTimeout(() => {
  console.log('Timeout fired');
}, 1000);

// setInterval
const intervalResult = time.setInterval(() => {
  console.log('Interval tick');
}, 1000);
```

### Lifecycle

```typescript
const { lifecycle } = runtime;

// Register shutdown handler
const unregister = lifecycle.onShutdown(async () => {
  console.log('Application shutting down');
  await saveApplicationState();
});

// Trigger shutdown
await lifecycle.shutdown();
```

## TypeScript Support

All capabilities are fully typed:

```typescript
import type {
  ElectronMainRuntimeCapabilities,
  ElectronRendererRuntimeCapabilities,
} from '@servicejs/runtime-electron';

function setupMain(runtime: ElectronMainRuntimeCapabilities) {
  // Main process capabilities available
  runtime.window.create({ width: 800, height: 600 });
  runtime.fs.readFile('/path/to/file');
}

function setupRenderer(runtime: ElectronRendererRuntimeCapabilities) {
  // Renderer process capabilities available
  runtime.ipc.invoke?.('channel');
  // runtime.window - Not available in renderer
}
```

## Error Handling

All fallible operations return `Result<T, E>`:

```typescript
const result = await runtime.fs.readFile('/path/to/file');

if (result.ok) {
  // Success
  const data: Uint8Array = result.value;
} else {
  // Error
  const error = result.error;
  console.error(error.code); // 'NOT_FOUND' | 'PERMISSION_DENIED' | 'IO_ERROR'
  console.error(error.message);
}
```

## Bootstrap Options

```typescript
const runtime = bootstrap({
  captureShutdownSignals: true, // Handle SIGTERM, SIGINT
  signals: ['SIGTERM', 'SIGINT'], // Which signals to capture
  captureUncaughtErrors: true, // Capture uncaught exceptions
  captureUnhandledRejections: true, // Capture unhandled promise rejections
});
```

## Example: Complete Electron App

### Main Process

```typescript
import { app, BrowserWindow } from 'electron';
import { bootstrap } from '@servicejs/runtime-electron';

const runtime = bootstrap();

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');

  // Handle IPC
  runtime.ipc.handle?.('read-file', async (event, path) => {
    const result = await runtime.fs.readFile(path);
    if (result.ok) {
      return new TextDecoder().decode(result.value);
    }
    throw new Error(result.error.message);
  });
});
```

### Renderer Process

```typescript
import { bootstrap } from '@servicejs/runtime-electron';

const runtime = bootstrap();

async function loadFile(path: string) {
  const result = await runtime.ipc.invoke?.('read-file', path);
  if (result?.ok) {
    return result.value;
  }
  throw new Error('Failed to load file');
}

loadFile('/path/to/file.txt').then((content) => {
  console.log('File content:', content);
});
```

## Notes

- **Process Type**: The runtime automatically detects whether it's running in main, renderer, or preload context
- **IPC Security**: Always validate IPC messages and use context isolation
- **Node Integration**: Renderer process has limited Node.js access by default - use IPC to access main process capabilities
- **Window Management**: Window creation requires importing BrowserWindow from electron (stub implementation provided)
- **Dialog APIs**: Dialog methods require importing dialog from electron (stub implementation provided)

## License

MIT
