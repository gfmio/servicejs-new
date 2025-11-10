/**
 * REST API example with routing.
 *
 * Run with: bun run examples/rest-api.ts
 * Test with:
 *   curl http://localhost:3000/api/users
 *   curl -X POST -d '{"name":"John"}' http://localhost:3000/api/users
 */

import { createHTTPServer } from '../src/index';

interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

let nextId = 3;

const server = createHTTPServer();

await server.init({ port: 3000 });

server.onRequest((request) => {
  console.log(`${request.method} ${request.url}`);

  // GET /api/users - List all users
  if (request.method === 'GET' && request.url === '/api/users') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(users),
    };
  }

  // GET /api/users/:id - Get user by ID
  const getUserMatch = request.url.match(/^\/api\/users\/(\d+)$/);
  if (request.method === 'GET' && getUserMatch) {
    const id = parseInt(getUserMatch[1]);
    const user = users.find((u) => u.id === id);

    if (user) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      };
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  // POST /api/users - Create new user
  if (request.method === 'POST' && request.url === '/api/users') {
    try {
      const data = JSON.parse(request.body || '{}');
      const newUser: User = {
        id: nextId++,
        name: data.name || 'Unknown',
      };
      users.push(newUser);

      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid JSON' }),
      };
    }
  }

  // DELETE /api/users/:id - Delete user
  const deleteUserMatch = request.url.match(/^\/api\/users\/(\d+)$/);
  if (request.method === 'DELETE' && deleteUserMatch) {
    const id = parseInt(deleteUserMatch[1]);
    const index = users.findIndex((u) => u.id === id);

    if (index !== -1) {
      users.splice(index, 1);
      return {
        statusCode: 204,
        body: '',
      };
    }

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  // 404 - Not Found
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: 'Not found' }),
  };
});

server.onError((error) => {
  console.error('Error:', error.message);
});

await server.start();
console.log('REST API listening on http://localhost:3000');
console.log('Endpoints:');
console.log('  GET    /api/users');
console.log('  GET    /api/users/:id');
console.log('  POST   /api/users');
console.log('  DELETE /api/users/:id');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
