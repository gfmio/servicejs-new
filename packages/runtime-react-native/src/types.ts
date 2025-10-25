import type { Result } from '@servicejs/result';
import type { Option } from '@servicejs/option';

// Environment capability
export interface EnvironmentCapability {
  get(name: string): Option<string>;
  getAll(): Readonly<Record<string, string | undefined>>;
  platform(): 'react-native';
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

// HTTP capability
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

// Storage capability (AsyncStorage)
export interface StorageCapability {
  getItem(key: string): Promise<Result<string | null, StorageError>>;
  setItem(key: string, value: string): Promise<Result<void, StorageError>>;
  removeItem(key: string): Promise<Result<void, StorageError>>;
  getAllKeys(): Promise<Result<readonly string[], StorageError>>;
  clear(): Promise<Result<void, StorageError>>;
  multiGet(keys: readonly string[]): Promise<Result<ReadonlyArray<readonly [string, string | null]>, StorageError>>;
  multiSet(keyValuePairs: ReadonlyArray<readonly [string, string]>): Promise<Result<void, StorageError>>;
  multiRemove(keys: readonly string[]): Promise<Result<void, StorageError>>;
}

export interface StorageError {
  readonly code: 'STORAGE_ERROR';
  readonly message: string;
}

// Platform capability (React Native specific APIs)
export interface PlatformCapability {
  readonly OS: 'ios' | 'android' | 'windows' | 'macos' | 'web';
  readonly Version: string | number;
  readonly isTV: boolean;
  readonly isTesting: boolean;
  select<T>(specifics: { ios?: T; android?: T; native?: T; default: T }): T;
}

// Dimensions capability
export interface DimensionsCapability {
  get(dim: 'window' | 'screen'): ScaleSize;
  addEventListener(type: 'change', handler: (dims: { window: ScaleSize; screen: ScaleSize }) => void): () => void;
}

export interface ScaleSize {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly fontScale: number;
}

// AppState capability
export interface AppStateCapability {
  readonly currentState: 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
  addEventListener(type: 'change', handler: (state: string) => void): () => void;
}

// NetInfo capability
export interface NetInfoCapability {
  fetch(): Promise<Result<NetInfoState, NetworkError>>;
  addEventListener(handler: (state: NetInfoState) => void): () => void;
}

export interface NetInfoState {
  readonly type: string;
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
  readonly details: any;
}

export interface NetworkError {
  readonly code: 'NETWORK_INFO_ERROR';
  readonly message: string;
}

// React Native runtime capabilities
export interface ReactNativeRuntimeCapabilities {
  readonly env: EnvironmentCapability;
  readonly time: TimeCapability;
  readonly lifecycle: LifecycleCapability;
  readonly console: ConsoleCapability;
  readonly http: HTTPCapability;
  readonly crypto: CryptoCapability;
  readonly storage: StorageCapability;
  readonly platform: PlatformCapability;
  readonly dimensions: DimensionsCapability;
  readonly appState: AppStateCapability;
  readonly netInfo?: NetInfoCapability; // Optional - requires @react-native-community/netinfo
}

// Bootstrap options
export interface ReactNativeBootstrapOptions {
  readonly captureUncaughtErrors?: boolean;
  readonly captureUnhandledRejections?: boolean;
  readonly enableNetInfo?: boolean; // Enable NetInfo capability if available
}
