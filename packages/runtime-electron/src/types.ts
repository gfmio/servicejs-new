import type { Result } from '@servicejs/result';
import type { Option } from '@servicejs/option';

// Environment capability
export interface EnvironmentCapability {
  get(name: string): Option<string>;
  getAll(): Readonly<Record<string, string | undefined>>;
  platform(): 'electron-main' | 'electron-renderer' | 'electron-preload';
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

export type TimerHandle = number | NodeJS.Timeout;

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

// Filesystem capability (Node.js based)
export interface FilesystemCapability {
  readFile(path: string): Promise<Result<Uint8Array, FilesystemError>>;
  writeFile(path: string, data: Uint8Array | string): Promise<Result<void, FilesystemError>>;
  exists(path: string): Promise<Result<boolean, FilesystemError>>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FilesystemError>>;
  readdir(path: string): Promise<Result<readonly string[], FilesystemError>>;
  stat(path: string): Promise<Result<FileStats, FilesystemError>>;
  unlink(path: string): Promise<Result<void, FilesystemError>>;
  rmdir(path: string, options?: { recursive?: boolean }): Promise<Result<void, FilesystemError>>;
}

export interface FileStats {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly size: number;
  readonly mtime: Date;
  readonly ctime: Date;
}

export interface FilesystemError {
  readonly code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'ALREADY_EXISTS' | 'IO_ERROR';
  readonly message: string;
}

// HTTP capability
export interface HTTPCapability {
  fetch(url: string, options?: RequestInit): Promise<Result<Response, HTTPError>>;
}

export interface HTTPError {
  readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_URL';
  readonly message: string;
}

// Crypto capability (Node.js based)
export interface CryptoCapability {
  randomUUID(): string;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  createHash(algorithm: string, data: Uint8Array): Promise<Result<Uint8Array, CryptoError>>;
}

export interface CryptoError {
  readonly code: 'UNSUPPORTED_ALGORITHM' | 'CRYPTO_ERROR';
  readonly message: string;
}

// Process capability
export interface ElectronProcessCapability {
  readonly pid: number;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly platform: string;
  readonly arch: string;
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
  readonly type: 'browser' | 'renderer' | 'worker';
  exit(code: number): never;
  chdir(directory: string): Result<void, ProcessError>;
}

export interface ProcessError {
  readonly code: 'INVALID_DIRECTORY' | 'PERMISSION_DENIED';
  readonly message: string;
}

// IPC capability (Electron specific)
export interface IPCCapability {
  // Main process
  on?(channel: string, listener: (event: any, ...args: any[]) => void): () => void;
  handle?(channel: string, handler: (event: any, ...args: any[]) => Promise<any> | any): () => void;
  send?(webContentsId: number, channel: string, ...args: any[]): Result<void, IPCError>;

  // Renderer process
  invoke?(channel: string, ...args: any[]): Promise<Result<any, IPCError>>;
  sendToHost?(channel: string, ...args: any[]): Result<void, IPCError>;
  sendSync?(channel: string, ...args: any[]): Result<any, IPCError>;
}

export interface IPCError {
  readonly code: 'IPC_FAILED' | 'INVALID_CHANNEL' | 'NO_RESPONSE';
  readonly message: string;
}

// Window capability (Main process only)
export interface WindowCapability {
  create(options: WindowOptions): Result<WindowHandle, WindowError>;
  close(handle: WindowHandle): Result<void, WindowError>;
  focus(handle: WindowHandle): Result<void, WindowError>;
  show(handle: WindowHandle): Result<void, WindowError>;
  hide(handle: WindowHandle): Result<void, WindowError>;
  maximize(handle: WindowHandle): Result<void, WindowError>;
  minimize(handle: WindowHandle): Result<void, WindowError>;
  setTitle(handle: WindowHandle, title: string): Result<void, WindowError>;
  loadURL(handle: WindowHandle, url: string): Result<void, WindowError>;
}

export interface WindowOptions {
  readonly width?: number;
  readonly height?: number;
  readonly title?: string;
  readonly frame?: boolean;
  readonly transparent?: boolean;
}

export type WindowHandle = number; // WebContents ID

export interface WindowError {
  readonly code: 'WINDOW_ERROR' | 'INVALID_HANDLE';
  readonly message: string;
}

// Shell capability (Electron shell API)
export interface ShellCapability {
  openExternal(url: string): Promise<Result<void, ShellError>>;
  openPath(path: string): Promise<Result<string, ShellError>>; // Returns error string if failed
  showItemInFolder(path: string): Result<void, ShellError>;
  trashItem(path: string): Promise<Result<void, ShellError>>;
}

export interface ShellError {
  readonly code: 'SHELL_ERROR';
  readonly message: string;
}

// Dialog capability (Electron dialog API)
export interface DialogCapability {
  showOpenDialog(options: OpenDialogOptions): Promise<Result<readonly string[], DialogError>>;
  showSaveDialog(options: SaveDialogOptions): Promise<Result<string | undefined, DialogError>>;
  showMessageBox(options: MessageBoxOptions): Promise<Result<MessageBoxResult, DialogError>>;
}

export interface OpenDialogOptions {
  readonly title?: string;
  readonly defaultPath?: string;
  readonly buttonLabel?: string;
  readonly filters?: ReadonlyArray<{ name: string; extensions: readonly string[] }>;
  readonly properties?: ReadonlyArray<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface SaveDialogOptions {
  readonly title?: string;
  readonly defaultPath?: string;
  readonly buttonLabel?: string;
  readonly filters?: ReadonlyArray<{ name: string; extensions: readonly string[] }>;
}

export interface MessageBoxOptions {
  readonly type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  readonly title?: string;
  readonly message: string;
  readonly detail?: string;
  readonly buttons?: readonly string[];
}

export interface MessageBoxResult {
  readonly response: number; // Index of clicked button
}

export interface DialogError {
  readonly code: 'DIALOG_ERROR' | 'CANCELLED';
  readonly message: string;
}

// Electron runtime capabilities (varies by process type)
export interface ElectronMainRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly fs: FilesystemCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly process: ElectronProcessCapability;
  readonly ipc: IPCCapability;
  readonly window: WindowCapability;
  readonly shell: ShellCapability;
  readonly dialog: DialogCapability;
}

export interface ElectronRendererRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly process: ElectronProcessCapability;
  readonly ipc: IPCCapability;
}

export type ElectronRuntimeCapabilities = ElectronMainRuntimeCapabilities | ElectronRendererRuntimeCapabilities;

// Bootstrap options
export interface ElectronBootstrapOptions {
  readonly captureShutdownSignals?: boolean;
  readonly signals?: readonly NodeJS.Signals[];
  readonly captureUncaughtErrors?: boolean;
  readonly captureUnhandledRejections?: boolean;
}
