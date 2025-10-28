/**
 * Cloudflare R2 Object Storage Adapter
 * R2 is S3-compatible, so we use the S3 SDK
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface StorageAdapter {
  init(config: R2Config): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  put(bucket: string, key: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<Result<void, Error>>;
  get(bucket: string, key: string): Promise<Result<Buffer, Error>>;
  delete(bucket: string, key: string): Promise<Result<void, Error>>;
  list(bucket: string, prefix?: string): Promise<Result<string[], Error>>;
}

export const createR2Adapter = (): StorageAdapter => {
  let client: S3Client | null = null;

  return {
    init: async (config: R2Config): Promise<Result<void, Error>> => {
      try {
        client = new S3Client({
          region: 'auto',
          endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        });
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Storage not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        client.destroy();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Storage not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    put: async (bucket: string, key: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Storage not initialized'));
      }

      try {
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        }));
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    get: async (bucket: string, key: string): Promise<Result<Buffer, Error>> => {
      if (!client) {
        return err(new Error('Storage not initialized'));
      }

      try {
        const response = await client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }));

        if (!response.Body) {
          return err(new Error('No data returned'));
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        return ok(Buffer.concat(chunks));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (bucket: string, key: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Storage not initialized'));
      }

      try {
        await client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }));
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    list: async (bucket: string, prefix?: string): Promise<Result<string[], Error>> => {
      if (!client) {
        return err(new Error('Storage not initialized'));
      }

      try {
        const response = await client.send(new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        }));

        const keys = response.Contents?.map((obj) => obj.Key || '') || [];
        return ok(keys.filter(Boolean));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
