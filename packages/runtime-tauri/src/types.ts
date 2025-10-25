import type { Result } from '@servicejs/result';
import type { Option } from '@servicejs/option';

// Environment capability
export interface EnvironmentCapability {
  get(name: string): Promise<Result<Option<string>, EnvironmentError>>;
  getAll(): Readonly<Record<string, string | undefined>>;
  platform(): 'tauri';
}

export interface EnvironmentError {
  readonly code: 'ENV_ERROR';
  readonly message: string;
}

// Time capability
export interface TimeCapability {
  now(): number;
  highResolutionTime(): Option<number>;
  setTimeout(callback: () => void, ms: number): Result<TimerHandle, TimeError>;
  clearTimeout(handle: TimerHandle): Result<void, TimeError>;
  setInterval(callback: () => void, ms: number): Result<TimerHandle, TimeError>;
  clearInterval(handle: TimerHandle): Result<void, TimeError>;
}

export type TimerHandle = number;

export interface TimeError {
  readonly code: 'INVALID_HANDLE' | 'TIMER_FAILED';
  readonly message: string;
}

// Lifecycle capability
export interface LifecycleCapability {
  onShutdown(handler: () => void | Promise<void>): () => void;
  shutdown(): Promise<void>;
}

// Console capability
export interface ConsoleCapability {
  log(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
}

// HTTP capability (using Tauri's http plugin)
export interface HTTPCapability {
  fetch(url: string, options?: RequestInit): Promise<Result<Response, HTTPError>>;
}

export interface HTTPError {
  readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_URL';
  readonly message: string;
}

// Crypto capability
export interface CryptoCapability {
  randomUUID(): string;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

// Filesystem capability (Tauri fs plugin)
export interface FilesystemCapability {
  readTextFile(path: string): Promise<Result<string, FilesystemError>>;
  readBinaryFile(path: string): Promise<Result<Uint8Array, FilesystemError>>;
  writeTextFile(path: string, contents: string): Promise<Result<void, FilesystemError>>;
  writeBinaryFile(path: string, contents: Uint8Array): Promise<Result<void, FilesystemError>>;
  exists(path: string): Promise<Result<boolean, FilesystemError>>;
  createDir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FilesystemError>>;
  readDir(path: string, options?: { recursive?: boolean }): Promise<Result<readonly FileEntry[], FilesystemError>>;
  removeFile(path: string): Promise<Result<void, FilesystemError>>;
  removeDir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FilesystemError>>;
  copyFile(source: string, destination: string): Promise<Result<void, FilesystemError>>;
  renameFile(oldPath: string, newPath: string): Promise<Result<void, FilesystemError>>;
}

export interface FileEntry {
  readonly path: string;
  readonly name?: string;
  readonly children?: readonly FileEntry[];
}

export interface FilesystemError {
  readonly code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'ALREADY_EXISTS' | 'IO_ERROR';
  readonly message: string;
}

// Path capability (Tauri path plugin)
export interface PathCapability {
  appConfigDir(): Promise<Result<string, PathError>>;
  appDataDir(): Promise<Result<string, PathError>>;
  appLocalDataDir(): Promise<Result<string, PathError>>;
  appCacheDir(): Promise<Result<string, PathError>>;
  appLogDir(): Promise<Result<string, PathError>>;
  audioDir(): Promise<Result<string, PathError>>;
  cacheDir(): Promise<Result<string, PathError>>;
  configDir(): Promise<Result<string, PathError>>;
  dataDir(): Promise<Result<string, PathError>>;
  desktopDir(): Promise<Result<string, PathError>>;
  documentDir(): Promise<Result<string, PathError>>;
  downloadDir(): Promise<Result<string, PathError>>;
  homeDir(): Promise<Result<string, PathError>>;
  pictureDir(): Promise<Result<string, PathError>>;
  publicDir(): Promise<Result<string, PathError>>;
  runtimeDir(): Promise<Result<string, PathError>>;
  tempDir(): Promise<Result<string, PathError>>;
  videoDir(): Promise<Result<string, PathError>>;
  resolve(...paths: string[]): Promise<Result<string, PathError>>;
  normalize(path: string): Promise<Result<string, PathError>>;
  join(...paths: string[]): Promise<Result<string, PathError>>;
  dirname(path: string): Promise<Result<string, PathError>>;
  basename(path: string, ext?: string): Promise<Result<string, PathError>>;
}

export interface PathError {
  readonly code: 'PATH_ERROR';
  readonly message: string;
}

// Dialog capability (Tauri dialog plugin)
export interface DialogCapability {
  open(options?: OpenDialogOptions): Promise<Result<string | string[] | null, DialogError>>;
  save(options?: SaveDialogOptions): Promise<Result<string | null, DialogError>>;
  message(message: string, options?: MessageDialogOptions): Promise<Result<void, DialogError>>;
  ask(message: string, options?: MessageDialogOptions): Promise<Result<boolean, DialogError>>;
  confirm(message: string, options?: MessageDialogOptions): Promise<Result<boolean, DialogError>>;
}

export interface OpenDialogOptions {
  readonly title?: string;
  readonly defaultPath?: string;
  readonly filters?: ReadonlyArray<{ name: string; extensions: readonly string[] }>;
  readonly directory?: boolean;
  readonly multiple?: boolean;
  readonly recursive?: boolean;
}

export interface SaveDialogOptions {
  readonly title?: string;
  readonly defaultPath?: string;
  readonly filters?: ReadonlyArray<{ name: string; extensions: readonly string[] }>;
}

export interface MessageDialogOptions {
  readonly title?: string;
  readonly type?: 'info' | 'warning' | 'error';
}

export interface DialogError {
  readonly code: 'DIALOG_ERROR' | 'CANCELLED';
  readonly message: string;
}

// Shell capability (Tauri shell plugin)
export interface ShellCapability {
  open(path: string): Promise<Result<void, ShellError>>;
}

export interface ShellError {
  readonly code: 'SHELL_ERROR';
  readonly message: string;
}

// Window capability (Tauri window API)
export interface WindowCapability {
  getCurrent(): WindowHandle;
  getAll(): readonly WindowHandle[];
  create(label: string, options?: WindowOptions): Promise<Result<WindowHandle, WindowError>>;
}

export interface WindowHandle {
  readonly label: string;
  close(): Promise<Result<void, WindowError>>;
  hide(): Promise<Result<void, WindowError>>;
  show(): Promise<Result<void, WindowError>>;
  maximize(): Promise<Result<void, WindowError>>;
  minimize(): Promise<Result<void, WindowError>>;
  unmaximize(): Promise<Result<void, WindowError>>;
  unminimize(): Promise<Result<void, WindowError>>;
  setTitle(title: string): Promise<Result<void, WindowError>>;
  setSize(width: number, height: number): Promise<Result<void, WindowError>>;
  setPosition(x: number, y: number): Promise<Result<void, WindowError>>;
  setFullscreen(fullscreen: boolean): Promise<Result<void, WindowError>>;
  setFocus(): Promise<Result<void, WindowError>>;
  center(): Promise<Result<void, WindowError>>;
}

export interface WindowOptions {
  readonly url?: string;
  readonly width?: number;
  readonly height?: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly maxWidth?: number;
  readonly maxHeight?: number;
  readonly resizable?: boolean;
  readonly title?: string;
  readonly fullscreen?: boolean;
  readonly focus?: boolean;
  readonly transparent?: boolean;
  readonly maximized?: boolean;
  readonly visible?: boolean;
  readonly decorations?: boolean;
  readonly alwaysOnTop?: boolean;
  readonly center?: boolean;
}

export interface WindowError {
  readonly code: 'WINDOW_ERROR';
  readonly message: string;
}

// Event capability (Tauri event system)
export interface EventCapability {
  listen<T = any>(event: string, handler: (payload: T) => void): Promise<Result<UnlistenFn, EventError>>;
  once<T = any>(event: string, handler: (payload: T) => void): Promise<Result<UnlistenFn, EventError>>;
  emit(event: string, payload?: any): Promise<Result<void, EventError>>;
}

export type UnlistenFn = () => void;

export interface EventError {
  readonly code: 'EVENT_ERROR';
  readonly message: string;
}

// Notification capability (Tauri notification plugin)
export interface NotificationCapability {
  requestPermission(): Promise<Result<'granted' | 'denied' | 'default', NotificationError>>;
  isPermissionGranted(): Promise<Result<boolean, NotificationError>>;
  sendNotification(options: NotificationOptions): Promise<Result<void, NotificationError>>;
}

export interface NotificationOptions {
  readonly title: string;
  readonly body?: string;
  readonly icon?: string;
}

export interface NotificationError {
  readonly code: 'NOTIFICATION_ERROR' | 'PERMISSION_DENIED';
  readonly message: string;
}

// Clipboard capability (Tauri clipboard plugin)
export interface ClipboardCapability {
  writeText(text: string): Promise<Result<void, ClipboardError>>;
  readText(): Promise<Result<string, ClipboardError>>;
}

export interface ClipboardError {
  readonly code: 'CLIPBOARD_ERROR';
  readonly message: string;
}

// Tauri runtime capabilities
export interface TauriRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly fs: FilesystemCapability;
  readonly path: PathCapability;
  readonly dialog: DialogCapability;
  readonly shell: ShellCapability;
  readonly window: WindowCapability;
  readonly event: EventCapability;
  readonly notification: NotificationCapability;
  readonly clipboard: ClipboardCapability;
}

// Bootstrap options
export interface TauriBootstrapOptions {
  readonly captureUncaughtErrors?: boolean;
  readonly captureUnhandledRejections?: boolean;
}
