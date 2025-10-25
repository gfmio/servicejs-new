# @servicejs/runtime-tauri

Tauri runtime capabilities for ServiceJS - capability-based access to Tauri platform APIs for building secure, lightweight desktop applications.

## Features

- **Cross-Platform Desktop**: Windows, macOS, Linux support via Tauri
- **Filesystem Access**: Secure file operations with capability-based permissions
- **Native Dialogs**: File picker, save dialog, and message boxes
- **Window Management**: Create and control application windows
- **System Integration**: Shell operations, clipboard, notifications
- **Path Utilities**: Platform-specific directory access (app data, config, etc.)
- **Event System**: Application-wide event bus
- **Type-Safe**: Full TypeScript support with strict typing
- **Result Types**: All fallible operations return `Result<T, E>`

## Installation

```bash
npm install @servicejs/runtime-tauri
```

### Peer Dependencies

This package requires Tauri:

```bash
npm install @tauri-apps/api
```

### Optional Plugins

For full functionality, install these Tauri plugins:

```bash
# Filesystem operations
npm install @tauri-apps/plugin-fs

# Dialogs
npm install @tauri-apps/plugin-dialog

# Shell integration
npm install @tauri-apps/plugin-shell

# Notifications
npm install @tauri-apps/plugin-notification

# Clipboard
npm install @tauri-apps/plugin-clipboard-manager

# OS information
npm install @tauri-apps/plugin-os
```

## Usage

### Basic Bootstrap

```typescript
import { bootstrap } from '@servicejs/runtime-tauri';

// Bootstrap the runtime
const runtime = bootstrap();

// Access capabilities
runtime.console.log('Hello from Tauri!');
```

### With Options

```typescript
const runtime = bootstrap({
  captureUncaughtErrors: true,
  captureUnhandledRejections: true,
});
```

## Capabilities

### Filesystem

```typescript
const { fs } = runtime;

// Read text file
const readResult = await fs.readTextFile('/path/to/file.txt');
if (readResult.ok) {
  console.log('Content:', readResult.value);
}

// Read binary file
const binaryResult = await fs.readBinaryFile('/path/to/image.png');
if (binaryResult.ok) {
  const data: Uint8Array = binaryResult.value;
}

// Write text file
await fs.writeTextFile('/path/to/file.txt', 'Hello, Tauri!');

// Write binary file
const buffer = new Uint8Array([1, 2, 3, 4]);
await fs.writeBinaryFile('/path/to/data.bin', buffer);

// Check if file exists
const existsResult = await fs.exists('/path/to/file.txt');
if (existsResult.ok && existsResult.value) {
  console.log('File exists');
}

// Create directory
await fs.createDir('/path/to/dir', { recursive: true });

// Read directory
const entriesResult = await fs.readDir('/path/to/dir');
if (entriesResult.ok) {
  for (const entry of entriesResult.value) {
    console.log('Entry:', entry.path, entry.name);
  }
}

// File operations
await fs.copyFile('/source.txt', '/destination.txt');
await fs.renameFile('/old.txt', '/new.txt');
await fs.removeFile('/path/to/file.txt');
await fs.removeDir('/path/to/dir', { recursive: true });
```

### Path Utilities

```typescript
const { path } = runtime;

// Get platform-specific directories
const appConfigResult = await path.appConfigDir();
if (appConfigResult.ok) {
  console.log('App config dir:', appConfigResult.value);
}

const appDataResult = await path.appDataDir();
const cacheResult = await path.appCacheDir();
const logResult = await path.appLogDir();

// User directories
const homeResult = await path.homeDir();
const documentsResult = await path.documentDir();
const downloadsResult = await path.downloadDir();
const desktopResult = await path.desktopDir();
const picturesResult = await path.pictureDir();

// Path manipulation
const joinResult = await path.join('path', 'to', 'file.txt');
const resolveResult = await path.resolve('..', 'file.txt');
const dirnameResult = await path.dirname('/path/to/file.txt');
const basenameResult = await path.basename('/path/to/file.txt', '.txt');
```

