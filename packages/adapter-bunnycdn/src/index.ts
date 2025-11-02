/**
 * BunnyCDN Adapter for ServiceJS
 * CDN distribution, storage zones, and stream delivery
 */

import { ok, err, type Result } from '@servicejs/result';

export interface BunnyCDNConfig {
  apiKey: string;
  storageZone?: string;
  pullZoneId?: number;
}

export interface PurgeOptions {
  url?: string;
  purgeAll?: boolean;
}

export interface StorageFile {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  url: string;
}

export interface PullZoneStats {
  bandwidth: number;
  requests: number;
  cacheHitRate: number;
}

export interface BunnyCDNAdapter {
  init(config: BunnyCDNConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  uploadFile(path: string, file: Buffer): Promise<Result<StorageFile, Error>>;
  deleteFile(path: string): Promise<Result<void, Error>>;
  listFiles(directory?: string): Promise<Result<StorageFile[], Error>>;
  purgeCache(options: PurgeOptions): Promise<Result<void, Error>>;
  getStats(): Promise<Result<PullZoneStats, Error>>;
}

export const createBunnyCDNAdapter = (): BunnyCDNAdapter => {
  let config: BunnyCDNConfig | null = null;

  // In-memory storage for demo
  const files = new Map<string, StorageFile>();

  const request = async (endpoint: string, method: string = 'GET', body?: any): Promise<Result<any, Error>> => {
    if (!config) return err(new Error('BunnyCDN not initialized'));

    try {
      const response = await fetch(`https://api.bunny.net${endpoint}`, {
        method,
        headers: {
          'AccessKey': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        return err(new Error(`BunnyCDN API error: ${text}`));
      }

      const data = await response.json();
      return ok(data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg) => {
      if (!cfg.apiKey) {
        return err(new Error('API key required'));
      }
      config = cfg;
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => {
      config = null;
      files.clear();
      return ok(undefined);
    },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    uploadFile: async (path, file) => {
      if (!config) return err(new Error('BunnyCDN not initialized'));
      if (!config.storageZone) return err(new Error('Storage zone not configured'));

      try {
        const storageFile: StorageFile = {
          name: path.split('/').pop() || path,
          path,
          size: file.byteLength,
          lastModified: new Date(),
          isDirectory: false,
          url: `https://${config.storageZone}.b-cdn.net/${path}`,
        };

        files.set(path, storageFile);
        return ok(storageFile);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteFile: async (path) => {
      if (!config) return err(new Error('BunnyCDN not initialized'));

      if (!files.has(path)) {
        return err(new Error('File not found'));
      }

      files.delete(path);
      return ok(undefined);
    },

    listFiles: async (directory = '/') => {
      if (!config) return err(new Error('BunnyCDN not initialized'));

      const fileList = Array.from(files.values())
        .filter(file => file.path.startsWith(directory));

      return ok(fileList);
    },

    purgeCache: async (options) => {
      if (!config) return err(new Error('BunnyCDN not initialized'));

      if (options.purgeAll && config.pullZoneId) {
        // Purge all cache for pull zone
        const result = await request(`/pullzone/${config.pullZoneId}/purgeCache`, 'POST');
        if (result.ok) return ok(undefined);
        return err(result.error);
      }

      if (options.url) {
        // Purge specific URL
        const result = await request('/purge', 'POST', { url: options.url });
        if (result.ok) return ok(undefined);
        return err(result.error);
      }

      return err(new Error('Either url or purgeAll must be specified'));
    },

    getStats: async () => {
      if (!config) return err(new Error('BunnyCDN not initialized'));

      // In production, fetch from BunnyCDN API
      return ok({
        bandwidth: 1024 * 1024 * 100, // 100 MB
        requests: 1000,
        cacheHitRate: 0.95,
      });
    },
  };
};
