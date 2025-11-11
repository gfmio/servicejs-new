/**
 * Unit tests for Bun Worker runtime
 */
import { test, expect } from 'bun:test';
import { join } from 'path';

// Test worker script path
const workerScript = join(__dirname, 'test-worker.ts');

test('bootstrap creates runtime with all capabilities', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.onmessage = (event) => {
      if (event.data.type === 'capabilities-check') {
        try {
          expect(event.data.env).toBe(true);
          expect(event.data.time).toBe(true);
          expect(event.data.lifecycle).toBe(true);
          expect(event.data.console).toBe(true);
          expect(event.data.http).toBe(true);
          expect(event.data.crypto).toBe(true);
          expect(event.data.fs).toBe(true);
          expect(event.data.streams).toBe(true);
          expect(event.data.self).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = (error) => {
      reject(error);
    };

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('env.platform returns correct value', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'get-platform' });

    worker.onmessage = (event) => {
      if (event.data.type === 'platform') {
        try {
          expect(event.data.platform).toBe('web-worker');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('env.get retrieves environment variables', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'get-env', key: 'PATH' });

    worker.onmessage = (event) => {
      if (event.data.type === 'env-value') {
        try {
          expect(event.data.value).toBeTruthy();
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('time.now returns timestamp', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'get-time' });

    worker.onmessage = (event) => {
      if (event.data.type === 'time') {
        try {
          expect(typeof event.data.now).toBe('number');
          expect(event.data.now).toBeGreaterThan(0);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('crypto.randomUUID generates valid UUID', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'get-uuid' });

    worker.onmessage = (event) => {
      if (event.data.type === 'uuid') {
        try {
          expect(event.data.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('lifecycle.onShutdown registers handler', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'test-lifecycle' });

    worker.onmessage = (event) => {
      if (event.data.type === 'lifecycle-registered') {
        try {
          expect(event.data.success).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('fs capability exists and has required methods', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'check-fs' });

    worker.onmessage = (event) => {
      if (event.data.type === 'fs-check') {
        try {
          expect(event.data.readFile).toBe(true);
          expect(event.data.writeFile).toBe(true);
          expect(event.data.exists).toBe(true);
          expect(event.data.mkdir).toBe(true);
          expect(event.data.stat).toBe(true);
          expect(event.data.readdir).toBe(true);
          expect(event.data.remove).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('streams capability exists', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'check-streams' });

    worker.onmessage = (event) => {
      if (event.data.type === 'streams-check') {
        try {
          expect(event.data.stdin).toBe(true);
          expect(event.data.stdout).toBe(true);
          expect(event.data.stderr).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('self capability works for bidirectional communication', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'echo', data: 'hello-world' });

    worker.onmessage = (event) => {
      if (event.data.type === 'echo-response') {
        try {
          expect(event.data.data).toBe('hello-world');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('http capability exists', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'test-http' });

    worker.onmessage = (event) => {
      if (event.data.type === 'http-result') {
        try {
          expect(event.data.hasFetch).toBe(true);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('streams.stdin returns error (not available in workers)', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'test-stdin' });

    worker.onmessage = (event) => {
      if (event.data.type === 'stdin-result') {
        try {
          expect(event.data.isError).toBe(true);
          expect(event.data.errorCode).toBe('READ_ERROR');
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});

test('streams.stdout.isTTY returns false in workers', () => {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(workerScript);

    worker.postMessage({ action: 'test-tty' });

    worker.onmessage = (event) => {
      if (event.data.type === 'tty-result') {
        try {
          expect(event.data.isTTY).toBe(false);
          worker.terminate();
          resolve();
        } catch (error) {
          worker.terminate();
          reject(error);
        }
      }
    };

    worker.onerror = reject;

    setTimeout(() => {
      worker.terminate();
      reject(new Error('Test timeout'));
    }, 5000);
  });
});
