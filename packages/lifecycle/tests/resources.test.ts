/**
 * Tests for resource management
 */

import { describe, test, expect } from 'bun:test';
import {
  createResourceOwner,
  withResource,
} from '../src/resources.js';

describe('createResourceOwner', () => {
  test('creates empty owner', () => {
    const owner = createResourceOwner();

    expect(owner.size()).toBe(0);
    expect(owner.isCleanedUp()).toBe(false);
  });

  test('acquires resource', async () => {
    const owner = createResourceOwner();

    const result = await owner.acquire(
      async () => 'resource',
      async () => {}
    );

    expect(result.isOk()).toBe(true);
    expect(result.value.value).toBe('resource');
    expect(owner.size()).toBe(1);
  });

  test('acquires multiple resources', async () => {
    const owner = createResourceOwner();

    await owner.acquire(async () => 'r1', async () => {});
    await owner.acquire(async () => 'r2', async () => {});
    await owner.acquire(async () => 'r3', async () => {});

    expect(owner.size()).toBe(3);
  });

  test('acquire handles errors', async () => {
    const owner = createResourceOwner();

    const result = await owner.acquire(
      async () => {
        throw new Error('Acquire failed');
      },
      async () => {}
    );

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ACQUIRE_ERROR');
    expect(owner.size()).toBe(0);
  });

  test('cleanup calls cleanup functions', async () => {
    const owner = createResourceOwner();
    let cleaned = false;

    await owner.acquire(
      async () => 'resource',
      async () => {
        cleaned = true;
      }
    );

    await owner.cleanup();

    expect(cleaned).toBe(true);
    expect(owner.isCleanedUp()).toBe(true);
  });

  test('cleanup in reverse order (LIFO)', async () => {
    const owner = createResourceOwner();
    const order: number[] = [];

    await owner.acquire(
      async () => 1,
      async () => {
        order.push(1);
      }
    );

    await owner.acquire(
      async () => 2,
      async () => {
        order.push(2);
      }
    );

    await owner.acquire(
      async () => 3,
      async () => {
        order.push(3);
      }
    );

    await owner.cleanup();

    expect(order).toEqual([3, 2, 1]);
  });

  test('cleanup twice returns error', async () => {
    const owner = createResourceOwner();

    await owner.cleanup();
    const result = await owner.cleanup();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ALREADY_CLEANED_UP');
  });

  test('acquire after cleanup returns error', async () => {
    const owner = createResourceOwner();

    await owner.cleanup();

    const result = await owner.acquire(
      async () => 'resource',
      async () => {}
    );

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ALREADY_CLEANED_UP');
  });

  test('cleanup handles errors', async () => {
    const owner = createResourceOwner();

    await owner.acquire(
      async () => 'resource',
      async () => {
        throw new Error('Cleanup failed');
      }
    );

    const result = await owner.cleanup();

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('PARTIAL_CLEANUP');
  });

  test('cleanup continues after error', async () => {
    const owner = createResourceOwner();
    const order: number[] = [];

    await owner.acquire(
      async () => 1,
      async () => {
        order.push(1);
      }
    );

    await owner.acquire(
      async () => 2,
      async () => {
        order.push(2);
        throw new Error('Cleanup failed');
      }
    );

    await owner.acquire(
      async () => 3,
      async () => {
        order.push(3);
      }
    );

    const result = await owner.cleanup();

    expect(result.isErr()).toBe(true);
    expect(order).toEqual([3, 2, 1]); // All cleaned up despite error
  });

  test('resource cleanup can be called directly', async () => {
    const owner = createResourceOwner();
    let cleaned = false;

    const result = await owner.acquire(
      async () => 'resource',
      async () => {
        cleaned = true;
      }
    );

    if (result.isOk()) {
      await result.value.cleanup();
    }

    expect(cleaned).toBe(true);
  });
});

describe('withResource', () => {
  test('acquires, uses, and cleans up resource', async () => {
    let acquired = false;
    let cleaned = false;
    let used = false;

    const result = await withResource(
      async () => {
        acquired = true;
        return 'resource';
      },
      async () => {
        cleaned = true;
      },
      async (resource) => {
        used = true;
        return resource.length;
      }
    );

    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(8);
    expect(acquired).toBe(true);
    expect(used).toBe(true);
    expect(cleaned).toBe(true);
  });

  test('handles acquire errors', async () => {
    let cleaned = false;

    const result = await withResource(
      async () => {
        throw new Error('Acquire failed');
      },
      async () => {
        cleaned = true;
      },
      async () => 'result'
    );

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('ACQUIRE_ERROR');
    expect(cleaned).toBe(false);
  });

  test('cleans up on use error', async () => {
    let cleaned = false;

    const result = await withResource(
      async () => 'resource',
      async () => {
        cleaned = true;
      },
      async () => {
        throw new Error('Use failed');
      }
    );

    expect(result.isErr()).toBe(true);
    expect(cleaned).toBe(true);
  });

  test('handles cleanup errors after use error', async () => {
    const result = await withResource(
      async () => 'resource',
      async () => {
        throw new Error('Cleanup failed');
      },
      async () => {
        throw new Error('Use failed');
      }
    );

    expect(result.isErr()).toBe(true);
    expect(result.error.type).toBe('CLEANUP_ERROR');
  });

  test('returns use result on success', async () => {
    const result = await withResource(
      async () => ({ value: 42 }),
      async () => {},
      async (resource) => resource.value * 2
    );

    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(84);
  });

  test('cleans up even on successful use', async () => {
    let cleaned = false;

    await withResource(
      async () => 'resource',
      async () => {
        cleaned = true;
      },
      async () => 'result'
    );

    expect(cleaned).toBe(true);
  });

  test('can be used with real file-like operations', async () => {
    // Simulate file operations
    interface File {
      name: string;
      content: string;
      closed: boolean;
    }

    const openFile = async (name: string): Promise<File> => ({
      name,
      content: 'Hello, World!',
      closed: false,
    });

    const closeFile = async (file: File): Promise<void> => {
      file.closed = true;
    };

    const readFile = async (file: File): Promise<string> => {
      if (file.closed) {
        throw new Error('File is closed');
      }
      return file.content;
    };

    const result = await withResource(
      async () => await openFile('test.txt'),
      async (file) => await closeFile(file),
      async (file) => {
        const content = await readFile(file);
        return content.length;
      }
    );

    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(13);
  });
});
