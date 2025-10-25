/**
 * In-memory filesystem implementation for testing.
 */

import { ok, err } from '@servicejs/result';
import type { Result } from '@servicejs/result';
import type {
  FilesystemCapability,
  FSError,
  FileStats,
  DirectoryEntry,
  ReadFileOptions,
  WriteFileOptions,
  MkdirOptions,
  RemoveOptions,
} from './types.js';

/**
 * In-memory file system node (either file or directory).
 */
interface FSNode {
  readonly type: 'file' | 'directory';
  readonly createdAt: number;
  modifiedAt: number;
  accessedAt: number;
}

/**
 * In-memory file node.
 */
interface FileNode extends FSNode {
  readonly type: 'file';
  content: string | Uint8Array;
}

/**
 * In-memory directory node.
 */
interface DirectoryNode extends FSNode {
  readonly type: 'directory';
  readonly children: Map<string, FSNode>;
}

/**
 * Normalize path by removing trailing slashes and resolving . and ..
 */
function normalizePath(path: string): string {
  if (path === '/') return '/';

  // Remove trailing slashes
  path = path.replace(/\/+$/, '');

  // Split and resolve . and ..
  const parts = path.split('/').filter(p => p.length > 0);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      if (resolved.length > 0) {
        resolved.pop();
      }
    } else {
      resolved.push(part);
    }
  }

  return '/' + resolved.join('/');
}

/**
 * Split path into parent and name.
 */
function splitPath(path: string): { parent: string; name: string } {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf('/');

  if (lastSlash === 0) {
    return { parent: '/', name: normalized.slice(1) };
  }

  return {
    parent: normalized.slice(0, lastSlash),
    name: normalized.slice(lastSlash + 1),
  };
}

/**
 * Create an in-memory filesystem capability for testing.
 *
 * @param initialFiles - Optional initial files (map of path to content)
 * @returns In-memory filesystem capability
 *
 * @example
 * ```typescript
 * const fs = createInMemoryFS({
 *   '/config.json': '{"key": "value"}',
 *   '/data/test.txt': 'Hello, world!',
 * });
 *
 * const content = await fs.readFile('/config.json', { encoding: 'utf8' });
 * if (content.ok) {
 *   console.log(JSON.parse(content.value as string));
 * }
 * ```
 */
