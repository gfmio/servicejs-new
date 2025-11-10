/**
 * Real-time updates server with pub/sub pattern.
 *
 * Run with: bun run examples/realtime-updates.ts
 * Test with browser console:
 *   const ws = new WebSocket('ws://localhost:3000');
 *   ws.onmessage = (e) => console.log(JSON.parse(e.data));
 *   ws.send(JSON.stringify({ type: 'subscribe', topic: 'news' }));
 */

import { createWebSocketServer } from '../src/index';

const subscriptions = new Map<string, Set<string>>(); // topic -> connectionIds
const server = createWebSocketServer();

await server.init({ port: 3000 });

// Helper to publish to a topic
async function publishToTopic(topic: string, data: any) {
  const subscribers = subscriptions.get(topic);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify({
    type: 'update',
    topic,
    data,
    timestamp: new Date().toISOString(),
  });

  for (const connectionId of subscribers) {
    await server.send(connectionId, message);
  }
}

// Helper to subscribe a connection to a topic
function subscribe(connectionId: string, topic: string) {
  if (!subscriptions.has(topic)) {
    subscriptions.set(topic, new Set());
  }
  subscriptions.get(topic)!.add(connectionId);
  console.log(`[${connectionId}] Subscribed to ${topic}`);
}

// Helper to unsubscribe a connection from a topic
function unsubscribe(connectionId: string, topic: string) {
  const subscribers = subscriptions.get(topic);
  if (subscribers) {
    subscribers.delete(connectionId);
    if (subscribers.size === 0) {
      subscriptions.delete(topic);
    }
  }
  console.log(`[${connectionId}] Unsubscribed from ${topic}`);
}

// Helper to unsubscribe from all topics
function unsubscribeAll(connectionId: string) {
  for (const [topic, subscribers] of subscriptions.entries()) {
    if (subscribers.has(connectionId)) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        subscriptions.delete(topic);
      }
    }
  }
}

server.onConnection(async (connection) => {
  console.log(`[${connection.id}] New connection from ${connection.remoteAddress}`);

  await server.send(
    connection.id,
    JSON.stringify({
      type: 'welcome',
      availableTopics: ['news', 'sports', 'weather', 'stocks'],
    })
  );
});

server.onMessage(async (connectionId, data) => {
  try {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'subscribe': {
        const topic = message.topic;
        if (!topic) {
          await server.send(
            connectionId,
            JSON.stringify({
              type: 'error',
              message: 'Topic is required',
            })
          );
          return;
        }

        subscribe(connectionId, topic);

        await server.send(
          connectionId,
          JSON.stringify({
            type: 'subscribed',
            topic,
          })
        );
        break;
      }

      case 'unsubscribe': {
        const topic = message.topic;
        if (!topic) {
          await server.send(
            connectionId,
            JSON.stringify({
              type: 'error',
              message: 'Topic is required',
            })
          );
          return;
        }

        unsubscribe(connectionId, topic);

        await server.send(
          connectionId,
          JSON.stringify({
            type: 'unsubscribed',
            topic,
          })
        );
        break;
      }

      case 'publish': {
        const { topic, data } = message;
        if (!topic || !data) {
          await server.send(
            connectionId,
            JSON.stringify({
              type: 'error',
              message: 'Topic and data are required',
            })
          );
          return;
        }

        console.log(`[${connectionId}] Publishing to ${topic}`);
        await publishToTopic(topic, data);

        await server.send(
          connectionId,
          JSON.stringify({
            type: 'published',
            topic,
          })
        );
        break;
      }

      case 'listTopics': {
        await server.send(
          connectionId,
          JSON.stringify({
            type: 'topics',
            topics: Array.from(subscriptions.keys()),
          })
        );
        break;
      }

      default:
        await server.send(
          connectionId,
          JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
          })
        );
    }
  } catch (error) {
    await server.send(
      connectionId,
      JSON.stringify({
        type: 'error',
        message: 'Invalid JSON',
      })
    );
  }
});

server.onClose((connectionId) => {
  console.log(`[${connectionId}] Connection closed`);
  unsubscribeAll(connectionId);
});

server.onError((error, connectionId) => {
  console.error(`[${connectionId || 'server'}] Error:`, error.message);
});

await server.start();
console.log('Real-time Updates Server listening on ws://localhost:3000');
console.log('\nProtocol:');
console.log('  Subscribe:   {"type":"subscribe","topic":"news"}');
console.log('  Unsubscribe: {"type":"unsubscribe","topic":"news"}');
console.log('  Publish:     {"type":"publish","topic":"news","data":{...}}');
console.log('  List:        {"type":"listTopics"}');

// Simulate periodic updates
setInterval(async () => {
  await publishToTopic('news', {
    headline: 'Breaking News',
    content: `Update at ${new Date().toLocaleTimeString()}`,
  });

  await publishToTopic('weather', {
    temperature: Math.round(Math.random() * 30 + 10),
    condition: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
  });

  await publishToTopic('stocks', {
    symbol: 'ACME',
    price: (Math.random() * 100 + 100).toFixed(2),
  });
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
