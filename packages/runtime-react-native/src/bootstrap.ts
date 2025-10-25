// React Native runtime bootstrap
import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';
import type {
  ReactNativeRuntimeCapabilities,
  ReactNativeBootstrapOptions,
  StorageError,
  HTTPError,
  TimeError,
  TimerHandle,
  ScaleSize,
  NetInfoState,
  NetworkError,
} from './types';

// Import React Native modules
// Note: These imports will be resolved by React Native's Metro bundler
declare const __DEV__: boolean | undefined;

export function bootstrap(options: ReactNativeBootstrapOptions = {}): ReactNativeRuntimeCapabilities {
  const { captureUncaughtErrors = true, captureUnhandledRejections = true, enableNetInfo = false } = options;

  // Environment capability (limited in React Native)
  const env = {
    get: (_name: string) => {
      // React Native doesn't have process.env by default
      // Would need react-native-dotenv or similar
      return none();
    },
    getAll: () => Object.freeze({}),
    platform: () => 'react-native' as const,
  };

  // Time capability
  const time = {
    now: () => Date.now(),
    highResolutionTime: () => {
      if (typeof performance !== 'undefined' && performance.now) {
        return some(performance.now());
      }
      return none();
    },
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

  // Lifecycle capability (AppState-based)
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
    debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
  };

  // HTTP capability (using fetch)
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

  // Crypto capability (using crypto.randomUUID if available, fallback to manual)
  const cryptoCapability = {
    randomUUID: () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback implementation
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
      // Fallback: use Math.random (not cryptographically secure)
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };

  // Storage capability (using AsyncStorage)
  // Note: Requires @react-native-async-storage/async-storage
  // This is a stub implementation - actual implementation would import AsyncStorage
  const storage = {
    async getItem(_key: string) {
      try {
        // const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        // const value = await AsyncStorage.getItem(key);
        // return ok(value);
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async setItem(_key: string, _value: string) {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async removeItem(_key: string) {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async getAllKeys() {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async clear() {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async multiGet(_keys: readonly string[]) {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async multiSet(_keyValuePairs: ReadonlyArray<readonly [string, string]>) {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
    async multiRemove(_keys: readonly string[]) {
      try {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: 'AsyncStorage not available - install @react-native-async-storage/async-storage',
        };
        return err(storageError);
      } catch (error: any) {
        const storageError: StorageError = {
          code: 'STORAGE_ERROR',
          message: error.message,
        };
        return err(storageError);
      }
    },
  };

  // Platform capability (stub - would import from react-native)
  const platform = {
    OS: 'ios' as const, // Would be Platform.OS
    Version: '0', // Would be Platform.Version
    isTV: false, // Would be Platform.isTV
    isTesting: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
    select: <T>(specifics: { ios?: T; android?: T; native?: T; default: T }): T => {
      // Would use Platform.select()
      return specifics.default;
    },
  };

  // Dimensions capability (stub - would import from react-native)
  const dimensions = {
    get: (_dim: 'window' | 'screen'): ScaleSize => {
      // Would use Dimensions.get(dim)
      return {
        width: 0,
        height: 0,
        scale: 1,
        fontScale: 1,
      };
    },
    addEventListener: (_type: 'change', _handler: (dims: { window: ScaleSize; screen: ScaleSize }) => void) => {
      // Would use Dimensions.addEventListener
      return () => {};
    },
  };

  // AppState capability (stub - would import from react-native)
  const appState = {
    currentState: 'active' as const, // Would be AppState.currentState
    addEventListener: (_type: 'change', _handler: (state: string) => void) => {
      // Would use AppState.addEventListener
      return () => {};
    },
  };

  const capabilities: ReactNativeRuntimeCapabilities = {
    env,
    time,
    lifecycle,
    console: consoleCapability,
    http,
    crypto: cryptoCapability,
    storage,
    platform,
    dimensions,
    appState,
  };

  // Optional NetInfo capability
  if (enableNetInfo) {
    const netInfo = {
      async fetch() {
        try {
          // Would use NetInfo.fetch()
          const networkError: NetworkError = {
            code: 'NETWORK_INFO_ERROR',
            message: 'NetInfo not available - install @react-native-community/netinfo',
          };
          return err(networkError);
        } catch (error: any) {
          const networkError: NetworkError = {
            code: 'NETWORK_INFO_ERROR',
            message: error.message,
          };
          return err(networkError);
        }
      },
      addEventListener: (_handler: (state: NetInfoState) => void) => {
        // Would use NetInfo.addEventListener
        return () => {};
      },
    };
    (capabilities as any).netInfo = netInfo;
  }

  // Error handling setup
  if (captureUncaughtErrors) {
    // Would use ErrorUtils.setGlobalHandler in React Native
  }

  if (captureUnhandledRejections) {
    // React Native doesn't have a direct equivalent
    // Would need to set up promise rejection tracking
  }

  return capabilities;
}