export function createInMemoryFS(
  initialFiles: Record<string, string | Uint8Array> = {}
): FilesystemCapability {
  const now = Date.now();

  // Root directory
  const root: DirectoryNode = {
    type: 'directory',
    children: new Map(),
    createdAt: now,
    modifiedAt: now,
    accessedAt: now,
  };

  // Helper: Get node at path
  const getNode = (path: string): FSNode | undefined => {
    const normalized = normalizePath(path);

    if (normalized === '/') {
      return root;
    }

    const parts = normalized.slice(1).split('/');
    let current: FSNode = root;

    for (const part of parts) {
      if (current.type !== 'directory') {
        return undefined;
      }

      const child = (current as DirectoryNode).children.get(part);
      if (!child) {
        return undefined;
      }

      current = child;
    }

    return current;
  };

  // Helper: Create directory synchronously (for internal use)
  const createDirSync = (path: string, recursive: boolean): FSNode | FSError => {
    const normalized = normalizePath(path);

    if (normalized === '/') {
      return root; // Root always exists
    }

    const existingNode = getNode(normalized);
    if (existingNode) {
      if (existingNode.type === 'directory') {
        return existingNode; // Already exists
      } else {
        return {
          code: 'ALREADY_EXISTS',
          message: `Path exists but is not a directory: ${path}`,
          path,
        };
      }
    }

    const { parent, name } = splitPath(normalized);

    if (recursive) {
      // Ensure parent exists recursively
      const parentResult = createDirSync(parent, true);
      if ('code' in parentResult) {
        return parentResult; // Error
      }
    }

    const parentNode = getNode(parent);
    if (!parentNode) {
      return {
        code: 'NOT_FOUND',
        message: `Parent directory not found: ${parent}`,
        path: parent,
      };
    }

    if (parentNode.type !== 'directory') {
      return {
        code: 'NOT_A_DIRECTORY',
        message: `Parent path is not a directory: ${parent}`,
        path: parent,
      };
    }

    const now = Date.now();
    const newDir: DirectoryNode = {
      type: 'directory',
      children: new Map(),
      createdAt: now,
      modifiedAt: now,
      accessedAt: now,
    };

    (parentNode as DirectoryNode).children.set(name, newDir);
    parentNode.modifiedAt = now;

    return newDir;
  };

  // Capability methods
  const readFile = async (
    path: string,
    options: ReadFileOptions = {}
  ): Promise<Result<string | Uint8Array, FSError>> => {
    const node = getNode(path);

    if (!node) {
      return err({
        code: 'NOT_FOUND',
        message: `File not found: ${path}`,
        path,
      });
    }

    if (node.type !== 'file') {
      return err({
        code: 'NOT_A_FILE',
        message: `Path is not a file: ${path}`,
        path,
      });
    }

    const fileNode = node as FileNode;
    fileNode.accessedAt = Date.now();

    const encoding = options.encoding || 'utf8';
    if (encoding === 'binary') {
      if (typeof fileNode.content === 'string') {
        const encoder = new TextEncoder();
        return ok(encoder.encode(fileNode.content));
      }
      return ok(fileNode.content);
    } else {
      if (typeof fileNode.content === 'string') {
        return ok(fileNode.content);
      }
      const decoder = new TextDecoder(encoding === 'utf8' ? 'utf-8' : encoding);
      return ok(decoder.decode(fileNode.content));
    }
  };

  const writeFile = async (
    path: string,
    data: string | Uint8Array,
    options: WriteFileOptions = {}
  ): Promise<Result<void, FSError>> => {
    const { parent, name } = splitPath(path);

    if (!name) {
      return err({
        code: 'INVALID_PATH',
        message: `Invalid path: ${path}`,
        path,
      });
    }

    // Ensure parent directory exists
    if (options.createDirs) {
      const parentResult = createDirSync(parent, true);
      if ('code' in parentResult) {
        return err(parentResult);
      }
    }

    const parentNode = getNode(parent);
    if (!parentNode) {
      return err({
        code: 'NOT_FOUND',
        message: `Parent directory not found: ${parent}`,
        path: parent,
      });
    }

    if (parentNode.type !== 'directory') {
      return err({
        code: 'NOT_A_DIRECTORY',
        message: `Parent path is not a directory: ${parent}`,
        path: parent,
      });
    }

    const parentDirNode = parentNode as DirectoryNode;
    const existingNode = parentDirNode.children.get(name);

    if (existingNode && existingNode.type !== 'file') {
      return err({
        code: 'NOT_A_FILE',
        message: `Path exists but is not a file: ${path}`,
        path,
      });
    }

    const now = Date.now();

    if (existingNode) {
      // Update existing file
      (existingNode as FileNode).content = data;
      existingNode.modifiedAt = now;
      existingNode.accessedAt = now;
    } else {
      // Create new file
      const newFile: FileNode = {
        type: 'file',
        content: data,
        createdAt: now,
        modifiedAt: now,
        accessedAt: now,
      };
      parentDirNode.children.set(name, newFile);
    }

    parentDirNode.modifiedAt = now;
    return ok(undefined);
  };

  const exists = async (path: string): Promise<Result<boolean, FSError>> => {
    return ok(getNode(path) !== undefined);
  };

  const stat = async (path: string): Promise<Result<FileStats, FSError>> => {
    const node = getNode(path);

    if (!node) {
      return err({
        code: 'NOT_FOUND',
        message: `Path not found: ${path}`,
        path,
      });
    }

    const stats: FileStats = {
      isFile: node.type === 'file',
      isDirectory: node.type === 'directory',
      isSymlink: false,
      size: node.type === 'file'
        ? (typeof (node as FileNode).content === 'string'
            ? (node as FileNode).content.length
            : (node as FileNode).content.length)
        : 0,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      accessedAt: node.accessedAt,
    };

    return ok(stats);
  };

  const readdir = async (path: string): Promise<Result<readonly DirectoryEntry[], FSError>> => {
    const node = getNode(path);

    if (!node) {
      return err({
        code: 'NOT_FOUND',
        message: `Directory not found: ${path}`,
        path,
      });
    }

    if (node.type !== 'directory') {
      return err({
        code: 'NOT_A_DIRECTORY',
        message: `Path is not a directory: ${path}`,
        path,
      });
    }

    const dirNode = node as DirectoryNode;
    dirNode.accessedAt = Date.now();

    const entries: DirectoryEntry[] = [];
    for (const [name, child] of dirNode.children) {
      entries.push({
        name,
        isFile: child.type === 'file',
        isDirectory: child.type === 'directory',
        isSymlink: false,
      });
    }

    return ok(entries);
  };

  const mkdir = async (
    path: string,
    options: MkdirOptions = {}
  ): Promise<Result<void, FSError>> => {
    const result = createDirSync(path, options.recursive || false);

    if ('code' in result) {
      return err(result);
    }

    return ok(undefined);
  };

  const remove = async (
    path: string,
    options: RemoveOptions = {}
  ): Promise<Result<void, FSError>> => {
    const normalized = normalizePath(path);

    if (normalized === '/') {
      return err({
        code: 'PERMISSION_DENIED',
        message: 'Cannot remove root directory',
        path,
      });
    }

    const node = getNode(normalized);
    if (!node) {
      return ok(undefined); // Already doesn't exist
    }

    if (node.type === 'directory' && (node as DirectoryNode).children.size > 0 && !options.recursive) {
      return err({
        code: 'NOT_EMPTY',
        message: `Directory not empty: ${path}`,
        path,
      });
    }

    const { parent, name } = splitPath(normalized);
    const parentNode = getNode(parent);

    if (!parentNode || parentNode.type !== 'directory') {
      return err({
        code: 'UNKNOWN',
        message: 'Parent directory not found',
        path: parent,
      });
    }

    (parentNode as DirectoryNode).children.delete(name);
    parentNode.modifiedAt = Date.now();

    return ok(undefined);
  };

  // Initialize with initial files (synchronously since it's in-memory)
  for (const [path, content] of Object.entries(initialFiles)) {
    // Since all operations are synchronous in memory, we can initialize directly
    const { name } = splitPath(path);

    // Ensure parent directories exist
    const parts = normalizePath(path).slice(1).split('/');
    parts.pop(); // Remove filename

    let currentPath = '/';
    let currentDir = root;

    for (const part of parts) {
      currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;

      let child = currentDir.children.get(part);
      if (!child) {
        const newDir: DirectoryNode = {
          type: 'directory',
          children: new Map(),
          createdAt: now,
          modifiedAt: now,
          accessedAt: now,
        };
        currentDir.children.set(part, newDir);
        child = newDir;
      }

      if (child.type !== 'directory') {
        throw new Error(`Cannot create file at ${path}: ${currentPath} is not a directory`);
      }

      currentDir = child as DirectoryNode;
    }

    // Create the file
    const fileNode: FileNode = {
      type: 'file',
      content,
      createdAt: now,
      modifiedAt: now,
      accessedAt: now,
    };
    currentDir.children.set(name, fileNode);
  }

  return {
    readFile,
    writeFile,
    exists,
    stat,
    readdir,
    mkdir,
    remove,
  };
}

/**
 * Create a no-op filesystem capability where all operations fail.
 *
 * Useful for testing error handling or disabling filesystem access.
 *
 * @returns No-op filesystem capability
 */
export function createNoOpFS(): FilesystemCapability {
  const noOpError: FSError = {
    code: 'PERMISSION_DENIED',
    message: 'Filesystem access disabled',
  };

  return {
    readFile: async () => err(noOpError),
    writeFile: async () => err(noOpError),
    exists: async () => err(noOpError),
    stat: async () => err(noOpError),
    readdir: async () => err(noOpError),
    mkdir: async () => err(noOpError),
    remove: async () => err(noOpError),
  };
}
