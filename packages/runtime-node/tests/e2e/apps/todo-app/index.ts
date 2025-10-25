// Todo App E2E app for runtime-node
import { bootstrap } from '../../../../src/index';
import { join } from 'path';
import { tmpdir } from 'os';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

async function main() {
  const runtime = bootstrap({
    captureShutdownSignals: false,
  });

  runtime.console.log('=== ServiceJS Todo App ===\n');

  // Create temp directory for todos
  const todoDir = join(tmpdir(), 'servicejs-todos-' + Date.now());
  const todoFile = join(todoDir, 'todos.json');

  // Create directory
  const mkdirResult = await runtime.fs.mkdir(todoDir, { recursive: true });
  if (!mkdirResult.ok) {
    runtime.console.error('Failed to create directory:', mkdirResult.error.message);
    process.exit(1);
  }

  // Create some todos
  const todos: Todo[] = [
    {
      id: runtime.crypto.randomUUID(),
      title: 'Learn ServiceJS',
      completed: false,
      createdAt: runtime.time.now(),
    },
    {
      id: runtime.crypto.randomUUID(),
      title: 'Build an app',
      completed: false,
      createdAt: runtime.time.now(),
    },
    {
      id: runtime.crypto.randomUUID(),
      title: 'Write tests',
      completed: true,
      createdAt: runtime.time.now(),
    },
  ];

  runtime.console.log(`Created ${todos.length} todos`);

  // Save todos to file
  const todosJson = JSON.stringify(todos, null, 2);
  const writeResult = await runtime.fs.writeFile(todoFile, todosJson);
  if (!writeResult.ok) {
    runtime.console.error('Failed to write todos:', writeResult.error.message);
    process.exit(1);
  }
  runtime.console.log(`Saved todos to ${todoFile}`);

  // Read todos back
  const readResult = await runtime.fs.readFile(todoFile, { encoding: 'utf8' });
  if (!readResult.ok) {
    runtime.console.error('Failed to read todos:', readResult.error.message);
    process.exit(1);
  }

  const loadedTodos: Todo[] = JSON.parse(readResult.value as string);
  runtime.console.log(`\nLoaded ${loadedTodos.length} todos:`);

  for (const todo of loadedTodos) {
    const status = todo.completed ? '✓' : ' ';
    runtime.console.log(`  [${status}] ${todo.title}`);
  }

  // Count completed
  const completedCount = loadedTodos.filter((t) => t.completed).length;
  runtime.console.log(`\nCompleted: ${completedCount}/${loadedTodos.length}`);

  // Cleanup
  await runtime.fs.unlink(todoFile);
  await runtime.fs.rmdir(todoDir);
  runtime.console.log('\nCleanup complete');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