### Dialogs

```typescript
const { dialog } = runtime;

// Open file dialog
const openResult = await dialog.open({
  title: 'Select a file',
  filters: [
    { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
    { name: 'All Files', extensions: ['*'] },
  ],
  multiple: false,
});

if (openResult.ok && openResult.value) {
  const filePath = openResult.value; // string or null
  console.log('Selected file:', filePath);
}

// Open multiple files
const multiResult = await dialog.open({
  title: 'Select files',
  multiple: true,
});

if (multiResult.ok && multiResult.value) {
  const filePaths = multiResult.value; // string[] or null
  console.log('Selected files:', filePaths);
}

// Open directory
const dirResult = await dialog.open({
  title: 'Select a directory',
  directory: true,
});

// Save file dialog
const saveResult = await dialog.save({
  title: 'Save file',
  defaultPath: 'document.txt',
  filters: [{ name: 'Text Files', extensions: ['txt'] }],
});

if (saveResult.ok && saveResult.value) {
  const savePath = saveResult.value; // string or null
  console.log('Save to:', savePath);
}

// Message dialog
await dialog.message('Operation completed successfully', {
  title: 'Success',
  type: 'info',
});

// Ask dialog (Yes/No)
const askResult = await dialog.ask('Do you want to continue?', {
  title: 'Confirm',
  type: 'warning',
});

if (askResult.ok && askResult.value) {
  console.log('User clicked Yes');
}

// Confirm dialog (OK/Cancel)
const confirmResult = await dialog.confirm('Are you sure?', {
  title: 'Confirm Action',
});

if (confirmResult.ok && confirmResult.value) {
  console.log('User confirmed');
}
```

### Window Management

```typescript
const { window } = runtime;

// Get current window
const currentWindow = window.getCurrent();
console.log('Window label:', currentWindow.label);

// Window operations
await currentWindow.setTitle('My Application');
await currentWindow.setSize(800, 600);
await currentWindow.setPosition(100, 100);
await currentWindow.center();
await currentWindow.setFocus();

// Window state
await currentWindow.maximize();
await currentWindow.minimize();
await currentWindow.setFullscreen(true);
await currentWindow.show();
await currentWindow.hide();

// Close window
await currentWindow.close();

// Create new window
const newWindowResult = await window.create('secondary', {
  url: '/secondary.html',
  title: 'Secondary Window',
  width: 600,
  height: 400,
  center: true,
  resizable: true,
  visible: true,
});

if (newWindowResult.ok) {
  const newWindow = newWindowResult.value;
  await newWindow.show();
}

// Get all windows
const allWindows = window.getAll();
console.log('Window count:', allWindows.length);
```

### Events

```typescript
const { event } = runtime;

// Listen to events
const listenResult = await event.listen<string>('custom-event', (payload) => {
  console.log('Received event:', payload);
});

if (listenResult.ok) {
  const unlisten = listenResult.value; // Function to stop listening
  // Later: unlisten();
}

// Listen once
const onceResult = await event.once<string>('one-time-event', (payload) => {
  console.log('One-time event:', payload);
});

// Emit event
await event.emit('custom-event', { data: 'Hello!' });
```

### Shell Integration

```typescript
const { shell } = runtime;

// Open URL in default browser
await shell.open('https://example.com');

// Open file with default application
await shell.open('/path/to/document.pdf');

// Open directory in file manager
await shell.open('/path/to/directory');
```

### Notifications

```typescript
const { notification } = runtime;

// Check permission
const permissionResult = await notification.isPermissionGranted();
if (permissionResult.ok && !permissionResult.value) {
  // Request permission
  await notification.requestPermission();
}

// Send notification
await notification.sendNotification({
  title: 'Hello from Tauri!',
  body: 'This is a notification',
  icon: '/icon.png',
});
```

### Clipboard

