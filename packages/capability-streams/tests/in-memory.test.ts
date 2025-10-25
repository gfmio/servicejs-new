import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import {
  createInMemoryStreams,
  createInMemoryStdin,
  createInMemoryStdout,
  createInMemoryStderr,
  createNoOpStreams,
} from '../src/in-memory.js';

describe('createInMemoryStdin', () => {
  test('readLine returns lines in order', async () => {
    const stdin = createInMemoryStdin(['Alice', 'Bob', 'Charlie']);

    const line1 = await stdin.readLine();
    expect(isOk(line1)).toBe(true);
    if (isOk(line1)) {
      expect(line1.value).toBe('Alice');
    }

    const line2 = await stdin.readLine();
    expect(isOk(line2)).toBe(true);
    if (isOk(line2)) {
      expect(line2.value).toBe('Bob');
    }

    const line3 = await stdin.readLine();
    expect(isOk(line3)).toBe(true);
    if (isOk(line3)) {
      expect(line3.value).toBe('Charlie');
    }
  });

  test('readLine returns error when buffer is empty', async () => {
    const stdin = createInMemoryStdin();

    const line = await stdin.readLine();
    expect(isErr(line)).toBe(true);
    if (isErr(line)) {
      expect(line.error.code).toBe('READ_ERROR');
    }
  });

  test('addLines adds lines to buffer', async () => {
    const stdin = createInMemoryStdin();

    stdin.addLines('First', 'Second');

    const line1 = await stdin.readLine();
    expect(isOk(line1)).toBe(true);
    if (isOk(line1)) {
      expect(line1.value).toBe('First');
    }

    const line2 = await stdin.readLine();
    expect(isOk(line2)).toBe(true);
    if (isOk(line2)) {
      expect(line2.value).toBe('Second');
    }
  });

  test('addData adds raw data with newlines', async () => {
    const stdin = createInMemoryStdin();

    stdin.addData('Line 1\nLine 2\n');

    const line1 = await stdin.readLine();
    expect(isOk(line1)).toBe(true);
    if (isOk(line1)) {
      expect(line1.value).toBe('Line 1');
    }

    const line2 = await stdin.readLine();
    expect(isOk(line2)).toBe(true);
    if (isOk(line2)) {
      expect(line2.value).toBe('Line 2');
    }
  });

  test('addData handles partial lines', async () => {
    const stdin = createInMemoryStdin();

    stdin.addData('Partial');

    const line = await stdin.readLine();
    expect(isOk(line)).toBe(true);
    if (isOk(line)) {
      expect(line.value).toBe('Partial');
    }
  });

  test('readAll returns all remaining data', async () => {
    const stdin = createInMemoryStdin(['Line 1', 'Line 2']);
    stdin.addData('Partial data');

    const all = await stdin.readAll();
    expect(isOk(all)).toBe(true);
    if (isOk(all)) {
      expect(all.value).toBe('Partial dataLine 1\nLine 2');
    }

    // Buffer should be empty after readAll
    expect(stdin.isEmpty()).toBe(true);
  });

  test('isEmpty returns true when buffer is empty', () => {
    const stdin = createInMemoryStdin();
    expect(stdin.isEmpty()).toBe(true);

    stdin.addLines('Line');
    expect(stdin.isEmpty()).toBe(false);

    stdin.clear();
    expect(stdin.isEmpty()).toBe(true);
  });

  test('clear empties the buffer', async () => {
    const stdin = createInMemoryStdin(['Line 1', 'Line 2']);

    stdin.clear();

    const line = await stdin.readLine();
    expect(isErr(line)).toBe(true);
  });

  test('isTTY returns false for in-memory stdin', () => {
    const stdin = createInMemoryStdin();
    expect(stdin.isTTY()).toBe(false);
  });
});

