/**
 * Content-Addressed Storage Performance Benchmarks
 *
 * Measures performance of CAS operations.
 */

import { bench, run, group } from 'mitata';
import { createInMemoryCAS } from '@servicejs/cas';
import { isOk } from '@servicejs/result';

console.log('=== CAS Benchmarks ===\n');

type SmallData = { id: number; name: string };
type MediumData = { id: number; name: string; tags: string[]; metadata: Record<string, unknown> };
type LargeData = { items: Array<{ id: number; data: string; values: number[] }> };

// Small Data Benchmarks
group('Small Data (< 100 bytes)', () => {
  const cas = createInMemoryCAS<SmallData>();
  const data: SmallData = { id: 1, name: 'test' };

  bench('put', async () => {
    await cas.put(data);
  });

  bench('put + get', async () => {
    const putResult = await cas.put(data);
    if (isOk(putResult)) {
      await cas.get(putResult.value);
    }
  });

  bench('put + has', async () => {
    const putResult = await cas.put(data);
    if (isOk(putResult)) {
      await cas.has(putResult.value);
    }
  });
});

// Medium Data Benchmarks
group('Medium Data (~ 1KB)', () => {
  const cas = createInMemoryCAS<MediumData>();
  const data: MediumData = {
    id: 1,
    name: 'test data',
    tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    metadata: {
      timestamp: Date.now(),
      author: 'user',
      version: 1,
      description: 'A medium-sized data object for benchmarking',
    },
  };

  bench('put', async () => {
    await cas.put(data);
  });

  bench('put + get', async () => {
    const putResult = await cas.put(data);
    if (isOk(putResult)) {
      await cas.get(putResult.value);
    }
  });
});

// Large Data Benchmarks
group('Large Data (~ 10KB)', () => {
  const cas = createInMemoryCAS<LargeData>();
  const data: LargeData = {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      data: `Item ${i} with some data`,
      values: [i, i * 2, i * 3, i * 4, i * 5],
    })),
  };

  bench('put', async () => {
    await cas.put(data);
  });

  bench('put + get', async () => {
    const putResult = await cas.put(data);
    if (isOk(putResult)) {
      await cas.get(putResult.value);
    }
  });
});

// Deduplication Benchmarks
group('Deduplication', () => {
  bench('put same data 10 times', async () => {
    const cas = createInMemoryCAS<SmallData>();
    const data: SmallData = { id: 1, name: 'test' };

    for (let i = 0; i < 10; i++) {
      await cas.put(data);
    }
  });

  bench('put different data 10 times', async () => {
    const cas = createInMemoryCAS<SmallData>();

    for (let i = 0; i < 10; i++) {
      await cas.put({ id: i, name: `test${i}` });
    }
  });
});

// Hash Algorithm Comparison
group('Hash Algorithms', () => {
  const data: SmallData = { id: 1, name: 'test' };

  bench('SHA-256 (default)', async () => {
    const cas = createInMemoryCAS<SmallData>({ algorithm: 'sha256' });
    await cas.put(data);
  });

  bench('SHA-1 (faster)', async () => {
    const cas = createInMemoryCAS<SmallData>({ algorithm: 'sha1' });
    await cas.put(data);
  });
});

// Throughput Tests
group('Throughput', () => {
  bench('put 100 small items', async () => {
    const cas = createInMemoryCAS<SmallData>();

    for (let i = 0; i < 100; i++) {
      await cas.put({ id: i, name: `test${i}` });
    }
  });

  bench('put + get 100 small items', async () => {
    const cas = createInMemoryCAS<SmallData>();

    for (let i = 0; i < 100; i++) {
      const putResult = await cas.put({ id: i, name: `test${i}` });
      if (isOk(putResult)) {
        await cas.get(putResult.value);
      }
    }
  });
});

// Stats Performance
group('Stats', () => {
  bench('stats (empty CAS)', async () => {
    const cas = createInMemoryCAS<SmallData>();
    await cas.stats?.();
  });

  bench('stats (10 items)', async () => {
    const cas = createInMemoryCAS<SmallData>();

    for (let i = 0; i < 10; i++) {
      await cas.put({ id: i, name: `test${i}` });
    }

    await cas.stats?.();
  });

  bench('stats (100 items)', async () => {
    const cas = createInMemoryCAS<SmallData>();

    for (let i = 0; i < 100; i++) {
      await cas.put({ id: i, name: `test${i}` });
    }

    await cas.stats?.();
  });
});

await run();
