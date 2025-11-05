/**
 * Static File Server Example
 */

import { createHTTPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const server = createHTTPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== Static File Server ===');

  const publicDir = path.join(process.cwd(), 'public');

  server.onRequest(async (request) => {
    console.log(`${request.method} ${request.url}`);

    if (request.method !== 'GET') {
      return {
        statusCode: 405,
        headers: { 'content-type': 'text/plain' },
        body: 'Method Not Allowed',
      };
    }

    // Prevent directory traversal
    const safePath = path.normalize(request.url).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(publicDir, safePath);

    // Ensure file is within public directory
    if (!filePath.startsWith(publicDir)) {
      return {
        statusCode: 403,
        headers: { 'content-type': 'text/plain' },
        body: 'Forbidden',
      };
    }

    try {
      const stats = await fs.promises.stat(filePath);

      if (stats.isDirectory()) {
        // Try index.html
        const indexPath = path.join(filePath, 'index.html');
        try {
          const indexStats = await fs.promises.stat(indexPath);
          if (indexStats.isFile()) {
            const content = await fs.promises.readFile(indexPath);
            return {
              statusCode: 200,
              headers: { 'content-type': 'text/html' },
              body: content,
            };
          }
        } catch {
          // No index.html, list directory
          const files = await fs.promises.readdir(filePath);
          const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Index of ${safePath}</title></head>
            <body>
              <h1>Index of ${safePath}</h1>
              <ul>
                ${files.map(f => `<li><a href="${path.join(safePath, f)}">${f}</a></li>`).join('\n')}
              </ul>
            </body>
            </html>
          `;
          return {
            statusCode: 200,
            headers: { 'content-type': 'text/html' },
            body: html,
          };
        }
      }

      // Serve file
      const content = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();

      const mimeTypes: Record<string, string> = {
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

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      return {
        statusCode: 200,
        headers: {
          'content-type': contentType,
          'content-length': content.length.toString(),
        },
        body: content,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          statusCode: 404,
          headers: { 'content-type': 'text/plain' },
          body: 'Not Found',
        };
      }

      throw error;
    }
  });

  server.onError((error) => {
    console.error('Server error:', error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('Static File Server listening on http://localhost:3000');
    console.log(`Serving files from: ${publicDir}`);
    console.log('\nCreate a public/ directory with files to serve');
    console.log('Try: curl http://localhost:3000/');
  }

  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
