// Electron runtime bootstrap - supports both main and renderer processes
import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type {
  ElectronRuntimeCapabilities,
  ElectronMainRuntimeCapabilities,
  ElectronRendererRuntimeCapabilities,
  ElectronBootstrapOptions,
  FilesystemError,
  HTTPError,
  TimeError,
  TimerHandle,
  ProcessError,
  IPCError,
  WindowError,
  ShellError,
  DialogError,
} from './types';

export function bootstrap(options: ElectronBootstrapOptions = {}): ElectronRuntimeCapabilities {
  const { captureShutdownSignals = true, signals = ['SIGTERM', 'SIGINT'] } = options;

  // Detect process type
  const isMainProcess = typeof process !== 'undefined' && (process as any).type === 'browser';
  const isRendererProcess = typeof process !== 'undefined' && (process as any).type === 'renderer';

  // Environment capability
  const env = {
    get: (name: string) => {
      const value = process.env[name];
      return value !== undefined ? some(value) : none();
    },
    getAll: () => Object.freeze({ ...process.env }),
    platform: (): 'electron-main' | 'electron-renderer' | 'electron-preload' => {
      if (isMainProcess) return 'electron-main';
      if (isRendererProcess) return 'electron-renderer';
      return 'electron-preload';
    },
  };

  // Time capability
  const time = {
    now: () => Date.now(),
    highResolutionTime: () => some(performance.now()),
    setTimeout: (callback: () => void, ms: number) => {
      try {
        const handle = setTimeout(callback, ms);
        return ok(handle as TimerHandle);
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
        const handle = setInterval(callback, ms);
        return ok(handle as TimerHandle);
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

  if (captureShutdownSignals) {
    for (const signal of signals) {
      process.on(signal, async () => {
        for (const handler of shutdownHandlers) {
          await handler();
        }
        process.exit(0);
      });
    }
  }

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

  // HTTP capability
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

  // Crypto capability (Node.js crypto)
  const cryptoCapability = {
    randomUUID: () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Node.js fallback
      const { randomUUID } = require('crypto');
      return randomUUID();
    },
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(array as any);
        return array;
      }
      // Node.js fallback
      const { randomFillSync } = require('crypto');
      randomFillSync(array);
      return array;
    },
    createHash: async (algorithm: string, data: Uint8Array) => {
      try {
        const { createHash } = require('crypto');
        const hash = createHash(algorithm);
        hash.update(data);
        const result = new Uint8Array(hash.digest());
        return ok(result);
      } catch (error: any) {
        return err({ code: 'CRYPTO_ERROR' as const, message: error.message });
      }
    },
  };

  // Process capability
  const processCapability = {
    get pid() {
      return process.pid;
    },
    get argv() {
      return Object.freeze([...process.argv]);
    },
    get cwd() {
      return process.cwd();
    },
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get versions() {
      return Object.freeze({
        node: process.versions.node,
        chrome: (process.versions as any)['chrome'] || '',
        electron: (process.versions as any)['electron'] || '',
      });
    },
    get type() {
      return (process as any).type;
    },
    exit(code: number): never {
      process.exit(code);
    },
    chdir(directory: string) {
      try {
        process.chdir(directory);
        return ok(undefined);
      } catch (error: any) {
        const processError: ProcessError = {
          code: error.code === 'ENOENT' ? 'INVALID_DIRECTORY' : 'PERMISSION_DENIED',
          message: error.message,
        };
        return err(processError);
      }
    },
  };

  // Base capabilities (common to all process types)
  const baseCapabilities = {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    http,
    crypto: cryptoCapability,
    process: processCapability,
  };

  // Main process specific capabilities
  if (isMainProcess) {
    // Filesystem capability (main process only)
    const filesystem = {
      async readFile(path: string) {
        try {
          const { readFile } = require('fs/promises');
          const data = await readFile(path);
          return ok(new Uint8Array(data));
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'ENOENT' ? 'NOT_FOUND' : error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
      async writeFile(path: string, data: Uint8Array | string) {
        try {
          const { writeFile } = require('fs/promises');
          await writeFile(path, data);
          return ok(undefined);
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
      async exists(path: string) {
        try {
          const { access } = require('fs/promises');
          await access(path);
          return ok(true);
        } catch {
          return ok(false);
        }
      },
      async mkdir(path: string, options?: { recursive?: boolean }) {
        try {
          const { mkdir } = require('fs/promises');
          await mkdir(path, options);
          return ok(undefined);
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'EEXIST' ? 'ALREADY_EXISTS' : error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
      async readdir(path: string) {
        try {
          const { readdir } = require('fs/promises');
          const entries = await readdir(path);
          return ok(Object.freeze(entries));
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'ENOENT' ? 'NOT_FOUND' : error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
      async stat(path: string) {
        try {
          const { stat } = require('fs/promises');
          const stats = await stat(path);
          return ok({
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            mtime: stats.mtime,
            ctime: stats.ctime,
          });
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'ENOENT' ? 'NOT_FOUND' : error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
      async unlink(path: string) {
        try {
          const { unlink } = require('fs/promises');
          await unlink(path);
          return ok(undefined);
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'ENOENT' ? 'NOT_FOUND' : error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
      async rmdir(path: string, options?: { recursive?: boolean }) {
        try {
          const { rmdir } = require('fs/promises');
          await rmdir(path, options);
          return ok(undefined);
        } catch (error: any) {
          const fsError: FilesystemError = {
            code: error.code === 'ENOENT' ? 'NOT_FOUND' : error.code === 'EACCES' ? 'PERMISSION_DENIED' : 'IO_ERROR',
            message: error.message,
          };
          return err(fsError);
        }
      },
    };

    // IPC capability (main process)
    const ipc = {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
        const { ipcMain } = require('electron');
        ipcMain.on(channel, listener);
        return () => {
          ipcMain.removeListener(channel, listener);
        };
      },
      handle: (channel: string, handler: (event: any, ...args: any[]) => Promise<any> | any) => {
        const { ipcMain } = require('electron');
        ipcMain.handle(channel, handler);
        return () => {
          ipcMain.removeHandler(channel);
        };
      },
      send: (webContentsId: number, channel: string, ...args: any[]) => {
        try {
          const { webContents } = require('electron');
          const wc = webContents.fromId(webContentsId);
          if (!wc) {
            const ipcError: IPCError = {
              code: 'IPC_FAILED',
              message: 'Invalid webContents ID',
            };
            return err(ipcError);
          }
          wc.send(channel, ...args);
          return ok(undefined);
        } catch (error: any) {
          const ipcError: IPCError = {
            code: 'IPC_FAILED',
            message: error.message,
          };
          return err(ipcError);
        }
      },
    };

    // Window capability (main process only) - stub implementation
    const window = {
      create: (_options: any) => {
        const windowError: WindowError = {
          code: 'WINDOW_ERROR',
          message: 'Window creation requires importing BrowserWindow',
        };
        return err(windowError);
      },
      close: (_handle: number) => ok(undefined),
      focus: (_handle: number) => ok(undefined),
      show: (_handle: number) => ok(undefined),
      hide: (_handle: number) => ok(undefined),
      maximize: (_handle: number) => ok(undefined),
      minimize: (_handle: number) => ok(undefined),
      setTitle: (_handle: number, _title: string) => ok(undefined),
      loadURL: (_handle: number, _url: string) => ok(undefined),
    };

    // Shell capability
    const shell = {
      async openExternal(url: string) {
        try {
          const { shell } = require('electron');
          await shell.openExternal(url);
          return ok(undefined);
        } catch (error: any) {
          const shellError: ShellError = {
            code: 'SHELL_ERROR',
            message: error.message,
          };
          return err(shellError);
        }
      },
      async openPath(path: string) {
        try {
          const { shell } = require('electron');
          const result = await shell.openPath(path);
          return ok(result);
        } catch (error: any) {
          const shellError: ShellError = {
            code: 'SHELL_ERROR',
            message: error.message,
          };
          return err(shellError);
        }
      },
      showItemInFolder(path: string) {
        try {
          const { shell } = require('electron');
          shell.showItemInFolder(path);
          return ok(undefined);
        } catch (error: any) {
          const shellError: ShellError = {
            code: 'SHELL_ERROR',
            message: error.message,
          };
          return err(shellError);
        }
      },
      async trashItem(path: string) {
        try {
          const { shell } = require('electron');
          await shell.trashItem(path);
          return ok(undefined);
        } catch (error: any) {
          const shellError: ShellError = {
            code: 'SHELL_ERROR',
            message: error.message,
          };
          return err(shellError);
        }
      },
    };

    // Dialog capability - stub implementation
    const dialog = {
      async showOpenDialog(_options: any) {
        const dialogError: DialogError = {
          code: 'DIALOG_ERROR',
          message: 'Dialog requires importing dialog from electron',
        };
        return err(dialogError);
      },
      async showSaveDialog(_options: any) {
        const dialogError: DialogError = {
          code: 'DIALOG_ERROR',
          message: 'Dialog requires importing dialog from electron',
        };
        return err(dialogError);
      },
      async showMessageBox(_options: any) {
        const dialogError: DialogError = {
          code: 'DIALOG_ERROR',
          message: 'Dialog requires importing dialog from electron',
        };
        return err(dialogError);
      },
    };

    const mainCapabilities: ElectronMainRuntimeCapabilities = {
      ...baseCapabilities,
      fs: filesystem,
      ipc,
      window,
      shell,
      dialog,
    };

    return mainCapabilities;
  }

  // Renderer process capabilities
  if (isRendererProcess) {
    // IPC capability (renderer process)
    const ipc = {
      invoke: async (channel: string, ...args: any[]) => {
        try {
          const { ipcRenderer } = require('electron');
          const result = await ipcRenderer.invoke(channel, ...args);
          return ok(result);
        } catch (error: any) {
          const ipcError: IPCError = {
            code: 'IPC_FAILED',
            message: error.message,
          };
          return err(ipcError);
        }
      },
      sendToHost: (channel: string, ...args: any[]) => {
        try {
          const { ipcRenderer } = require('electron');
          ipcRenderer.sendToHost(channel, ...args);
          return ok(undefined);
        } catch (error: any) {
          const ipcError: IPCError = {
            code: 'IPC_FAILED',
            message: error.message,
          };
          return err(ipcError);
        }
      },
      sendSync: (channel: string, ...args: any[]) => {
        try {
          const { ipcRenderer } = require('electron');
          const result = ipcRenderer.sendSync(channel, ...args);
          return ok(result);
        } catch (error: any) {
          const ipcError: IPCError = {
            code: 'IPC_FAILED',
            message: error.message,
          };
          return err(ipcError);
        }
      },
    };

    const rendererCapabilities: ElectronRendererRuntimeCapabilities = {
      ...baseCapabilities,
      ipc,
    };

    return rendererCapabilities;
  }

  // Fallback for preload or unknown process type
  return baseCapabilities as any;
}
