/**
 * TCP client class example
 *
 * This example demonstrates:
 * - Wrapping the adapter in a reusable client class
 * - Request-response pattern
 * - Error handling
 */

import { createTCPAdapter, type TCPAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

class TCPClient {
  private adapter: TCPAdapter;

  constructor() {
    this.adapter = createTCPAdapter();
  }

  async connect(host: string, port: number) {
    const initResult = await this.adapter.init({ host, port });
    if (!isOk(initResult)) {
      throw initResult.error;
    }

    const connectResult = await this.adapter.connect();
    if (!isOk(connectResult)) {
      throw connectResult.error;
    }

    console.log(`Connected to ${host}:${port}`);
  }

  async request(data: string): Promise<string> {
    // Send request
    const sendResult = await this.adapter.send(data);
    if (!isOk(sendResult)) {
      throw sendResult.error;
    }

    console.log(`Sent ${sendResult.value} bytes`);

    // Receive response
    const receiveResult = await this.adapter.receive();
    if (!isOk(receiveResult)) {
      throw receiveResult.error;
    }

    return receiveResult.value.toString();
  }

  async disconnect() {
    await this.adapter.disconnect();
    console.log('Disconnected');
  }

  isConnected(): boolean {
    return this.adapter.isConnected();
  }
}

async function main() {
  const client = new TCPClient();

  try {
    await client.connect('localhost', 8080);

    const response = await client.request('GET /status HTTP/1.1\r\n\r\n');
    console.log('Response:', response);

    console.log('Still connected:', client.isConnected());
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
