import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createMockHTTP, createNoOpHTTP } from '../src/mock.js';

describe('createMockHTTP', () => {
  test('returns error when no route is configured', async () => {
    const http = createMockHTTP();

    const result = await http.get('https://api.example.com/users');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('NETWORK_ERROR');
    }
  });

  test('mockRoute with string matcher', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/users', {
      status: 200,
      body: [{ id: 1, name: 'Alice' }],
    });

    const result = await http.get('https://api.example.com/users');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(result.value.status).toBe(200);
      expect(result.value.ok).toBe(true);

      const jsonResult = await result.value.json();
      expect(isOk(jsonResult)).toBe(true);
      if (isOk(jsonResult)) {
        expect(jsonResult.value).toEqual([{ id: 1, name: 'Alice' }]);
      }
    }
  });

  test('mockRoute with RegExp matcher', async () => {
    const http = createMockHTTP();

    http.mockRoute(/\/users\/\d+/, {
      status: 200,
      body: { id: 123, name: 'Bob' },
    });

    const result = await http.get('https://api.example.com/users/123');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const jsonResult = await result.value.json();
      expect(isOk(jsonResult)).toBe(true);
      if (isOk(jsonResult)) {
        expect(jsonResult.value).toEqual({ id: 123, name: 'Bob' });
      }
    }
  });

  test('mockRoute with function matcher', async () => {
    const http = createMockHTTP();

    http.mockRoute(
      (url, options) => url.includes('/users') && options?.method === 'POST',
      {
        status: 201,
        body: { id: 456, name: 'Charlie' },
      }
    );

    const result = await http.post('https://api.example.com/users', {
      body: JSON.stringify({ name: 'Charlie' }),
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe(201);
    }
  });

  test('response.text() returns string body', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/text', {
      status: 200,
      body: 'Hello, world!',
    });

    const result = await http.get('https://api.example.com/text');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const textResult = await result.value.text();
      expect(isOk(textResult)).toBe(true);
      if (isOk(textResult)) {
        expect(textResult.value).toBe('Hello, world!');
      }
    }
  });

  test('response.json() parses JSON body', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/json', {
      status: 200,
      body: { message: 'success' },
    });

    const result = await http.get('https://api.example.com/json');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const jsonResult = await result.value.json();
      expect(isOk(jsonResult)).toBe(true);
      if (isOk(jsonResult)) {
        expect(jsonResult.value).toEqual({ message: 'success' });
      }
    }
  });

  test('response.json() handles invalid JSON', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/invalid', {
      status: 200,
      body: 'not json',
    });

    const result = await http.get('https://api.example.com/invalid');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const jsonResult = await result.value.json();
      expect(isErr(jsonResult)).toBe(true);
      if (isErr(jsonResult)) {
        expect(jsonResult.error.code).toBe('INVALID_RESPONSE');
      }
    }
  });

  test('response.arrayBuffer() returns ArrayBuffer', async () => {
    const http = createMockHTTP();
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

    http.mockRoute('https://api.example.com/binary', {
      status: 200,
      body: data,
    });

    const result = await http.get('https://api.example.com/binary');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const bufferResult = await result.value.arrayBuffer();
      expect(isOk(bufferResult)).toBe(true);
      if (isOk(bufferResult)) {
        expect(new Uint8Array(bufferResult.value)).toEqual(data);
      }
    }
  });

  test('response.ok is true for 2xx status', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/success', {
      status: 201,
    });

    const result = await http.get('https://api.example.com/success');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ok).toBe(true);
    }
  });

  test('response.ok is false for 4xx status', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/notfound', {
      status: 404,
      statusText: 'Not Found',
    });

    const result = await http.get('https://api.example.com/notfound');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.ok).toBe(false);
      expect(result.value.status).toBe(404);
      expect(result.value.statusText).toBe('Not Found');
    }
  });

  test('response includes custom headers', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/headers', {
      status: 200,
      headers: {
        'X-Custom-Header': 'value',
        'Content-Type': 'application/json',
      },
      body: { data: 'test' },
    });

    const result = await http.get('https://api.example.com/headers');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.headers['X-Custom-Header']).toBe('value');
      expect(result.value.headers['Content-Type']).toBe('application/json');
    }
  });

  test('mockRoute can return error', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/error', {
      code: 'TIMEOUT',
      message: 'Request timed out',
    });

    const result = await http.get('https://api.example.com/error');
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('TIMEOUT');
      expect(result.error.message).toBe('Request timed out');
    }
  });

  test('getCapturedRequests returns all requests', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com', { status: 200 });

    await http.get('https://api.example.com/users');
    await http.post('https://api.example.com/users', {
      body: JSON.stringify({ name: 'Test' }),
    });

    const requests = http.getCapturedRequests();
    expect(requests.length).toBe(2);
    expect(requests[0].url).toBe('https://api.example.com/users');
    expect(requests[1].url).toBe('https://api.example.com/users');
    expect(requests[1].options?.method).toBe('POST');
  });

  test('clearCapturedRequests clears request history', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com', { status: 200 });

    await http.get('https://api.example.com/users');
    expect(http.getCapturedRequests().length).toBe(1);

    http.clearCapturedRequests();
    expect(http.getCapturedRequests().length).toBe(0);
  });

  test('clearRoutes removes all routes', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com/users', { status: 200 });
    http.clearRoutes();

    const result = await http.get('https://api.example.com/users');
    expect(isErr(result)).toBe(true);
  });

  test('setDefaultResponse sets fallback for unmatched requests', async () => {
    const http = createMockHTTP();

    http.setDefaultResponse({
      status: 404,
      body: { error: 'Not found' },
    });

    const result = await http.get('https://api.example.com/unknown');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe(404);
    }
  });

  test('convenience methods work correctly', async () => {
    const http = createMockHTTP();

    http.mockRoute('https://api.example.com', { status: 200, body: { ok: true } });

    const getResult = await http.get('https://api.example.com/get');
    expect(isOk(getResult)).toBe(true);

    const postResult = await http.post('https://api.example.com/post');
    expect(isOk(postResult)).toBe(true);

    const putResult = await http.put('https://api.example.com/put');
    expect(isOk(putResult)).toBe(true);

    const patchResult = await http.patch('https://api.example.com/patch');
    expect(isOk(patchResult)).toBe(true);

    const deleteResult = await http.delete('https://api.example.com/delete');
    expect(isOk(deleteResult)).toBe(true);

    const headResult = await http.head('https://api.example.com/head');
    expect(isOk(headResult)).toBe(true);

    const requests = http.getCapturedRequests();
    expect(requests.length).toBe(6);
  });
});

describe('createNoOpHTTP', () => {
  test('all methods fail', async () => {
    const http = createNoOpHTTP();

    const getResult = await http.get('https://api.example.com');
    expect(isErr(getResult)).toBe(true);
    if (isErr(getResult)) {
      expect(getResult.error.code).toBe('NETWORK_ERROR');
    }

    const postResult = await http.post('https://api.example.com');
    expect(isErr(postResult)).toBe(true);

    const putResult = await http.put('https://api.example.com');
    expect(isErr(putResult)).toBe(true);

    const patchResult = await http.patch('https://api.example.com');
    expect(isErr(patchResult)).toBe(true);

    const deleteResult = await http.delete('https://api.example.com');
    expect(isErr(deleteResult)).toBe(true);

    const headResult = await http.head('https://api.example.com');
    expect(isErr(headResult)).toBe(true);
  });
});
