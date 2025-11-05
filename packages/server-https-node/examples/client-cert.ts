/**
 * HTTPS Server with Client Certificate Verification Example
 *
 * Generate certificates:
 *
 * 1. Server certificate:
 * openssl req -x509 -newkey rsa:2048 -nodes -keyout server-key.pem -out server-cert.pem -days 365 -subj "/CN=localhost"
 *
 * 2. CA certificate (for client verification):
 * openssl req -x509 -newkey rsa:2048 -nodes -keyout ca-key.pem -out ca-cert.pem -days 365 -subj "/CN=MyCA"
 *
 * 3. Client certificate signed by CA:
 * openssl req -newkey rsa:2048 -nodes -keyout client-key.pem -out client-req.pem -subj "/CN=client"
 * openssl x509 -req -in client-req.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out client-cert.pem -days 365
 */

import { createHTTPSServer } from '../src/index.js';
import { isOk } from '@servicejs/result';
import * as fs from 'fs';

async function main() {
  const server = createHTTPSServer();

  const key = fs.readFileSync('server-key.pem');
  const cert = fs.readFileSync('server-cert.pem');
  const ca = fs.readFileSync('ca-cert.pem');

  await server.init({
    port: 3443,
    host: 'localhost',
    key,
    cert,
    ca, // Client certificate must be signed by this CA
  });

  console.log('=== HTTPS Server with Client Certificate Verification ===');

  server.onRequest((request) => {
    console.log(`${request.method} ${request.url}`);
    console.log('Headers:', request.headers);

    // In a real implementation, you would verify the client certificate here
    // The certificate info would be in request.socket.getPeerCertificate()

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Authenticated with client certificate',
        timestamp: new Date().toISOString(),
      }),
    };
  });

  server.onError((error) => {
    console.error('Server error:', error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('HTTPS Server with client cert verification on https://localhost:3443');
    console.log('\nClient must provide certificate signed by CA');
    console.log('\nConnect with client certificate:');
    console.log('  curl --insecure --cert client-cert.pem --key client-key.pem https://localhost:3443');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
