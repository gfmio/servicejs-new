// Tauri runtime bootstrap
import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type {
  TauriRuntimeCapabilities,
  TauriBootstrapOptions,
  EnvironmentError,
  FilesystemError,
  PathError,
  DialogError,
  ShellError,
  WindowError,
  EventError,
  NotificationError,
  ClipboardError,
  HTTPError,
  TimeError,
  TimerHandle,
} from './types';

export function bootstrap(options: TauriBootstrapOptions = {}): TauriRuntimeCapabilities {
  const { captureUncaughtErrors = true, captureUnhandledRejections = true } = options;

  // Environment capability (note: Tauri env vars are async)
  const env = {
    get: async (_name: string) => {
      try {
        // Would use: const { getEnv } = await import('@tauri-apps/plugin-os');
        // const value = await getEnv(name);
        const envError: EnvironmentError = {
          code: 'ENV_ERROR',
          message: 'Environment access requires @tauri-apps/plugin-os',
        };
        return err(envError);
      } catch (error: any) {
        const envError: EnvironmentError = {
          code: 'ENV_ERROR',
          message: error.message,
        };
        return err(envError);
      }
    },
    getAll: () => Object.freeze({}),
    platform: () => 'tauri' as const,
  };

  // Time capability
  const time = {
    now: () => Date.now(),
    highResolutionTime: () => (typeof performance !== 'undefined' ? some(performance.now()) : none()),
    setTimeout: (callback: () => void, ms: number) => {
      try {
        const handle = setTimeout(callback, ms) as unknown as TimerHandle;
        return ok(handle);
      } catch (error: any) {
        const timeError: TimeError = {
          code: 'TIMER_FAILED',
          message: error.message,
        };
        return err(timeError);
      }
    },
    clearTimeout: (handle: TimerHandle) => {
      try {
        clearTimeout(handle as any);
        return ok(undefined);
      } catch (error: any) {
        const timeError: TimeError = {
          code: 'INVALID_HANDLE',
          message: error.message,
        };
        return err(timeError);
      }
    },
    setInterval: (callback: () => void, ms: number) => {
      try {
        const handle = setInterval(callback, ms) as unknown as TimerHandle;
        return ok(handle);
      } catch (error: any) {
        const timeError: TimeError = {
          code: 'TIMER_FAILED',
          message: error.message,
        };
        return err(timeError);
      }
    },
    clearInterval: (handle: TimerHandle) => {
      try {
        clearInterval(handle as any);
        return ok(undefined);
      } catch (error: any) {
        const timeError: TimeError = {
          code: 'INVALID_HANDLE',
          message: error.message,
        };
        return err(timeError);
      }
    },
  };

  // Lifecycle capability
  const shutdownHandlers: Array<() => void | Promise<void>> = [];

  const lifecycle = {
    onShutdown: (handler: () => void | Promise<void>) => {
      shutdownHandlers.push(handler);
      return () => {
        const index = shutdownHandlers.indexOf(handler);
        if (index !== -1) {
          shutdownHandlers.splice(index, 1);
        }
      };
    },
    shutdown: async () => {
      for (const handler of shutdownHandlers) {
        await handler();
      }
    },
  };

  // Console capability
  const consoleCapability = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  // HTTP capability (uses fetch or Tauri's http plugin)
  const http = {
    fetch: async (url: string, options?: RequestInit) => {
      try {
        const response = await fetch(url, options);
        return ok(response);
      } catch (error: any) {
        const httpError: HTTPError = {
          code: error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: error.message,
        };
        return err(httpError);
      }
    },
  };

  // Crypto capability
  const cryptoCapability = {
    randomUUID: () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return crypto.getRandomValues(array);
      }
      // Fallback
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };

  // Filesystem capability (Tauri fs plugin) - stub implementation
  const filesystem = {
    async readTextFile(_path: string) {
      try {
        // Would use: const { readTextFile } = await import('@tauri-apps/plugin-fs');
        // const contents = await readTextFile(path);
        // return ok(contents);
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async readBinaryFile(_path: string) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async writeTextFile(_path: string, _contents: string) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async writeBinaryFile(_path: string, _contents: Uint8Array) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async exists(_path: string) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async createDir(_path: string, _options?: { recursive?: boolean }) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async readDir(_path: string, _options?: { recursive?: boolean }) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async removeFile(_path: string) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async removeDir(_path: string, _options?: { recursive?: boolean }) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async copyFile(_source: string, _destination: string) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
    async renameFile(_oldPath: string, _newPath: string) {
      try {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: 'Filesystem access requires @tauri-apps/plugin-fs',
        };
        return err(fsError);
      } catch (error: any) {
        const fsError: FilesystemError = {
          code: 'IO_ERROR',
          message: error.message,
        };
        return err(fsError);
      }
    },
  };

  // Path capability (Tauri path plugin) - stub implementation
  const pathCapability = {
    async appConfigDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async appDataDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async appLocalDataDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async appCacheDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async appLogDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async audioDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async cacheDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async configDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async dataDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async desktopDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async documentDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async downloadDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async homeDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async pictureDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async publicDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async runtimeDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async tempDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async videoDir() {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async resolve(..._paths: string[]) {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async normalize(_path: string) {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async join(..._paths: string[]) {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async dirname(_path: string) {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
    async basename(_path: string, _ext?: string) {
      const pathError: PathError = { code: 'PATH_ERROR', message: 'Path access requires @tauri-apps/api' };
      return err(pathError);
    },
  };

  // Dialog capability - stub implementation
  const dialog = {
    async open(_options?: any) {
      const dialogError: DialogError = {
        code: 'DIALOG_ERROR',
        message: 'Dialog access requires @tauri-apps/plugin-dialog',
      };
      return err(dialogError);
    },
    async save(_options?: any) {
      const dialogError: DialogError = {
        code: 'DIALOG_ERROR',
        message: 'Dialog access requires @tauri-apps/plugin-dialog',
      };
      return err(dialogError);
    },
    async message(_message: string, _options?: any) {
      const dialogError: DialogError = {
        code: 'DIALOG_ERROR',
        message: 'Dialog access requires @tauri-apps/plugin-dialog',
      };
      return err(dialogError);
    },
    async ask(_message: string, _options?: any) {
      const dialogError: DialogError = {
        code: 'DIALOG_ERROR',
        message: 'Dialog access requires @tauri-apps/plugin-dialog',
      };
      return err(dialogError);
    },
    async confirm(_message: string, _options?: any) {
      const dialogError: DialogError = {
        code: 'DIALOG_ERROR',
        message: 'Dialog access requires @tauri-apps/plugin-dialog',
      };
      return err(dialogError);
    },
  };

  // Shell capability - stub implementation
  const shell = {
    async open(_path: string) {
      try {
        const shellError: ShellError = {
          code: 'SHELL_ERROR',
          message: 'Shell access requires @tauri-apps/plugin-shell',
        };
        return err(shellError);
      } catch (error: any) {
        const shellError: ShellError = {
          code: 'SHELL_ERROR',
          message: error.message,
        };
        return err(shellError);
      }
    },
  };

  // Window capability - stub implementation
  const windowCapability = {
    getCurrent: () => {
      return {
        label: 'main',
        close: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        hide: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        show: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        maximize: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        minimize: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        unmaximize: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        unminimize: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        setTitle: async (_title: string) => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        setSize: async (_width: number, _height: number) => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        setPosition: async (_x: number, _y: number) => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        setFullscreen: async (_fullscreen: boolean) => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        setFocus: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
        center: async () => err({ code: 'WINDOW_ERROR' as const, message: 'Window API requires @tauri-apps/api' }),
      };
    },
    getAll: () => [],
    async create(_label: string, _options?: any) {
      const windowError: WindowError = {
        code: 'WINDOW_ERROR',
        message: 'Window API requires @tauri-apps/api',
      };
      return err(windowError);
    },
  };

  // Event capability - stub implementation
  const event = {
    async listen<T = any>(_eventName: string, _handler: (_payload: T) => void) {
      try {
        const eventError: EventError = {
          code: 'EVENT_ERROR',
          message: 'Event API requires @tauri-apps/api',
        };
        return err(eventError);
      } catch (error: any) {
        const eventError: EventError = {
          code: 'EVENT_ERROR',
          message: error.message,
        };
        return err(eventError);
      }
    },
    async once<T = any>(_eventName: string, _handler: (_payload: T) => void) {
      try {
        const eventError: EventError = {
          code: 'EVENT_ERROR',
          message: 'Event API requires @tauri-apps/api',
        };
        return err(eventError);
      } catch (error: any) {
        const eventError: EventError = {
          code: 'EVENT_ERROR',
          message: error.message,
        };
        return err(eventError);
      }
    },
    async emit(_eventName: string, _payload?: any) {
      try {
        const eventError: EventError = {
          code: 'EVENT_ERROR',
          message: 'Event API requires @tauri-apps/api',
        };
        return err(eventError);
      } catch (error: any) {
        const eventError: EventError = {
          code: 'EVENT_ERROR',
          message: error.message,
        };
        return err(eventError);
      }
    },
  };

  // Notification capability - stub implementation
  const notification = {
    async requestPermission() {
      const notificationError: NotificationError = {
        code: 'NOTIFICATION_ERROR',
        message: 'Notification API requires @tauri-apps/plugin-notification',
      };
      return err(notificationError);
    },
    async isPermissionGranted() {
      const notificationError: NotificationError = {
        code: 'NOTIFICATION_ERROR',
        message: 'Notification API requires @tauri-apps/plugin-notification',
      };
      return err(notificationError);
    },
    async sendNotification(_options: any) {
      const notificationError: NotificationError = {
        code: 'NOTIFICATION_ERROR',
        message: 'Notification API requires @tauri-apps/plugin-notification',
      };
      return err(notificationError);
    },
  };

  // Clipboard capability - stub implementation
  const clipboard = {
    async writeText(_text: string) {
      try {
        const clipboardError: ClipboardError = {
          code: 'CLIPBOARD_ERROR',
          message: 'Clipboard API requires @tauri-apps/plugin-clipboard-manager',
        };
        return err(clipboardError);
      } catch (error: any) {
        const clipboardError: ClipboardError = {
          code: 'CLIPBOARD_ERROR',
          message: error.message,
        };
        return err(clipboardError);
      }
    },
    async readText() {
      try {
        const clipboardError: ClipboardError = {
          code: 'CLIPBOARD_ERROR',
          message: 'Clipboard API requires @tauri-apps/plugin-clipboard-manager',
        };
        return err(clipboardError);
      } catch (error: any) {
        const clipboardError: ClipboardError = {
          code: 'CLIPBOARD_ERROR',
          message: error.message,
        };
        return err(clipboardError);
      }
    },
  };

  // Error handling setup
  if (captureUncaughtErrors && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
    });
  }

  if (captureUnhandledRejections && typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled rejection:', event.reason);
    });
  }

  return {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    http,
    crypto: cryptoCapability,
    fs: filesystem,
    path: pathCapability,
    dialog,
    shell,
    window: windowCapability,
    event,
    notification,
    clipboard,
  };
}
