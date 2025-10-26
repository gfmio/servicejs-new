/**
 * @servicejs/lifecycle - Resource Management
 *
 * Helpers for managing resources with automatic cleanup (RAII pattern).
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * Resource error types.
 */
export type ResourceError =
  | { type: 'ACQUIRE_ERROR'; error: unknown }
  | { type: 'CLEANUP_ERROR'; error: unknown }
  | { type: 'ALREADY_CLEANED_UP' }
  | { type: 'PARTIAL_CLEANUP'; errors: Array<{ resourceIndex: number; error: unknown }> };

/**
 * A resource that requires cleanup.
 */
export interface Resource<T> {
  /**
   * The resource value.
   */
  readonly value: T;

  /**
   * Cleanup function for the resource.
   * Called when the resource is no longer needed.
   *
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
}

/**
 * Resource owner that manages multiple resources.
 *
 * Automatically cleans up all owned resources.
 */
export interface ResourceOwner {
  /**
   * Acquire and register a resource for cleanup.
   *
   * @typeParam T - The resource type
   * @param acquire - Function that acquires the resource
   * @param cleanup - Function that cleans up the resource
   * @returns Result with the resource or error
   */
  acquire<T>(
    acquire: () => Promise<T>,
    cleanup: (resource: T) => Promise<void>
  ): Promise<Result<Resource<T>, ResourceError>>;

  /**
   * Cleanup all owned resources.
   * Resources are cleaned up in reverse order of acquisition (LIFO).
   *
   * @returns Result indicating success or errors encountered
   */
  cleanup(): Promise<Result<void, ResourceError>>;

  /**
   * Check if cleanup has been called.
   *
   * @returns True if cleanup was called, false otherwise
   */
  isCleanedUp(): boolean;

  /**
   * Get the number of owned resources.
   *
   * @returns The number of resources
   */
  size(): number;
}

/**
 * Create a resource owner.
 *
 * The owner tracks all acquired resources and ensures they are
 * cleaned up properly in reverse order (LIFO).
 *
 * @returns A new resource owner
 *
 * @example
 * ```typescript
 * const owner = createResourceOwner();
 *
 * const fileResult = await owner.acquire(
 *   async () => await openFile('data.txt'),
 *   async (file) => await file.close()
 * );
 *
 * if (fileResult.isOk()) {
 *   const file = fileResult.value;
 *   await file.value.write('Hello, World!');
 * }
 *
 * // Cleanup all resources
 * await owner.cleanup();
 * ```
 */
export function createResourceOwner(): ResourceOwner {
  const resources: Array<Resource<unknown>> = [];
  let cleanedUp = false;

  return {
    async acquire<T>(
      acquire: () => Promise<T>,
      cleanup: (resource: T) => Promise<void>
    ): Promise<Result<Resource<T>, ResourceError>> {
      if (cleanedUp) {
        return err({ type: 'ALREADY_CLEANED_UP' });
      }

      try {
        const value = await acquire();

        const resource: Resource<T> = {
          value,
          cleanup: async () => {
            await cleanup(value);
          },
        };

        resources.push(resource as Resource<unknown>);

        return ok(resource);
      } catch (error) {
        return err({ type: 'ACQUIRE_ERROR', error });
      }
    },

    async cleanup(): Promise<Result<void, ResourceError>> {
      if (cleanedUp) {
        return err({ type: 'ALREADY_CLEANED_UP' });
      }

      cleanedUp = true;

      const errors: Array<{ resourceIndex: number; error: unknown }> = [];

      // Cleanup in reverse order (LIFO)
      for (let i = resources.length - 1; i >= 0; i--) {
        const resource = resources[i]!;

        try {
          await resource.cleanup();
        } catch (error) {
          errors.push({ resourceIndex: i, error });
        }
      }

      if (errors.length > 0) {
        return err({ type: 'PARTIAL_CLEANUP', errors });
      }

      return ok(undefined);
    },

    isCleanedUp(): boolean {
      return cleanedUp;
    },

    size(): number {
      return resources.length;
    },
  };
}

/**
 * Execute a function with a resource that is automatically cleaned up.
 *
 * This implements the RAII (Resource Acquisition Is Initialization) pattern.
 * The resource is acquired, used, and then cleaned up even if an error occurs.
 *
 * @typeParam T - The resource type
 * @typeParam R - The result type
 * @param acquire - Function that acquires the resource
 * @param cleanup - Function that cleans up the resource
 * @param use - Function that uses the resource
 * @returns Result with the function result or error
 *
 * @example
 * ```typescript
 * const result = await withResource(
 *   async () => await openFile('data.txt'),
 *   async (file) => await file.close(),
 *   async (file) => {
 *     const content = await file.read();
 *     return content.length;
 *   }
 * );
 *
 * if (result.isOk()) {
 *   console.log('File size:', result.value);
 * }
 * ```
 */
export async function withResource<T, R>(
  acquire: () => Promise<T>,
  cleanup: (resource: T) => Promise<void>,
  use: (resource: T) => Promise<R>
): Promise<Result<R, ResourceError>> {
  let resource: T;

  try {
    resource = await acquire();
  } catch (error) {
    return err({ type: 'ACQUIRE_ERROR', error });
  }

  try {
    const result = await use(resource);
    await cleanup(resource);
    return ok(result);
  } catch (error) {
    // Try to cleanup even if use() failed
    try {
      await cleanup(resource);
    } catch (cleanupError) {
      return err({ type: 'CLEANUP_ERROR', error: cleanupError });
    }

    // If cleanup succeeded but use() failed, return the original error
    return err({ type: 'ACQUIRE_ERROR', error });
  }
}
