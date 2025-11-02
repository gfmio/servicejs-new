/**
 * Cloudinary Adapter for ServiceJS
 *
 * Provides media management capabilities through Cloudinary's platform.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * Cloudinary configuration
 */
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  secure?: boolean;
}

/**
 * Upload options
 */
export interface UploadOptions {
  publicId?: string;
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  tags?: string[];
  transformation?: TransformationOptions;
}

/**
 * Transformation options for image/video manipulation
 */
export interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: 'scale' | 'fit' | 'fill' | 'limit' | 'pad' | 'crop' | 'thumb';
  quality?: 'auto' | number;
  format?: string;
  gravity?: string;
  effect?: string;
}

/**
 * Upload result
 */
export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  resourceType: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

/**
 * Asset metadata
 */
export interface Asset {
  publicId: string;
  format: string;
  version: number;
  resourceType: string;
  type: string;
  createdAt: string;
  bytes: number;
  width?: number;
  height?: number;
  url: string;
  secureUrl: string;
}

/**
 * Cloudinary adapter interface
 */
export interface CloudinaryAdapter {
  init(config: CloudinaryConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  upload(file: Buffer | string, options?: UploadOptions): Promise<Result<UploadResult, Error>>;
  delete(publicId: string, options?: { resourceType?: string }): Promise<Result<void, Error>>;
  getAsset(publicId: string): Promise<Result<Asset, Error>>;
  generateUrl(publicId: string, transformations?: TransformationOptions): string;
  listAssets(options?: { prefix?: string; maxResults?: number }): Promise<Result<Asset[], Error>>;
}

/**
 * Creates a Cloudinary adapter
 *
 * @example
 * ```typescript
 * const adapter = createCloudinaryAdapter();
 * await adapter.init({
 *   cloudName: 'my-cloud',
 *   apiKey: 'api-key',
 *   apiSecret: 'api-secret'
 * });
 *
 * const result = await adapter.upload(imageBuffer, {
 *   publicId: 'profile-pic',
 *   folder: 'users'
 * });
 * ```
 */
export function createCloudinaryAdapter(): CloudinaryAdapter {
  let config: CloudinaryConfig | null = null;
  const assets = new Map<string, Asset>();

  return {
    async init(cfg: CloudinaryConfig): Promise<Result<void, Error>> {
      try {
        if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret) {
          return err(new Error('Missing required configuration'));
        }
        config = { ...cfg, secure: cfg.secure ?? true };
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Failed to initialize'));
      }
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }
      return ok(undefined);
    },

    async stop(): Promise<Result<void, Error>> {
      return ok(undefined);
    },

    async destroy(): Promise<Result<void, Error>> {
      config = null;
      assets.clear();
      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(config !== null);
    },

    async upload(file: Buffer | string, options: UploadOptions = {}): Promise<Result<UploadResult, Error>> {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        const publicId = options.publicId || `upload_${Date.now()}`;
        const resourceType = options.resourceType || 'image';
        const bytes = typeof file === 'string' ? Buffer.from(file).length : file.length;

        // Mock implementation - in production, this would call Cloudinary API
        const protocol = config.secure ? 'https' : 'http';
        const baseUrl = `${protocol}://res.cloudinary.com/${config.cloudName}`;

        const result: UploadResult = {
          publicId,
          url: `${baseUrl}/${resourceType}/upload/${publicId}`,
          secureUrl: `https://res.cloudinary.com/${config.cloudName}/${resourceType}/upload/${publicId}`,
          format: 'jpg',
          resourceType,
          bytes,
          width: resourceType === 'image' ? 1920 : undefined,
          height: resourceType === 'image' ? 1080 : undefined,
          createdAt: new Date().toISOString(),
        };

        // Store asset for retrieval
        assets.set(publicId, {
          publicId: result.publicId,
          format: result.format,
          version: 1,
          resourceType: result.resourceType,
          type: 'upload',
          createdAt: result.createdAt,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          url: result.url,
          secureUrl: result.secureUrl,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Upload failed'));
      }
    },

    async delete(publicId: string, options: { resourceType?: string } = {}): Promise<Result<void, Error>> {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock implementation - in production, this would call Cloudinary API
        assets.delete(publicId);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Delete failed'));
      }
    },

    async getAsset(publicId: string): Promise<Result<Asset, Error>> {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        const asset = assets.get(publicId);
        if (!asset) {
          return err(new Error(`Asset not found: ${publicId}`));
        }

        return ok(asset);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Failed to get asset'));
      }
    },

    generateUrl(publicId: string, transformations: TransformationOptions = {}): string {
      if (!config) {
        throw new Error('Adapter not initialized');
      }

      const protocol = config.secure ? 'https' : 'http';
      const baseUrl = `${protocol}://res.cloudinary.com/${config.cloudName}`;

      // Build transformation string
      const transforms: string[] = [];
      if (transformations.width) transforms.push(`w_${transformations.width}`);
      if (transformations.height) transforms.push(`h_${transformations.height}`);
      if (transformations.crop) transforms.push(`c_${transformations.crop}`);
      if (transformations.quality) transforms.push(`q_${transformations.quality}`);
      if (transformations.format) transforms.push(`f_${transformations.format}`);
      if (transformations.gravity) transforms.push(`g_${transformations.gravity}`);
      if (transformations.effect) transforms.push(`e_${transformations.effect}`);

      const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';
      return `${baseUrl}/image/upload/${transformString}${publicId}`;
    },

    async listAssets(options: { prefix?: string; maxResults?: number } = {}): Promise<Result<Asset[], Error>> {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        let assetList = Array.from(assets.values());

        if (options.prefix) {
          assetList = assetList.filter(asset => asset.publicId.startsWith(options.prefix!));
        }

        if (options.maxResults) {
          assetList = assetList.slice(0, options.maxResults);
        }

        return ok(assetList);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Failed to list assets'));
      }
    },
  };
}
