/**
 * RESTful API Example with Node.js HTTP
 *
 * Run with: bun examples/rest-api.ts
 */

import { createNodeHttpAdapter } from '../src/node-http.js';

const server = createNodeHttpAdapter();

// In-memory data store
const users = new Map<number, { id: number; name: string; email: string }>();
let nextId = 1;

// Seed data
users.set(1, { id: 1, name: 'Alice', email: 'alice@example.com' });
users.set(2, { id: 2, name: 'Bob', email: 'bob@example.com' });
nextId = 3;

await server.init({ port: 3000, hostname: 'localhost' });
await server.start();

server.onRequest(async (req) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL and extract path and ID
  const urlParts = req.url?.split('/').filter(Boolean) || [];

  // GET /api/users - List all users
  if (req.method === 'GET' && req.url === '/api/users') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { users: Array.from(users.values()) },
    };
  }

  // GET /api/users/:id - Get user by ID
  if (req.method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'users' && urlParts[2]) {
    const id = parseInt(urlParts[2], 10);
    const user = users.get(id);

    if (!user) {
      return {
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        body: { error: 'User not found' },
      };
    }

    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { user },
    };
  }

  // POST /api/users - Create new user
  if (req.method === 'POST' && req.url === '/api/users') {
    const body = req.body as { name?: string; email?: string };

    if (!body || !body.name || !body.email) {
      return {
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        body: { error: 'Missing required fields: name, email' },
      };
    }

    const user = {
      id: nextId++,
      name: body.name,
      email: body.email,
    };

    users.set(user.id, user);

    return {
      status: 201,
      headers: new Map([['content-type', 'application/json']]),
      body: { user },
    };
  }

  // PUT /api/users/:id - Update user
  if (req.method === 'PUT' && urlParts[0] === 'api' && urlParts[1] === 'users' && urlParts[2]) {
    const id = parseInt(urlParts[2], 10);
    const user = users.get(id);

    if (!user) {
      return {
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        body: { error: 'User not found' },
      };
    }

    const body = req.body as { name?: string; email?: string };

    if (body.name !== undefined) {
      user.name = body.name;
    }

    if (body.email !== undefined) {
      user.email = body.email;
    }

    users.set(id, user);

    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { user },
    };
  }

  // DELETE /api/users/:id - Delete user
  if (req.method === 'DELETE' && urlParts[0] === 'api' && urlParts[1] === 'users' && urlParts[2]) {
    const id = parseInt(urlParts[2], 10);

    if (!users.has(id)) {
      return {
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        body: { error: 'User not found' },
      };
    }

    users.delete(id);

    return {
      status: 204,
      headers: new Map(),
      body: null,
    };
  }

  // Root endpoint
  if (req.method === 'GET' && req.url === '/') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: {
        message: 'User Management API',
        endpoints: {
          'GET /api/users': 'List all users',
          'GET /api/users/:id': 'Get user by ID',
          'POST /api/users': 'Create new user',
          'PUT /api/users/:id': 'Update user',
          'DELETE /api/users/:id': 'Delete user',
        },
      },
    };
  }

  return {
    status: 404,
    headers: new Map([['content-type', 'application/json']]),
    body: { error: 'Not Found' },
  };
});

console.log('REST API Server running at http://localhost:3000');
console.log('\nAvailable endpoints:');
console.log('  GET    /api/users       - List all users');
console.log('  GET    /api/users/:id   - Get user by ID');
console.log('  POST   /api/users       - Create new user');
console.log('  PUT    /api/users/:id   - Update user');
console.log('  DELETE /api/users/:id   - Delete user');
console.log('\nTry these commands:');
console.log('  curl http://localhost:3000/api/users');
console.log('  curl http://localhost:3000/api/users/1');
console.log('  curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d \'{"name":"Charlie","email":"charlie@example.com"}\'');
console.log('  curl -X PUT http://localhost:3000/api/users/1 -H "Content-Type: application/json" -d \'{"name":"Alice Updated"}\'');
console.log('  curl -X DELETE http://localhost:3000/api/users/2');
