/**
 * Basic HTTP server example.
 *
 * Run with: bun run examples/basic-server.ts
 * Test with: curl http://localhost:3000
 */

import { createHTTPServer } from '../src/index';

const server = createHTTPServer();

await server.init({ port: 3000 });

server.onRequest((request) => {
  console.log(`${request.method} ${request.url}`);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
    body: `Hello! You requested ${request.method} ${request.url}\n`,
  };
});

server.onError((error) => {
  console.error('Error:', error.message);
});

await server.start();
console.log('HTTP Server listening on http://localhost:3000');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
