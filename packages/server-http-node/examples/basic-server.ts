/**
 * Basic HTTP Server Example
 */

import { createHTTPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createHTTPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== Basic HTTP Server ===');

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/plain',
      },
      body: `Hello! You requested ${request.method} ${request.url}`,
    };
  });

  server.onError((error, requestId) => {
    console.error(`Error${requestId ? ` on ${requestId}` : ''}:`, error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('Server listening on http://localhost:3000');
    console.log('Try: curl http://localhost:3000');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
