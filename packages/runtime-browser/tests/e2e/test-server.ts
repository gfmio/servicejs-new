/**
 * Simple test server for E2E browser tests
 * Serves static HTML files from tests/e2e/apps/
 */

import { serve } from 'bun';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const APPS_DIR = join(__dirname, 'apps');

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Default to index.html
    if (pathname === '/') {
      pathname = '/hello-world.html';
    }

    // Remove leading slash
    const filePath = join(APPS_DIR, pathname.slice(1));

    // Security: prevent directory traversal
    if (!filePath.startsWith(APPS_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new Response('Not Found', { status: 404 });
    }

    // Read and serve file
    try {
      const content = readFileSync(filePath);
      const contentType = getContentType(filePath);

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        },
      });
    } catch (error) {
      console.error('Error serving file:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});

function getContentType(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

console.log(`Test server running at http://localhost:${PORT}`);
console.log(`Serving files from: ${APPS_DIR}`);
