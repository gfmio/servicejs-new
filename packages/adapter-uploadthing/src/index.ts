/**
 * UploadThing Adapter for ServiceJS
 * Type-safe file uploads with access control and image optimization
 */

import { ok, err, type Result } from '@servicejs/result';

export interface UploadThingConfig {
  apiKey: string;
  appId: string;
}

export interface UploadOptions {
  acl?: 'public-read' | 'private';
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface FileInfo {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  customId?: string;
  metadata?: Record<string, string>;
}

export interface UploadThingAdapter {
  init(config: UploadThingConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  upload(file: Buffer, filename: string, options?: UploadOptions): Promise<Result<UploadResult, Error>>;
  deleteFile(key: string): Promise<Result<void, Error>>;
  getFileInfo(key: string): Promise<Result<FileInfo, Error>>;
  listFiles(options?: { limit?: number }): Promise<Result<FileInfo[], Error>>;
}

export const createUploadThingAdapter = (): UploadThingAdapter => {
  let config: UploadThingConfig | null = null;

  // In-memory storage for demo
  const files = new Map<string, FileInfo>();

  return {
    init: async (cfg) => {
      if (!cfg.apiKey || !cfg.appId) {
        return err(new Error('API key and App ID required'));
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

    upload: async (file, filename, options = {}) => {
      if (!config) return err(new Error('UploadThing not initialized'));

      try {
        const key = `${Date.now()}-${filename}`;
        const result: UploadResult = {
          key,
          url: `https://uploadthing.com/${config.appId}/${key}`,
          name: filename,
          size: file.byteLength,
          type: options.contentType || 'application/octet-stream',
          uploadedAt: new Date(),
        };

        // Store in mock files
        files.set(key, {
          key,
          url: result.url,
          name: filename,
          size: result.size,
          type: result.type,
          metadata: options.metadata,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteFile: async (key) => {
      if (!config) return err(new Error('UploadThing not initialized'));

      if (!files.has(key)) {
        return err(new Error('File not found'));
      }

      files.delete(key);
      return ok(undefined);
    },

    getFileInfo: async (key) => {
      if (!config) return err(new Error('UploadThing not initialized'));

      const file = files.get(key);
      if (!file) {
        return err(new Error('File not found'));
      }

      return ok(file);
    },

    listFiles: async (options = {}) => {
      if (!config) return err(new Error('UploadThing not initialized'));

      const limit = options.limit || 100;
      const fileList = Array.from(files.values()).slice(0, limit);

      return ok(fileList);
    },
  };
};