describe('createInMemoryStdout', () => {
  test('write appends data', async () => {
    const stdout = createInMemoryStdout();

    await stdout.write('Hello');
    await stdout.write(', ');
    await stdout.write('World!');

    expect(stdout.getData()).toBe('Hello, World!');
  });

  test('writeLine appends line with newline', async () => {
    const stdout = createInMemoryStdout();

    await stdout.writeLine('Line 1');
    await stdout.writeLine('Line 2');

    expect(stdout.getLines()).toEqual(['Line 1', 'Line 2']);
    expect(stdout.getData()).toBe('Line 1\nLine 2\n');
  });

  test('mixed write and writeLine', async () => {
    const stdout = createInMemoryStdout();

    await stdout.write('Partial ');
    await stdout.writeLine('Line 1');
    await stdout.write('Another partial');

    expect(stdout.getData()).toBe('Partial Line 1\nAnother partial');
    expect(stdout.getLines()).toEqual(['Line 1']);
  });

  test('clear empties output', async () => {
    const stdout = createInMemoryStdout();

    await stdout.writeLine('Line 1');
    stdout.clear();

    expect(stdout.getLines()).toEqual([]);
    expect(stdout.getData()).toBe('');
  });

  test('isTTY returns false for in-memory stdout', () => {
    const stdout = createInMemoryStdout();
    expect(stdout.isTTY()).toBe(false);
  });
});

describe('createInMemoryStderr', () => {
  test('write appends data', async () => {
    const stderr = createInMemoryStderr();

    await stderr.write('Error: ');
    await stderr.write('Something went wrong');

    expect(stderr.getData()).toBe('Error: Something went wrong');
  });

  test('writeLine appends line with newline', async () => {
    const stderr = createInMemoryStderr();

    await stderr.writeLine('Error 1');
    await stderr.writeLine('Error 2');

    expect(stderr.getLines()).toEqual(['Error 1', 'Error 2']);
    expect(stderr.getData()).toBe('Error 1\nError 2\n');
  });

  test('clear empties output', async () => {
    const stderr = createInMemoryStderr();

    await stderr.writeLine('Error');
    stderr.clear();

    expect(stderr.getLines()).toEqual([]);
    expect(stderr.getData()).toBe('');
  });

  test('isTTY returns false for in-memory stderr', () => {
    const stderr = createInMemoryStderr();
    expect(stderr.isTTY()).toBe(false);
  });
});

describe('createInMemoryStreams', () => {
  test('creates all three streams', () => {
    const streams = createInMemoryStreams();

    expect(streams.stdin).toBeDefined();
    expect(streams.stdout).toBeDefined();
    expect(streams.stderr).toBeDefined();
  });

  test('initializes stdin with lines', async () => {
    const streams = createInMemoryStreams({
      stdinLines: ['Alice', 'Bob'],
    });

    const line = await streams.stdin.readLine();
    expect(isOk(line)).toBe(true);
    if (isOk(line)) {
      expect(line.value).toBe('Alice');
    }
  });

  test('streams are independent', async () => {
    const streams = createInMemoryStreams();

    await streams.stdout.writeLine('stdout line');
    await streams.stderr.writeLine('stderr line');

    expect(streams.stdout.getLines()).toEqual(['stdout line']);
    expect(streams.stderr.getLines()).toEqual(['stderr line']);
  });

  test('full example: echo program', async () => {
    const streams = createInMemoryStreams({
      stdinLines: ['Hello', 'World'],
    });

    // Read from stdin and echo to stdout
    const line1 = await streams.stdin.readLine();
    if (isOk(line1)) {
      await streams.stdout.writeLine(`Echo: ${line1.value}`);
    }

    const line2 = await streams.stdin.readLine();
    if (isOk(line2)) {
      await streams.stdout.writeLine(`Echo: ${line2.value}`);
    }

    // Verify output
    expect(streams.stdout.getLines()).toEqual(['Echo: Hello', 'Echo: World']);
  });
});

describe('createNoOpStreams', () => {
  test('stdin readLine fails', async () => {
    const streams = createNoOpStreams();

    const line = await streams.stdin.readLine();
    expect(isErr(line)).toBe(true);
    if (isErr(line)) {
      expect(line.error.code).toBe('NOT_READABLE');
    }
  });

  test('stdin readAll fails', async () => {
    const streams = createNoOpStreams();

    const all = await streams.stdin.readAll();
    expect(isErr(all)).toBe(true);
  });

  test('stdout write succeeds silently', async () => {
    const streams = createNoOpStreams();

    const result = await streams.stdout.write('test');
    expect(isOk(result)).toBe(true);
  });

  test('stderr writeLine succeeds silently', async () => {
    const streams = createNoOpStreams();

    const result = await streams.stderr.writeLine('error');
    expect(isOk(result)).toBe(true);
  });

  test('isTTY returns false', () => {
    const streams = createNoOpStreams();

    expect(streams.stdin.isTTY()).toBe(false);
    expect(streams.stdout.isTTY()).toBe(false);
    expect(streams.stderr.isTTY()).toBe(false);
  });
});
