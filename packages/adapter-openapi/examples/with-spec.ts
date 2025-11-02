/**
 * OpenAPI with specification example
 */

import { createOpenAPIAdapter, type OpenAPISpec } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createOpenAPIAdapter();

  // Define an OpenAPI specification
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: 'User API',
      version: '1.0.0',
    },
    paths: {
      '/users': {
        get: {
          operationId: 'listUsers',
          summary: 'List all users',
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/users/{id}': {
        get: {
          operationId: 'getUser',
          summary: 'Get user by ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'User details',
            },
          },
        },
      },
    },
  };

  // Initialize with spec
  await adapter.init({
    baseURL: process.env.API_BASE_URL || 'https://api.example.com',
    spec,
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  });

  await adapter.start();

  console.log('=== Loaded OpenAPI Spec ===');
  const loadedSpec = adapter.getSpec();
  if (loadedSpec) {
    console.log('API Title:', loadedSpec.info.title);
    console.log('API Version:', loadedSpec.info.version);
    console.log('Available paths:', Object.keys(loadedSpec.paths));
  }

  console.log('\n=== Call API Using Spec ===');

  // Use the API based on the spec
  const usersResult = await adapter.get<Array<{ id: string; name: string }>>(
    '/users'
  );

  if (isOk(usersResult)) {
    console.log(`Found ${usersResult.value.length} users`);
  }

  const userResult = await adapter.get<{ id: string; name: string }>(
    '/users/{id}',
    {
      path: { id: '123' },
    }
  );

  if (isOk(userResult)) {
    console.log('User:', userResult.value.name);
  }

  await adapter.stop();
}

main().catch(console.error);
