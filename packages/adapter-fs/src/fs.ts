/**
 * Local Filesystem Storage Adapter
 * S3-compatible interface for local file storage
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface FilesystemConfig {
  basePath: string;
  createIfMissing?: boolean;
}

export interface PutObjectOptions {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GetObjectResult {
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
  size: number;
  lastModified: Date;
}

export interface HeadObjectResult {
  contentType?: string;
  metadata?: Record<string, string>;
  size: number;
  lastModified: Date;
}

export interface ListObjectsResult {
  contents: Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>;
  isTruncated: boolean;
}

export interface StorageAdapter {
  init(config: FilesystemConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  createBucket(options: { bucket: string }): Promise<Result<void, Error>>;
  deleteBucket(options: { bucket: string }): Promise<Result<void, Error>>;
  listBuckets(): Promise<Result<string[], Error>>;

  putObject(options: PutObjectOptions): Promise<Result<{ etag: string }, Error>>;
  getObject(options: { bucket: string; key: string }): Promise<Result<GetObjectResult, Error>>;
  headObject(options: { bucket: string; key: string }): Promise<Result<HeadObjectResult, Error>>;
  deleteObject(options: { bucket: string; key: string }): Promise<Result<void, Error>>;
  listObjects(options: { bucket: string; prefix?: string; maxKeys?: number }): Promise<Result<ListObjectsResult, Error>>;
  copyObject(options: {
    sourceBucket: string;
    sourceKey: string;
    destinationBucket: string;
    destinationKey: string;
  }): Promise<Result<void, Error>>;
}

export const createFilesystemAdapter = (): StorageAdapter => {
  let basePath: string | null = null;
  let initialized = false;

  const getFullPath = (bucket: string, key?: string): string => {
    if (!basePath) throw new Error('Adapter not initialized');
    return key ? path.join(basePath, bucket, key) : path.join(basePath, bucket);
  };

  const getMetadataPath = (bucket: string, key: string): string => {
    return getFullPath(bucket, `${key}.meta.json`);
  };

  const ensureDirectory = async (dirPath: string): Promise<void> => {
    await fs.mkdir(dirPath, { recursive: true });
  };

  return {
    init: async (config: FilesystemConfig): Promise<Result<void, Error>> => {
      try {
        basePath = path.resolve(config.basePath);

        if (config.createIfMissing) {
          await ensureDirectory(basePath);
        } else {
          // Check if directory exists
          await fs.access(basePath);
        }

        initialized = true;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!initialized) {
        return err(new Error('Storage not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      basePath = null;
      initialized = false;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!initialized || !basePath) {
        return ok({ status: 'unhealthy', error: new Error('Storage not initialized') });
      }

      try {
        await fs.access(basePath);
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    createBucket: async (options: { bucket: string }): Promise<Result<void, Error>> => {
      try {
        const bucketPath = getFullPath(options.bucket);
        await ensureDirectory(bucketPath);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteBucket: async (options: { bucket: string }): Promise<Result<void, Error>> => {
      try {
        const bucketPath = getFullPath(options.bucket);
        await fs.rm(bucketPath, { recursive: true, force: true });
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listBuckets: async (): Promise<Result<string[], Error>> => {
      try {
        if (!basePath) {
          return err(new Error('Storage not initialized'));
        }
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        const buckets = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
        return ok(buckets);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    putObject: async (options: PutObjectOptions): Promise<Result<{ etag: string }, Error>> => {
      try {
        const objectPath = getFullPath(options.bucket, options.key);
        const dirPath = path.dirname(objectPath);

        await ensureDirectory(dirPath);

        // Write file
        const body = typeof options.body === 'string' ? Buffer.from(options.body) : Buffer.from(options.body);
        await fs.writeFile(objectPath, body);

        // Write metadata
        if (options.contentType || options.metadata) {
          const metadataPath = getMetadataPath(options.bucket, options.key);
          await fs.writeFile(
            metadataPath,
            JSON.stringify({
              contentType: options.contentType,
              metadata: options.metadata,
            })
          );
        }

        // Generate simple etag (hash of content length + mtime)
        const stats = await fs.stat(objectPath);
        const etag = `${stats.size}-${stats.mtimeMs}`;

        return ok({ etag });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getObject: async (options: { bucket: string; key: string }): Promise<Result<GetObjectResult, Error>> => {
      try {
        const objectPath = getFullPath(options.bucket, options.key);
        const body = await fs.readFile(objectPath);
        const stats = await fs.stat(objectPath);

        let contentType: string | undefined;
        let metadata: Record<string, string> | undefined;

        // Try to read metadata
        try {
          const metadataPath = getMetadataPath(options.bucket, options.key);
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadataObj = JSON.parse(metadataContent);
          contentType = metadataObj.contentType;
          metadata = metadataObj.metadata;
        } catch {
          // Metadata file doesn't exist, that's okay
        }

        return ok({
          body,
          contentType,
          metadata,
          size: stats.size,
          lastModified: stats.mtime,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    headObject: async (options: { bucket: string; key: string }): Promise<Result<HeadObjectResult, Error>> => {
      try {
        const objectPath = getFullPath(options.bucket, options.key);
        const stats = await fs.stat(objectPath);

        let contentType: string | undefined;
        let metadata: Record<string, string> | undefined;

        try {
          const metadataPath = getMetadataPath(options.bucket, options.key);
          const metadataContent = await fs.readFile(metadataPath, 'utf-8');
          const metadataObj = JSON.parse(metadataContent);
          contentType = metadataObj.contentType;
          metadata = metadataObj.metadata;
        } catch {
          // Metadata file doesn't exist
        }

        return ok({
          contentType,
          metadata,
          size: stats.size,
          lastModified: stats.mtime,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteObject: async (options: { bucket: string; key: string }): Promise<Result<void, Error>> => {
      try {
        const objectPath = getFullPath(options.bucket, options.key);
        await fs.unlink(objectPath);

        // Also delete metadata if exists
        try {
          const metadataPath = getMetadataPath(options.bucket, options.key);
          await fs.unlink(metadataPath);
        } catch {
          // Metadata doesn't exist, that's okay
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listObjects: async (options: {
      bucket: string;
      prefix?: string;
      maxKeys?: number;
    }): Promise<Result<ListObjectsResult, Error>> => {
      try {
        const bucketPath = getFullPath(options.bucket);
        const prefix = options.prefix || '';
        const maxKeys = options.maxKeys || 1000;

        const walk = async (dir: string, baseDir: string): Promise<Array<{ key: string; size: number; lastModified: Date }>> => {
          const files: Array<{ key: string; size: number; lastModified: Date }> = [];
          const entries = await fs.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            if (entry.isDirectory()) {
              files.push(...(await walk(fullPath, baseDir)));
            } else if (entry.isFile() && !entry.name.endsWith('.meta.json')) {
              // Skip metadata files
              if (prefix === '' || relativePath.startsWith(prefix)) {
                const stats = await fs.stat(fullPath);
                files.push({
                  key: relativePath,
                  size: stats.size,
                  lastModified: stats.mtime,
                });
              }
            }
          }

          return files;
        };

        const allFiles = await walk(bucketPath, bucketPath);
        const contents = allFiles.slice(0, maxKeys);

        return ok({
          contents,
          isTruncated: allFiles.length > maxKeys,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    copyObject: async (options: {
      sourceBucket: string;
      sourceKey: string;
      destinationBucket: string;
      destinationKey: string;
    }): Promise<Result<void, Error>> => {
      try {
        const sourcePath = getFullPath(options.sourceBucket, options.sourceKey);
        const destPath = getFullPath(options.destinationBucket, options.destinationKey);
        const destDir = path.dirname(destPath);

        await ensureDirectory(destDir);
        await fs.copyFile(sourcePath, destPath);

        // Also copy metadata if exists
        try {
          const sourceMetaPath = getMetadataPath(options.sourceBucket, options.sourceKey);
          const destMetaPath = getMetadataPath(options.destinationBucket, options.destinationKey);
          await fs.copyFile(sourceMetaPath, destMetaPath);
        } catch {
          // Metadata doesn't exist, that's okay
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