```typescript
const { clipboard } = runtime;

// Write text to clipboard
await clipboard.writeText('Hello, clipboard!');

// Read text from clipboard
const readResult = await clipboard.readText();
if (readResult.ok) {
  console.log('Clipboard content:', readResult.value);
}
```

### HTTP Requests

```typescript
const { http } = runtime;

const result = await http.fetch('https://api.example.com/data');

if (result.ok) {
  const response = result.value;
  const data = await response.json();
  console.log('Data:', data);
} else {
  console.error('HTTP error:', result.error.code, result.error.message);
}
```

### Timers

```typescript
const { time } = runtime;

// Current timestamp
const now = time.now();

// High-resolution time
const hrTime = time.highResolutionTime();
if (hrTime.some) {
  console.log('Performance.now:', hrTime.value);
}

// setTimeout
const timeoutResult = time.setTimeout(() => {
  console.log('Timeout fired');
}, 1000);

if (timeoutResult.ok) {
  const handle = timeoutResult.value;
  // Cancel if needed
  time.clearTimeout(handle);
}

// setInterval
const intervalResult = time.setInterval(() => {
  console.log('Interval tick');
}, 1000);
```

### Lifecycle Management

```typescript
const { lifecycle } = runtime;

// Register shutdown handler
const unregister = lifecycle.onShutdown(async () => {
  console.log('App shutting down');
  await saveApplicationState();
});

// Manually trigger shutdown
await lifecycle.shutdown();
```

### Crypto

```typescript
const { crypto } = runtime;

// Generate UUID
const id = crypto.randomUUID();
console.log('UUID:', id);

// Generate random bytes
const buffer = new Uint8Array(32);
crypto.getRandomValues(buffer);
```

## Type Safety

All capabilities are fully typed:

```typescript
import type { TauriRuntimeCapabilities } from '@servicejs/runtime-tauri';

function setupApp(runtime: TauriRuntimeCapabilities) {
  // Full type safety
  runtime.fs.readTextFile('/path'); // Promise<Result<string, FilesystemError>>
  runtime.dialog.open({ multiple: true }); // Promise<Result<string | string[] | null, DialogError>>
}
```

## Error Handling

All fallible operations return `Result<T, E>`:

```typescript
const result = await runtime.fs.readTextFile('/path/to/file.txt');

if (result.ok) {
  // Success
  const content: string = result.value;
} else {
  // Error
  const error = result.error;
  console.error(error.code); // 'NOT_FOUND' | 'PERMISSION_DENIED' | 'IO_ERROR'
  console.error(error.message);
}
```

## Example: Complete Tauri App

```typescript
import { bootstrap } from '@servicejs/runtime-tauri';

const runtime = bootstrap();

async function main() {
  const { window, fs, path, dialog } = runtime;

  // Set window title
  const currentWindow = window.getCurrent();
  await currentWindow.setTitle('My Tauri App');

  // Get app data directory
  const appDataResult = await path.appDataDir();
  if (!appDataResult.ok) {
    console.error('Failed to get app data dir');
    return;
  }

  const appDataDir = appDataResult.value;
  const configPath = await path.join(appDataDir, 'config.json');

  // Read config
  const configResult = await fs.readTextFile(configPath.value!);
  let config = {};

  if (configResult.ok) {
    config = JSON.parse(configResult.value);
  } else {
    // Create default config
    config = { theme: 'light', language: 'en' };
    const configJson = JSON.stringify(config, null, 2);
    await fs.writeTextFile(configPath.value!, configJson);
  }

  console.log('App started with config:', config);
}

main();
```

## Notes

- **Capabilities**: Tauri uses a capability-based security model - ensure required capabilities are configured in `tauri.conf.json`
- **Plugins**: Most functionality requires Tauri plugins to be installed and configured
- **Sandboxing**: File system access is sandboxed - use path helpers to access allowed directories
- **Platform Differences**: Some features may behave differently on Windows, macOS, and Linux
- **CSP**: Content Security Policy may restrict some operations in web views

## License

MIT
