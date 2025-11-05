import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createHTTPSServer } from '../src/index.js';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('HTTPSServerAdapter', () => {
  let server: ReturnType<typeof createHTTPSServer>;
  const TEST_PORT = 9879;
  let keyPath: string;
  let certPath: string;

  beforeAll(() => {
    // Generate self-signed certificate for testing
    const testDir = path.join(process.cwd(), 'tests', 'certs');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    keyPath = path.join(testDir, 'test-key.pem');
    certPath = path.join(testDir, 'test-cert.pem');

    // Generate certificate if it doesn't exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      try {
        execSync(
          `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/CN=localhost"`,
          { stdio: 'ignore' }
        );
      } catch (error) {
        console.warn('OpenSSL not available, using bundled certificate');
        // Create minimal self-signed cert for testing
        fs.writeFileSync(keyPath, `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1+fWIcPm15j9Z5QxmqiGCqkJJyUSL4Ck8xIk8C8Z8nQu8P
-----END PRIVATE KEY-----`);
        fs.writeFileSync(certPath, `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQC4gOZqOBbqoTANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
-----END CERTIFICATE-----`);
      }
    }
  });

  beforeEach(() => {
    server = createHTTPSServer();
  });

  afterEach(async () => {
    await server.destroy();
  });

  test('initializes with valid config', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    const result = await server.init({ port: TEST_PORT, key, cert });
    expect(isOk(result)).toBe(true);
  });

  test('fails to initialize without key', async () => {
    const cert = fs.readFileSync(certPath);

    const result = await server.init({
      port: TEST_PORT,
      key: '' as any,
      cert
    });
    expect(isOk(result)).toBe(false);
  });

  test('fails to initialize without cert', async () => {
    const key = fs.readFileSync(keyPath);

    const result = await server.init({
      port: TEST_PORT,
      key,
      cert: '' as any
    });
    expect(isOk(result)).toBe(false);
  });

  test('starts and stops server', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    await server.init({ port: TEST_PORT, key, cert });

    const startResult = await server.start();
    expect(isOk(startResult)).toBe(true);

    const healthResult = await server.health();
    expect(isOk(healthResult)).toBe(true);
    if (isOk(healthResult)) {
      expect(healthResult.value).toBe(true);
    }

    const stopResult = await server.stop();
    expect(isOk(stopResult)).toBe(true);
  });

  test('handles HTTPS requests', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    await server.init({ port: TEST_PORT, key, cert });

    server.onRequest((request) => {
      expect(request.method).toBe('GET');
      expect(request.url).toBe('/test');
      return {
        statusCode: 200,
        body: 'Hello HTTPS',
      };
    });

    await server.start();

    // Use node's https module with rejectUnauthorized: false for self-signed cert
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch(`https://localhost:${TEST_PORT}/test`, {
      // @ts-ignore - agent is valid for https
      agent
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Hello HTTPS');
  });

  test('handles POST requests with body', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    await server.init({ port: TEST_PORT, key, cert });

    server.onRequest((request) => {
      expect(request.method).toBe('POST');
      expect(request.body.toString()).toBe('test data');
      return {
        statusCode: 201,
        body: 'Created',
      };
    });

    await server.start();

    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch(`https://localhost:${TEST_PORT}/test`, {
      method: 'POST',
      body: 'test data',
      // @ts-ignore
      agent,
    });

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('Created');
  });

  test('handles JSON responses', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    await server.init({ port: TEST_PORT, key, cert });

    server.onRequest(() => {
      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ secure: true, protocol: 'https' }),
      };
    });

    await server.start();

    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch(`https://localhost:${TEST_PORT}/test`, {
      // @ts-ignore
      agent,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.secure).toBe(true);
    expect(data.protocol).toBe('https');
  });

  test('tracks active requests', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    await server.init({ port: TEST_PORT, key, cert });

    server.onRequest(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        statusCode: 200,
        body: 'OK',
      };
    });

    await server.start();

    const agent = new https.Agent({ rejectUnauthorized: false });
    // Start request but don't wait
    fetch(`https://localhost:${TEST_PORT}/test`, {
      // @ts-ignore
      agent
    });

    // Check active requests shortly after
    await new Promise(resolve => setTimeout(resolve, 10));
    const activeResult = await server.getActiveRequests();
    expect(isOk(activeResult)).toBe(true);

    // Wait for request to complete
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  test('handles query parameters', async () => {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    await server.init({ port: TEST_PORT, key, cert });

    server.onRequest((request) => {
      expect(request.query.name).toBe('test');
      expect(request.query.value).toBe('123');
      return {
        statusCode: 200,
        body: JSON.stringify(request.query),
      };
    });

    await server.start();

    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch(`https://localhost:${TEST_PORT}/test?name=test&value=123`, {
      // @ts-ignore
      agent,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('test');
    expect(data.value).toBe('123');
  });
});
