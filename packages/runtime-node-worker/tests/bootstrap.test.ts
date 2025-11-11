// Unit tests for Node.js Worker Threads runtime
import { test, expect, mock } from 'bun:test';
import { Worker } from 'worker_threads';
import { join } from 'path';

// Test worker script path
const workerScript = join(__dirname, 'test-worker.ts');

test('bootstrap creates runtime with all capabilities', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {
        TEST_ENV: 'test-value',
      },
    });

    worker.on('message', (message) => {
      if (message.type === 'capabilities-check') {
        try {
          expect(message.env).toBe(true);
          expect(message.time).toBe(true);
          expect(message.lifecycle).toBe(true);
          expect(message.console).toBe(true);
          expect(message.http).toBe(true);
          expect(message.crypto).toBe(true);
          expect(message.fs).toBe(true);
          expect(message.streams).toBe(true);
          expect(message.parentPort).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('env.platform returns correct value', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'get-platform' });

    worker.on('message', (message) => {
      if (message.type === 'platform') {
        try {
          expect(message.platform).toBe('node-worker');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('env.get retrieves workerData', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {
        TEST_VAR: 'test-value-123',
      },
    });

    worker.postMessage({ action: 'get-env', key: 'TEST_VAR' });

    worker.on('message', (message) => {
      if (message.type === 'env-value') {
        try {
          expect(message.value).toBe('test-value-123');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('time.now returns timestamp', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'get-time' });

    worker.on('message', (message) => {
      if (message.type === 'time') {
        try {
          expect(typeof message.now).toBe('number');
          expect(message.now).toBeGreaterThan(0);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('crypto.randomUUID generates valid UUID', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'get-uuid' });

    worker.on('message', (message) => {
      if (message.type === 'uuid') {
        try {
          expect(message.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('lifecycle.onShutdown registers handler', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'test-lifecycle' });

    worker.on('message', (message) => {
      if (message.type === 'lifecycle-registered') {
        try {
          expect(message.success).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('fs capability exists and has required methods', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'check-fs' });

    worker.on('message', (message) => {
      if (message.type === 'fs-check') {
        try {
          expect(message.readFile).toBe(true);
          expect(message.writeFile).toBe(true);
          expect(message.exists).toBe(true);
          expect(message.mkdir).toBe(true);
          expect(message.stat).toBe(true);
          expect(message.readdir).toBe(true);
          expect(message.remove).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('streams capability exists', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'check-streams' });

    worker.on('message', (message) => {
      if (message.type === 'streams-check') {
        try {
          expect(message.stdin).toBe(true);
          expect(message.stdout).toBe(true);
          expect(message.stderr).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('parentPort capability works for bidirectional communication', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'echo', data: 'hello-world' });

    worker.on('message', (message) => {
      if (message.type === 'echo-response') {
        try {
          expect(message.data).toBe('hello-world');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('http capability can make fetch requests', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'test-http' });

    worker.on('message', (message) => {
      if (message.type === 'http-result') {
        try {
          expect(message.hasFetch).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('streams.stdin returns error (not available in workers)', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'test-stdin' });

    worker.on('message', (message) => {
      if (message.type === 'stdin-result') {
        try {
          expect(message.isError).toBe(true);
          expect(message.errorCode).toBe('READ_ERROR');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('streams.stdout.isTTY returns false in workers', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript, {
      workerData: {},
    });

    worker.postMessage({ action: 'test-tty' });

    worker.on('message', (message) => {
      if (message.type === 'tty-result') {
        try {
          expect(message.isTTY).toBe(false);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    });

    worker.on('error', reject);

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});
