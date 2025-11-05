/**
 * REST API Server Example
 */

import { createHTTPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

async function main() {
  const server = createHTTPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== REST API Server ===');

  const todos: Todo[] = [];
  let nextId = 1;

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);

    // GET /todos - List all todos
    if (request.method === 'GET' && request.url === '/todos') {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(todos),
      };
    }

    // GET /todos/:id - Get specific todo
    const getTodoMatch = request.url.match(/^\/todos\/(\d+)$/);
    if (request.method === 'GET' && getTodoMatch) {
      const id = parseInt(getTodoMatch[1]);
      const todo = todos.find(t => t.id === id);

      if (todo) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(todo),
        };
      } else {
        return {
          statusCode: 404,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Not found' }),
        };
      }
    }

    // POST /todos - Create new todo
    if (request.method === 'POST' && request.url === '/todos') {
      try {
        const data = JSON.parse(request.body.toString());
        const todo: Todo = {
          id: nextId++,
          title: data.title,
          completed: false,
        };
        todos.push(todo);

        return {
          statusCode: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(todo),
        };
      } catch {
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON' }),
        };
      }
    }

    // PUT /todos/:id - Update todo
    const putTodoMatch = request.url.match(/^\/todos\/(\d+)$/);
    if (request.method === 'PUT' && putTodoMatch) {
      const id = parseInt(putTodoMatch[1]);
      const todo = todos.find(t => t.id === id);

      if (todo) {
        try {
          const data = JSON.parse(request.body.toString());
          todo.title = data.title ?? todo.title;
          todo.completed = data.completed ?? todo.completed;

          return {
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(todo),
          };
        } catch {
          return {
            statusCode: 400,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid JSON' }),
          };
        }
      } else {
        return {
          statusCode: 404,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Not found' }),
        };
      }
    }

    // DELETE /todos/:id - Delete todo
    const deleteTodoMatch = request.url.match(/^\/todos\/(\d+)$/);
    if (request.method === 'DELETE' && deleteTodoMatch) {
      const id = parseInt(deleteTodoMatch[1]);
      const index = todos.findIndex(t => t.id === id);

      if (index !== -1) {
        todos.splice(index, 1);
        return {
          statusCode: 204,
          body: '',
        };
      } else {
        return {
          statusCode: 404,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Not found' }),
        };
      }
    }

    // Default 404
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('REST API Server listening on http://localhost:3000');
    console.log('\nEndpoints:');
    console.log('  GET    /todos     - List all todos');
    console.log('  GET    /todos/:id - Get specific todo');
    console.log('  POST   /todos     - Create todo');
    console.log('  PUT    /todos/:id - Update todo');
    console.log('  DELETE /todos/:id - Delete todo');
    console.log('\nTry:');
    console.log('  curl -X POST http://localhost:3000/todos -d \'{"title":"Test"}\'');
    console.log('  curl http://localhost:3000/todos');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
