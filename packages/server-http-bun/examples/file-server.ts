/**
 * Static file server example.
 *
 * Run with: bun run examples/file-server.ts
 * Test with: curl http://localhost:3000/
 */

import { createHTTPServer } from '../src/index';
import * as path from 'path';
import * as fs from 'fs';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

const server = createHTTPServer();

await server.init({ port: 3000 });

server.onRequest((request) => {
  console.log(`${request.method} ${request.url}`);

  if (request.method !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  // Serve index.html for root
  let filePath = request.url === '/' ? '/index.html' : request.url;

  // Prevent directory traversal
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, safePath);

  // Check if file exists
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return {
      statusCode: 404,
      body: 'File not found',
    };
  }

  // Determine content type
  const ext = path.extname(fullPath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  // Read file
  try {
    const content = fs.readFileSync(fullPath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
      body: content,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
});

server.onError((error) => {
  console.error('Error:', error.message);
});

// Create public directory if it doesn't exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'index.html'),
    `<!DOCTYPE html>
<html>
<head>
  <title>File Server</title>
</head>
<body>
  <h1>File Server Example</h1>
  <p>Place your files in the <code>public</code> directory.</p>
</body>
</html>`
  );
}

await server.start();
console.log('File Server listening on http://localhost:3000');
console.log(`Serving files from: ${PUBLIC_DIR}`);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
