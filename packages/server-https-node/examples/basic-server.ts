/**
 * Basic HTTPS Server Example
 *
 * IMPORTANT: Generate self-signed certificate first:
 * openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
 */

import { createHTTPSServer } from '../src/index.js';
import { isOk } from '@servicejs/result';
import * as fs from 'fs';

async function main() {
  const server = createHTTPSServer();

  // Load certificate files
  const key = fs.readFileSync('key.pem');
  const cert = fs.readFileSync('cert.pem');

  await server.init({
    port: 3443,
    host: 'localhost',
    key,
    cert,
  });

  console.log('=== Basic HTTPS Server ===');

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/plain',
      },
      body: `Secure! You requested ${request.method} ${request.url}`,
    };
  });

  server.onError((error, requestId) => {
    console.error(`Error${requestId ? ` on ${requestId}` : ''}:`, error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('HTTPS Server listening on https://localhost:3443');
    console.log('\nGenerate certificate with:');
    console.log('  openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"');
    console.log('\nTry:');
    console.log('  curl --insecure https://localhost:3443');
    console.log('  (--insecure flag accepts self-signed certificate)');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
