/**
 * HTTP/2 Stream Multiplexing Demo
 * Demonstrates handling multiple concurrent requests over a single connection
 */

import { createHTTP2Server } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createHTTP2Server();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== HTTP/2 Multiplexing Demo ===');

  let requestCounter = 0;
  const activeRequests = new Map<string, number>();

  server.onRequest(async (request) => {
    const requestNum = ++requestCounter;
    activeRequests.set(request.id, requestNum);

    console.log(`[Request #${requestNum}] Started: ${request.method} ${request.url}`);
    console.log(`  Active concurrent requests: ${activeRequests.size}`);

    // Simulate processing time based on URL
    const delay = parseInt(request.query.delay as string || '0');
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    activeRequests.delete(request.id);
    console.log(`[Request #${requestNum}] Completed after ${delay}ms`);
    console.log(`  Remaining active requests: ${activeRequests.size}`);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        requestNumber: requestNum,
        method: request.method,
        path: request.url,
        delay: delay,
        timestamp: new Date().toISOString(),
      }),
    };
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('HTTP/2 Server listening on http://localhost:3000');
    console.log('\nTest multiplexing by making concurrent requests:');
    console.log('\nUsing curl (multiple terminals):');
    console.log('  Terminal 1: curl --http2-prior-knowledge "http://localhost:3000/slow?delay=2000"');
    console.log('  Terminal 2: curl --http2-prior-knowledge "http://localhost:3000/fast?delay=100"');
    console.log('  Terminal 3: curl --http2-prior-knowledge "http://localhost:3000/instant?delay=0"');
    console.log('\nNotice how requests are processed concurrently over the same connection!');
    console.log('The fast requests complete while the slow request is still processing.');
    console.log('\nUsing Node.js http2 client for true multiplexing:');
    console.log(`
const http2 = require('http2');
const client = http2.connect('http://localhost:3000');

// Make 3 requests over the same connection
['slow?delay=2000', 'fast?delay=100', 'instant?delay=0'].forEach(path => {
  const req = client.request({ ':path': '/' + path });
  req.on('response', headers => console.log(path, headers[':status']));
  req.on('data', data => console.log(path, data.toString()));
  req.end();
});
    `);
  }

  // Log stats every 2 seconds
  setInterval(async () => {
    const activeStreamsResult = await server.getActiveStreams();
    if (isOk(activeStreamsResult)) {
      console.log(`\n[Stats] Total requests: ${requestCounter}, Active streams: ${activeStreamsResult.value}`);
    }
  }, 2000);

  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    console.log(`Total requests handled: ${requestCounter}`);
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
