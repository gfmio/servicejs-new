/**
 * Secure REST API Example
 *
 * IMPORTANT: Generate self-signed certificate first:
 * openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
 */

import { createHTTPSServer } from '../src/index.js';
import { isOk } from '@servicejs/result';
import * as fs from 'fs';

interface User {
  id: number;
  name: string;
  email: string;
}

async function main() {
  const server = createHTTPSServer();

  const key = fs.readFileSync('key.pem');
  const cert = fs.readFileSync('cert.pem');

  await server.init({
    port: 3443,
    host: 'localhost',
    key,
    cert,
  });

  console.log('=== Secure REST API ===');

  const users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ];

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);

    // GET /users - List all users
    if (request.method === 'GET' && request.url === '/users') {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(users),
      };
    }

    // GET /users/:id - Get specific user
    const getUserMatch = request.url.match(/^\/users\/(\d+)$/);
    if (request.method === 'GET' && getUserMatch) {
      const id = parseInt(getUserMatch[1]);
      const user = users.find(u => u.id === id);

      if (user) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(user),
        };
      } else {
        return {
          statusCode: 404,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'User not found' }),
        };
      }
    }

    // POST /users - Create new user
    if (request.method === 'POST' && request.url === '/users') {
      try {
        const data = JSON.parse(request.body.toString());
        const user: User = {
          id: users.length + 1,
          name: data.name,
          email: data.email,
        };
        users.push(user);

        return {
          statusCode: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(user),
        };
      } catch {
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Invalid JSON' }),
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
    console.log('Secure REST API listening on https://localhost:3443');
    console.log('\nEndpoints:');
    console.log('  GET    /users     - List all users');
    console.log('  GET    /users/:id - Get specific user');
    console.log('  POST   /users     - Create user');
    console.log('\nTry:');
    console.log('  curl --insecure https://localhost:3443/users');
    console.log('  curl --insecure -X POST https://localhost:3443/users -d \'{"name":"Charlie","email":"charlie@example.com"}\'');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
