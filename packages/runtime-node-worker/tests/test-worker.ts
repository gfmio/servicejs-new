// Test worker script for unit tests
import { bootstrap } from '../src/index';
import { isOk } from '@servicejs/result';

// Bootstrap the worker runtime
const runtime = bootstrap();

// Handle messages from main thread
runtime.parentPort.onMessage(async (message: any) => {
  switch (message.action) {
    case 'get-platform': {
      const platform = typeof runtime.env.platform === 'function'
        ? runtime.env.platform()
        : runtime.env.platform;
      const result = runtime.parentPort.postMessage({
        type: 'platform',
        platform,
      });
      break;
    }

    case 'get-env': {
      const value = runtime.env.get(message.key);
      const result = runtime.parentPort.postMessage({
        type: 'env-value',
        value: value.isSome() ? value.value : null,
      });
      break;
    }

    case 'get-time': {
      const result = runtime.parentPort.postMessage({
        type: 'time',
        now: runtime.time.now(),
      });
      break;
    }

    case 'get-uuid': {
      const uuidResult = runtime.crypto.randomUUID();
      const result = runtime.parentPort.postMessage({
        type: 'uuid',
        uuid: isOk(uuidResult) ? uuidResult.value : null,
      });
      break;
    }

    case 'test-lifecycle': {
      const registerResult = runtime.lifecycle.onShutdown(() => {
        // Handler registered
      });
      const result = runtime.parentPort.postMessage({
        type: 'lifecycle-registered',
        success: isOk(registerResult) && typeof registerResult.value === 'function',
      });
      break;
    }

    case 'check-fs': {
      const result = runtime.parentPort.postMessage({
        type: 'fs-check',
        readFile: typeof runtime.fs.readFile === 'function',
        writeFile: typeof runtime.fs.writeFile === 'function',
        exists: typeof runtime.fs.exists === 'function',
        mkdir: typeof runtime.fs.mkdir === 'function',
        stat: typeof runtime.fs.stat === 'function',
        readdir: typeof runtime.fs.readdir === 'function',
        remove: typeof runtime.fs.remove === 'function',
      });
      break;
    }

    case 'check-streams': {
      const result = runtime.parentPort.postMessage({
        type: 'streams-check',
        stdin: runtime.streams.stdin !== undefined,
        stdout: runtime.streams.stdout !== undefined,
        stderr: runtime.streams.stderr !== undefined,
      });
      break;
    }

    case 'echo': {
      const result = runtime.parentPort.postMessage({
        type: 'echo-response',
        data: message.data,
      });
      break;
    }

    case 'test-http': {
      const result = runtime.parentPort.postMessage({
        type: 'http-result',
        hasFetch: typeof runtime.http.request === 'function',
      });
      break;
    }

    case 'test-stdin': {
      const result = await runtime.streams.stdin.readLine();
      const result2 = runtime.parentPort.postMessage({
        type: 'stdin-result',
        isError: !isOk(result),
        errorCode: isOk(result) ? null : result.error.code,
      });
      break;
    }

    case 'test-tty': {
      const result = runtime.parentPort.postMessage({
        type: 'tty-result',
        isTTY: runtime.streams.stdout.isTTY(),
      });
      break;
    }

    default:
      break;
  }
});

// Send initial capabilities check
const result = runtime.parentPort.postMessage({
  type: 'capabilities-check',
  env: runtime.env !== undefined,
  time: runtime.time !== undefined,
  lifecycle: runtime.lifecycle !== undefined,
  console: runtime.console !== undefined,
  http: runtime.http !== undefined,
  crypto: runtime.crypto !== undefined,
  fs: runtime.fs !== undefined,
  streams: runtime.streams !== undefined,
  parentPort: runtime.parentPort !== undefined,
});
