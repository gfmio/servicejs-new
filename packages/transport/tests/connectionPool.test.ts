/**
 * Tests for Connection Pool
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createConnectionPool } from '../src/connectionPool.js';
import { createServer, Server } from 'net';

const TEST_PORT = 19877;
let server: Server;

beforeEach(async () => {
  server = createServer((socket) => {
    socket.on('data', (data) => {
      socket.write(data); // Echo
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => resolve());
  });
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('ConnectionPool', () => {
  test('acquires and releases connections', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 5,
    });

    const transport = await pool.acquire('localhost', TEST_PORT);
    expect(isOk(transport)).toBe(true);

    if (isOk(transport)) {
      expect(transport.value.isConnected()).toBe(true);

      const releaseResult = await pool.release(transport.value);
      expect(isOk(releaseResult)).toBe(true);
    }

    await pool.shutdown();
  });

  test('reuses idle connections', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 5,
    });

    const t1 = await pool.acquire('localhost', TEST_PORT);
    expect(isOk(t1)).toBe(true);
    if (isOk(t1)) {
      const urn1 = t1.value.getLocalUrn();
      await pool.release(t1.value);

      const t2 = await pool.acquire('localhost', TEST_PORT);
      expect(isOk(t2)).toBe(true);
      if (isOk(t2)) {
        const urn2 = t2.value.getLocalUrn();
        expect(urn1).toEqual(urn2); // Same connection reused
        await pool.release(t2.value);
      }
    }

    await pool.shutdown();
  });

  test('respects pool limit', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 2,
    });

    const t1 = await pool.acquire('localhost', TEST_PORT);
    const t2 = await pool.acquire('localhost', TEST_PORT);

    expect(isOk(t1)).toBe(true);
    expect(isOk(t2)).toBe(true);

    const stats = pool.getStats('localhost', TEST_PORT);
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(2);
    expect(stats.idle).toBe(0);

    if (isOk(t1)) await pool.release(t1.value);
    if (isOk(t2)) await pool.release(t2.value);
    await pool.shutdown();
  });

  test('waits when pool is full', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 1,
      acquireTimeout: 1000,
    });

    const t1 = await pool.acquire('localhost', TEST_PORT);
    expect(isOk(t1)).toBe(true);

    // Try to acquire while full - will wait
    const t2Promise = pool.acquire('localhost', TEST_PORT);

    // Release first connection
    setTimeout(async () => {
      if (isOk(t1)) await pool.release(t1.value);
    }, 100);

    const t2 = await t2Promise;
    expect(isOk(t2)).toBe(true);

    if (isOk(t2)) await pool.release(t2.value);
    await pool.shutdown();
  });

  test('provides accurate statistics', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 5,
    });

    const t1 = await pool.acquire('localhost', TEST_PORT);
    const t2 = await pool.acquire('localhost', TEST_PORT);

    const stats = pool.getStats('localhost', TEST_PORT);
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(2);
    expect(stats.idle).toBe(0);

    if (isOk(t1)) await pool.release(t1.value);

    const stats2 = pool.getStats('localhost', TEST_PORT);
    expect(stats2.active).toBe(1);
    expect(stats2.idle).toBe(1);

    if (isOk(t2)) await pool.release(t2.value);
    await pool.shutdown();
  });

  test('shuts down cleanly', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 5,
    });

    await pool.acquire('localhost', TEST_PORT);
    await pool.acquire('localhost', TEST_PORT);

    const result = await pool.shutdown();
    expect(isOk(result)).toBe(true);

    // After shutdown, acquire should fail
    const t3 = await pool.acquire('localhost', TEST_PORT);
    expect(isErr(t3)).toBe(true);
  });

  test('destroys individual connections', async () => {
    const pool = createConnectionPool({
      baseUrn: 'urn:test:pool' as any,
      maxConnectionsPerHost: 5,
    });

    const t1 = await pool.acquire('localhost', TEST_PORT);
    expect(isOk(t1)).toBe(true);

    if (isOk(t1)) {
      const destroyResult = await pool.destroy(t1.value);
      expect(isOk(destroyResult)).toBe(true);

      const stats = pool.getStats('localhost', TEST_PORT);
      expect(stats.total).toBe(0);
    }

    await pool.shutdown();
  });
});
