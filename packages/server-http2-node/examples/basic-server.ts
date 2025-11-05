/**
 * Basic HTTP/2 Server Example (h2c - cleartext HTTP/2)
 */

import { createHTTP2Server } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createHTTP2Server();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== Basic HTTP/2 Server (cleartext) ===');

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/plain',
      },
      body: `HTTP/2! You requested ${request.method} ${request.url}`,
    };
  });

  server.onError((error, requestId) => {
    console.error(`Error${requestId ? ` on ${requestId}` : ''}:`, error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('HTTP/2 Server listening on http://localhost:3000');
    console.log('\nTry:');
    console.log('  curl --http2-prior-knowledge http://localhost:3000');
    console.log('  (--http2-prior-knowledge forces HTTP/2 without TLS)');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
