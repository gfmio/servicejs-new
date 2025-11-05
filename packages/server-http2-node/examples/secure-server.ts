/**
 * Secure HTTP/2 Server Example (h2 - HTTP/2 over TLS)
 *
 * Generate certificate:
 * openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
 */

import { createHTTP2Server } from '../src/index.js';
import { isOk } from '@servicejs/result';
import * as fs from 'fs';

async function main() {
  const server = createHTTP2Server();

  const key = fs.readFileSync('key.pem');
  const cert = fs.readFileSync('cert.pem');

  await server.init({
    port: 3443,
    host: 'localhost',
    key,
    cert,
    allowHTTP1: true, // Allow HTTP/1.1 fallback
  });

  console.log('=== Secure HTTP/2 Server ===');

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        protocol: 'HTTP/2',
        secure: true,
        method: request.method,
        path: request.url,
        timestamp: new Date().toISOString(),
      }),
    };
  });

  server.onError((error) => {
    console.error('Server error:', error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('Secure HTTP/2 Server listening on https://localhost:3443');
    console.log('\nGenerate certificate with:');
    console.log('  openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"');
    console.log('\nTry:');
    console.log('  curl --insecure --http2 https://localhost:3443');
    console.log('  (--http2 uses HTTP/2, --insecure accepts self-signed cert)');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
