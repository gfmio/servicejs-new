// E2E tests for Deno runtime
import { test, expect } from 'bun:test';
import { spawn } from 'child_process';
import { join } from 'path';

async function runApp(appPath: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn('deno', ['run', appPath], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    child.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      child.kill();
      reject(new Error('Process timeout'));
    }, 10000);
  });
}

test('e2e: hello-world app runs successfully', async () => {
  const appPath = join(__dirname, 'e2e', 'apps', 'hello-world', 'index.ts');
  const result = await runApp(appPath);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Hello, World!');
});

test('e2e: todo-app runs successfully', async () => {
  const appPath = join(__dirname, 'e2e', 'apps', 'todo-app', 'index.ts');
  const result = await runApp(appPath);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Todo App');
});
