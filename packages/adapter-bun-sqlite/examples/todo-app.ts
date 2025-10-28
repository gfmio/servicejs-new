/**
 * Simple Todo App with Bun SQLite Example
 *
 * Run with: bun examples/todo-app.ts
 */

import { isOk, ok } from '@servicejs/result';
import { createSqliteAdapter } from '../src/sqlite.js';

const db = createSqliteAdapter();

// Initialize database
await db.init({ filename: ':memory:' });
await db.start();

// Create schema
await db.query({
  text: `
    CREATE TABLE todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `,
});

console.log('✅ Database initialized\n');

// Add some todos
async function addTodo(title: string) {
  const result = await db.query({
    text: 'INSERT INTO todos (title, created_at) VALUES (?, ?)',
    params: [title, Date.now()],
  });

  if (isOk(result)) {
    console.log(`✅ Added todo: "${title}"`);
  }
}

// List all todos
async function listTodos() {
  const result = await db.query<{ id: number; title: string; completed: number; created_at: number }>({
    text: 'SELECT * FROM todos ORDER BY created_at DESC',
  });

  if (isOk(result)) {
    console.log('\n📋 Todo List:');
    result.value.rows.forEach((todo) => {
      const status = todo.completed ? '✓' : ' ';
      console.log(`  [${status}] ${todo.id}. ${todo.title}`);
    });
  }
}

// Complete a todo
async function completeTodo(id: number) {
  const result = await db.transaction(async (tx) => {
    await tx.query({
      text: 'UPDATE todos SET completed = 1 WHERE id = ?',
      params: [id],
    });
    return ok(undefined);
  });

  if (isOk(result)) {
    console.log(`✅ Marked todo #${id} as complete`);
  }
}

// Demo
await addTodo('Learn ServiceJS');
await addTodo('Build an app');
await addTodo('Deploy to production');

await listTodos();

console.log('\n📝 Completing first todo...');
await completeTodo(1);

await listTodos();

// Cleanup
await db.stop();
await db.destroy();

console.log('\n✨ Done!');
