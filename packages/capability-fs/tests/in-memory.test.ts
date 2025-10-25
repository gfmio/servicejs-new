import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createInMemoryFS, createNoOpFS } from '../src/in-memory.js';

describe('createInMemoryFS', () => {
  test('initializes with empty filesystem', async () => {
    const fs = createInMemoryFS();
    const exists = await fs.exists('/nonexistent');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(false);
    }
  });

  test('initializes with initial files', async () => {
    const fs = createInMemoryFS({
      '/config.json': '{"key": "value"}',
      '/data/test.txt': 'Hello, world!',
    });

    const config = await fs.readFile('/config.json', { encoding: 'utf8' });
    expect(isOk(config)).toBe(true);
    if (isOk(config)) {
      expect(config.value).toBe('{"key": "value"}');
    }

    const test = await fs.readFile('/data/test.txt', { encoding: 'utf8' });
    expect(isOk(test)).toBe(true);
    if (isOk(test)) {
      expect(test.value).toBe('Hello, world!');
    }
  });

  test('writeFile creates new file', async () => {
    const fs = createInMemoryFS();

    await fs.mkdir('/data');
    const writeResult = await fs.writeFile('/data/test.txt', 'Hello!', { encoding: 'utf8' });
    expect(isOk(writeResult)).toBe(true);

    const readResult = await fs.readFile('/data/test.txt', { encoding: 'utf8' });
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      expect(readResult.value).toBe('Hello!');
    }
  });

  test('writeFile updates existing file', async () => {
    const fs = createInMemoryFS({
      '/test.txt': 'Original',
    });

    const writeResult = await fs.writeFile('/test.txt', 'Updated', { encoding: 'utf8' });
    expect(isOk(writeResult)).toBe(true);

    const readResult = await fs.readFile('/test.txt', { encoding: 'utf8' });
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      expect(readResult.value).toBe('Updated');
    }
  });

  test('writeFile with createDirs option creates parent directories', async () => {
    const fs = createInMemoryFS();

    const writeResult = await fs.writeFile(
      '/deep/nested/path/file.txt',
      'Content',
      { encoding: 'utf8', createDirs: true }
    );
    expect(isOk(writeResult)).toBe(true);

    const readResult = await fs.readFile('/deep/nested/path/file.txt', { encoding: 'utf8' });
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      expect(readResult.value).toBe('Content');
    }
  });

  test('writeFile fails if parent directory does not exist', async () => {
    const fs = createInMemoryFS();

    const writeResult = await fs.writeFile('/nonexistent/file.txt', 'Content');
    expect(isErr(writeResult)).toBe(true);
    if (isErr(writeResult)) {
      expect(writeResult.error.code).toBe('NOT_FOUND');
    }
  });

  test('readFile returns NOT_FOUND for nonexistent file', async () => {
    const fs = createInMemoryFS();

    const readResult = await fs.readFile('/nonexistent.txt');
    expect(isErr(readResult)).toBe(true);
    if (isErr(readResult)) {
      expect(readResult.error.code).toBe('NOT_FOUND');
    }
  });

  test('readFile returns NOT_A_FILE for directory', async () => {
    const fs = createInMemoryFS();
    await fs.mkdir('/data');

    const readResult = await fs.readFile('/data');
    expect(isErr(readResult)).toBe(true);
    if (isErr(readResult)) {
      expect(readResult.error.code).toBe('NOT_A_FILE');
    }
  });

  test('readFile supports binary encoding', async () => {
    const fs = createInMemoryFS();
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

    await fs.mkdir('/data');
    await fs.writeFile('/data/binary.dat', data);

    const readResult = await fs.readFile('/data/binary.dat', { encoding: 'binary' });
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      expect(readResult.value).toEqual(data);
    }
  });

  test('exists returns true for existing paths', async () => {
    const fs = createInMemoryFS({
      '/file.txt': 'Content',
    });
    await fs.mkdir('/dir');

    const fileExists = await fs.exists('/file.txt');
    expect(isOk(fileExists)).toBe(true);
    if (isOk(fileExists)) {
      expect(fileExists.value).toBe(true);
    }

    const dirExists = await fs.exists('/dir');
    expect(isOk(dirExists)).toBe(true);
    if (isOk(dirExists)) {
      expect(dirExists.value).toBe(true);
    }
  });

  test('exists returns false for nonexistent paths', async () => {
    const fs = createInMemoryFS();

    const exists = await fs.exists('/nonexistent');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(false);
    }
  });

  test('stat returns file stats', async () => {
    const fs = createInMemoryFS({
      '/test.txt': 'Hello',
    });

    const statResult = await fs.stat('/test.txt');
    expect(isOk(statResult)).toBe(true);
    if (isOk(statResult)) {
      expect(statResult.value.isFile).toBe(true);
      expect(statResult.value.isDirectory).toBe(false);
      expect(statResult.value.size).toBe(5);
      expect(statResult.value.createdAt).toBeGreaterThan(0);
    }
  });

  test('stat returns directory stats', async () => {
    const fs = createInMemoryFS();
    await fs.mkdir('/data');

    const statResult = await fs.stat('/data');
    expect(isOk(statResult)).toBe(true);
    if (isOk(statResult)) {
      expect(statResult.value.isFile).toBe(false);
      expect(statResult.value.isDirectory).toBe(true);
    }
  });

  test('stat returns NOT_FOUND for nonexistent path', async () => {
    const fs = createInMemoryFS();

    const statResult = await fs.stat('/nonexistent');
    expect(isErr(statResult)).toBe(true);
    if (isErr(statResult)) {
      expect(statResult.error.code).toBe('NOT_FOUND');
    }
  });

  test('readdir lists directory contents', async () => {
    const fs = createInMemoryFS({
      '/data/file1.txt': 'Content 1',
      '/data/file2.txt': 'Content 2',
    });
    await fs.mkdir('/data/subdir');

    const readdirResult = await fs.readdir('/data');
    expect(isOk(readdirResult)).toBe(true);
    if (isOk(readdirResult)) {
      expect(readdirResult.value.length).toBe(3);

      const names = readdirResult.value.map(e => e.name).sort();
      expect(names).toEqual(['file1.txt', 'file2.txt', 'subdir']);

      const file1 = readdirResult.value.find(e => e.name === 'file1.txt');
      expect(file1?.isFile).toBe(true);
      expect(file1?.isDirectory).toBe(false);

      const subdir = readdirResult.value.find(e => e.name === 'subdir');
      expect(subdir?.isFile).toBe(false);
      expect(subdir?.isDirectory).toBe(true);
    }
  });

  test('readdir returns empty array for empty directory', async () => {
    const fs = createInMemoryFS();
    await fs.mkdir('/empty');

    const readdirResult = await fs.readdir('/empty');
    expect(isOk(readdirResult)).toBe(true);
    if (isOk(readdirResult)) {
      expect(readdirResult.value.length).toBe(0);
    }
  });

  test('readdir returns NOT_FOUND for nonexistent directory', async () => {
    const fs = createInMemoryFS();

    const readdirResult = await fs.readdir('/nonexistent');
    expect(isErr(readdirResult)).toBe(true);
    if (isErr(readdirResult)) {
      expect(readdirResult.error.code).toBe('NOT_FOUND');
    }
  });

  test('readdir returns NOT_A_DIRECTORY for file', async () => {
    const fs = createInMemoryFS({
      '/file.txt': 'Content',
    });

    const readdirResult = await fs.readdir('/file.txt');
    expect(isErr(readdirResult)).toBe(true);
    if (isErr(readdirResult)) {
      expect(readdirResult.error.code).toBe('NOT_A_DIRECTORY');
    }
  });

  test('mkdir creates directory', async () => {
    const fs = createInMemoryFS();

    const mkdirResult = await fs.mkdir('/data');
    expect(isOk(mkdirResult)).toBe(true);

    const exists = await fs.exists('/data');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(true);
    }
  });

  test('mkdir with recursive option creates parent directories', async () => {
    const fs = createInMemoryFS();

    const mkdirResult = await fs.mkdir('/deep/nested/path', { recursive: true });
    expect(isOk(mkdirResult)).toBe(true);

    const exists = await fs.exists('/deep/nested/path');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(true);
    }
  });

  test('mkdir succeeds if directory already exists', async () => {
    const fs = createInMemoryFS();

    await fs.mkdir('/data');
    const mkdirResult = await fs.mkdir('/data');
    expect(isOk(mkdirResult)).toBe(true);
  });

  test('mkdir fails if parent does not exist without recursive', async () => {
    const fs = createInMemoryFS();

    const mkdirResult = await fs.mkdir('/deep/nested/path');
    expect(isErr(mkdirResult)).toBe(true);
    if (isErr(mkdirResult)) {
      expect(mkdirResult.error.code).toBe('NOT_FOUND');
    }
  });

  test('remove deletes file', async () => {
    const fs = createInMemoryFS({
      '/test.txt': 'Content',
    });

    const removeResult = await fs.remove('/test.txt');
    expect(isOk(removeResult)).toBe(true);

    const exists = await fs.exists('/test.txt');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(false);
    }
  });

  test('remove deletes empty directory', async () => {
    const fs = createInMemoryFS();
    await fs.mkdir('/data');

    const removeResult = await fs.remove('/data');
    expect(isOk(removeResult)).toBe(true);

    const exists = await fs.exists('/data');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(false);
    }
  });

  test('remove with recursive deletes directory and contents', async () => {
    const fs = createInMemoryFS({
      '/data/file1.txt': 'Content 1',
      '/data/file2.txt': 'Content 2',
    });

    const removeResult = await fs.remove('/data', { recursive: true });
    expect(isOk(removeResult)).toBe(true);

    const exists = await fs.exists('/data');
    expect(isOk(exists)).toBe(true);
    if (isOk(exists)) {
      expect(exists.value).toBe(false);
    }
  });

  test('remove fails for non-empty directory without recursive', async () => {
    const fs = createInMemoryFS({
      '/data/file.txt': 'Content',
    });

    const removeResult = await fs.remove('/data');
    expect(isErr(removeResult)).toBe(true);
    if (isErr(removeResult)) {
      expect(removeResult.error.code).toBe('NOT_EMPTY');
    }
  });

  test('remove succeeds for nonexistent path', async () => {
    const fs = createInMemoryFS();

    const removeResult = await fs.remove('/nonexistent');
    expect(isOk(removeResult)).toBe(true);
  });

  test('remove cannot delete root directory', async () => {
    const fs = createInMemoryFS();

    const removeResult = await fs.remove('/');
    expect(isErr(removeResult)).toBe(true);
    if (isErr(removeResult)) {
      expect(removeResult.error.code).toBe('PERMISSION_DENIED');
    }
  });
});

describe('createNoOpFS', () => {
  test('all operations fail', async () => {
    const fs = createNoOpFS();

    const readResult = await fs.readFile('/test.txt');
    expect(isErr(readResult)).toBe(true);
    if (isErr(readResult)) {
      expect(readResult.error.code).toBe('PERMISSION_DENIED');
    }

    const writeResult = await fs.writeFile('/test.txt', 'Content');
    expect(isErr(writeResult)).toBe(true);

    const existsResult = await fs.exists('/test.txt');
    expect(isErr(existsResult)).toBe(true);

    const statResult = await fs.stat('/test.txt');
    expect(isErr(statResult)).toBe(true);

    const readdirResult = await fs.readdir('/');
    expect(isErr(readdirResult)).toBe(true);

    const mkdirResult = await fs.mkdir('/data');
    expect(isErr(mkdirResult)).toBe(true);

    const removeResult = await fs.remove('/test.txt');
    expect(isErr(removeResult)).toBe(true);
  });
});
