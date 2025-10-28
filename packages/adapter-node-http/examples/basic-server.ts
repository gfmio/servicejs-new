/**
 * Basic HTTP Server Example with Node.js
 *
 * Run with: bun examples/basic-server.ts
 */

import { createNodeHttpAdapter } from '../src/node-http.js';

const server = createNodeHttpAdapter();

await server.init({ port: 3000, hostname: 'localhost' });
await server.start();

server.onRequest(async (req) => {
  console.log(`${req.method} ${req.url}`);

  // Simple routing
  if (req.method === 'GET' && req.url === '/') {
    return {
      status: 200,
      headers: new Map([['content-type', 'text/html']]),
      body: '<h1>Welcome to ServiceJS with Node.js!</h1><p>Visit <a href="/api/hello">/api/hello</a></p>',
    };
  }

  if (req.method === 'GET' && req.url === '/api/hello') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { message: 'Hello from ServiceJS on Node.js!', timestamp: Date.now() },
    };
  }

  if (req.method === 'POST' && req.url === '/api/echo') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { echo: req.body },
    };
  }

  if (req.method === 'GET' && req.url === '/api/headers') {
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { headers: headersObj },
    };
  }

  return {
    status: 404,
    headers: new Map([['content-type', 'application/json']]),
    body: { error: 'Not Found' },
  };
});

console.log('Server running at http://localhost:3000');
console.log('Try these commands:');
console.log('  curl http://localhost:3000/');
console.log('  curl http://localhost:3000/api/hello');
console.log('  curl -X POST http://localhost:3000/api/echo -H "Content-Type: application/json" -d \'{"test": "data"}\'');
console.log('  curl http://localhost:3000/api/headers');
