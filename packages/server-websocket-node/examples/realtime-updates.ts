/**
 * WebSocket Real-time Updates Example
 * Demonstrates push notifications and real-time data streaming
 */

import { createWebSocketServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

interface Subscription {
  connectionId: string;
  topic: string;
}

async function main() {
  const server = createWebSocketServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== WebSocket Real-time Updates Server ===');

  const subscriptions = new Map<string, Set<string>>(); // topic -> Set<connectionId>

  server.onConnection(async (connection) => {
    console.log(`[+] Client connected: ${connection.id}`);

    await server.send(
      connection.id,
      JSON.stringify({
        type: 'connected',
        message: 'Send {"type":"subscribe","topic":"stock:AAPL"} to subscribe to updates',
      })
    );
  });

  server.onMessage(async (message) => {
    try {
      const data = JSON.parse(message.data.toString());

      switch (data.type) {
        case 'subscribe': {
          const topic = data.topic;
          if (!topic) {
            await server.send(
              message.connectionId,
              JSON.stringify({ type: 'error', message: 'Topic required' })
            );
            return;
          }

          // Add subscription
          if (!subscriptions.has(topic)) {
            subscriptions.set(topic, new Set());
          }
          subscriptions.get(topic)!.add(message.connectionId);

          console.log(`[*] ${message.connectionId} subscribed to ${topic}`);

          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'subscribed',
              topic,
              message: `Subscribed to ${topic}`,
            })
          );
          break;
        }

        case 'unsubscribe': {
          const topic = data.topic;
          if (subscriptions.has(topic)) {
            subscriptions.get(topic)!.delete(message.connectionId);
            if (subscriptions.get(topic)!.size === 0) {
              subscriptions.delete(topic);
            }
          }

          console.log(`[*] ${message.connectionId} unsubscribed from ${topic}`);

          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'unsubscribed',
              topic,
            })
          );
          break;
        }

        case 'list-topics': {
          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'topics',
              topics: Array.from(subscriptions.keys()),
            })
          );
          break;
        }

        default:
          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
            })
          );
      }
    } catch (error) {
      await server.send(
        message.connectionId,
        JSON.stringify({
          type: 'error',
          message: 'Invalid JSON',
        })
      );
    }
  });

  server.onClose((connectionId) => {
    console.log(`[-] Client disconnected: ${connectionId}`);

    // Clean up subscriptions
    for (const [topic, subs] of subscriptions.entries()) {
      subs.delete(connectionId);
      if (subs.size === 0) {
        subscriptions.delete(topic);
      }
    }
  });

  server.onError((error, connectionId) => {
    console.error(`[!] Error${connectionId ? ` on ${connectionId}` : ''}:`, error.message);
  });

  // Publish updates to topic subscribers
  async function publishToTopic(topic: string, data: any) {
    const subscribers = subscriptions.get(topic);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    console.log(`[>] Publishing to ${topic}: ${subscribers.size} subscribers`);

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

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('WebSocket Real-time Updates Server listening on ws://localhost:3000');
    console.log('\nProtocol:');
    console.log('  Subscribe:   {"type":"subscribe","topic":"stock:AAPL"}');
    console.log('  Unsubscribe: {"type":"unsubscribe","topic":"stock:AAPL"}');
    console.log('  List Topics: {"type":"list-topics"}');
    console.log('\nConnect with:');
    console.log('  wscat -c ws://localhost:3000');
  }

  // Simulate real-time stock updates
  setInterval(async () => {
    const stocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

    for (const symbol of stocks) {
      const topic = `stock:${symbol}`;
      if (subscriptions.has(topic)) {
        await publishToTopic(topic, {
          symbol,
          price: (Math.random() * 1000 + 100).toFixed(2),
          change: (Math.random() * 10 - 5).toFixed(2),
          volume: Math.floor(Math.random() * 1000000),
        });
      }
    }
  }, 2000);

  // Simulate real-time crypto updates
  setInterval(async () => {
    const cryptos = ['BTC', 'ETH', 'SOL'];

    for (const symbol of cryptos) {
      const topic = `crypto:${symbol}`;
      if (subscriptions.has(topic)) {
        await publishToTopic(topic, {
          symbol,
          price: (Math.random() * 50000 + 10000).toFixed(2),
          change: (Math.random() * 5 - 2.5).toFixed(2),
        });
      }
    }
  }, 1000);

  // Show stats
  setInterval(() => {
    console.log(`\n[Stats] Active subscriptions:`);
    for (const [topic, subs] of subscriptions.entries()) {
      console.log(`  ${topic}: ${subs.size} subscribers`);
    }
  }, 10000);

  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
