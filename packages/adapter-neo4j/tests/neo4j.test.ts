import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createNeo4jAdapter } from '../src/neo4j.js';
import { isOk } from '@servicejs/result';

describe('Neo4j Adapter', () => {
  let container: StartedTestContainer | undefined;
  let adapter: ReturnType<typeof createNeo4jAdapter>;
  let config: { uri: string; username: string; password: string };

  beforeAll(async () => {
    try {
      container = await new GenericContainer('neo4j:5')
        .withExposedPorts(7687)
        .withEnvironment({ NEO4J_AUTH: 'neo4j/testpassword' })
        .withStartupTimeout(120000)
        .start();

      config = {
        uri: `bolt://${container.getHost()}:${container.getMappedPort(7687)}`,
        username: 'neo4j',
        password: 'testpassword',
      };

      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.warn('Failed to start Neo4j container:', error);
      config = {
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'testpassword',
      };
    }

    adapter = createNeo4jAdapter();
  }, 120000);

  afterAll(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  beforeEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    adapter = createNeo4jAdapter();
  });

  test('init succeeds with valid config', async () => {
    const result = await adapter.init(config);
    expect(isOk(result)).toBe(true);
  }, 30000);

  test('health check works', async () => {
    await adapter.init(config);
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.ok.status).toBe('healthy');
    }
  });

  test('can create and query nodes', async () => {
    await adapter.init(config);
    await adapter.start();

    await adapter.query({
      cypher: 'CREATE (p:Person {name: $name, age: $age})',
      params: { name: 'Alice', age: 30 },
    });

    const result = await adapter.query({
      cypher: 'MATCH (p:Person {name: $name}) RETURN p',
      params: { name: 'Alice' },
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.ok.rows.length).toBe(1);
    }
  });
});
