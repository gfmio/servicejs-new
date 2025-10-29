import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createCasbinAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

describe('Casbin Adapter', () => {
  let adapter: ReturnType<typeof createCasbinAdapter>;

  beforeEach(() => {
    adapter = createCasbinAdapter();
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  test('init with default config', async () => {
    const result = await adapter.init({
      model: 'ACL',
    });
    expect(isOk(result)).toBe(true);
  });

  test('init with initial policies', async () => {
    const result = await adapter.init({
      model: 'RBAC',
      policy: [
        ['p', 'alice', 'data1', 'read'],
        ['p', 'bob', 'data2', 'write'],
        ['g', 'alice', 'admin'],
      ],
    });
    expect(isOk(result)).toBe(true);

    const enforceResult = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(enforceResult)) {
      expect(enforceResult.value).toBe(true);
    }
  });

  test('enforce direct policy match', async () => {
    await adapter.init({ model: 'ACL' });
    await adapter.addPolicy('alice', 'data1', 'read');

    const result = await adapter.enforce('alice', 'data1', 'read');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(true);
    }
  });

  test('enforce policy not found', async () => {
    await adapter.init({ model: 'ACL' });

    const result = await adapter.enforce('alice', 'data1', 'read');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(false);
    }
  });

  test('enforce with role-based policy', async () => {
    await adapter.init({ model: 'RBAC' });
    await adapter.addPolicy('admin', 'data1', 'read');
    await adapter.addRoleForUser('alice', 'admin');

    const result = await adapter.enforce('alice', 'data1', 'read');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(true);
    }
  });

  test('enforce with wildcard object', async () => {
    await adapter.init({ model: 'ACL' });
    await adapter.addPolicy('alice', '*', 'read');

    const result1 = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(result1)) {
      expect(result1.value).toBe(true);
    }

    const result2 = await adapter.enforce('alice', 'data2', 'read');
    if (isOk(result2)) {
      expect(result2.value).toBe(true);
    }
  });

  test('enforce with wildcard action', async () => {
    await adapter.init({ model: 'ACL' });
    await adapter.addPolicy('alice', 'data1', '*');

    const result1 = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(result1)) {
      expect(result1.value).toBe(true);
    }

    const result2 = await adapter.enforce('alice', 'data1', 'write');
    if (isOk(result2)) {
      expect(result2.value).toBe(true);
    }
  });

  test('batch enforce', async () => {
    await adapter.init({ model: 'ACL' });
    await adapter.addPolicy('alice', 'data1', 'read');
    await adapter.addPolicy('bob', 'data2', 'write');

    const result = await adapter.batchEnforce([
      ['alice', 'data1', 'read'],
      ['bob', 'data2', 'write'],
      ['alice', 'data2', 'read'],
    ]);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual([true, true, false]);
    }
  });

  test('add and remove policy', async () => {
    await adapter.init({ model: 'ACL' });

    const addResult = await adapter.addPolicy('alice', 'data1', 'read');
    expect(isOk(addResult)).toBe(true);
    if (isOk(addResult)) {
      expect(addResult.value).toBe(true);
    }

    const enforceResult = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(enforceResult)) {
      expect(enforceResult.value).toBe(true);
    }

    const removeResult = await adapter.removePolicy('alice', 'data1', 'read');
    expect(isOk(removeResult)).toBe(true);
    if (isOk(removeResult)) {
      expect(removeResult.value).toBe(true);
    }

    const enforceResult2 = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(enforceResult2)) {
      expect(enforceResult2.value).toBe(false);
    }
  });

  test('add duplicate policy returns false', async () => {
    await adapter.init({ model: 'ACL' });

    const result1 = await adapter.addPolicy('alice', 'data1', 'read');
    if (isOk(result1)) {
      expect(result1.value).toBe(true);
    }

    const result2 = await adapter.addPolicy('alice', 'data1', 'read');
    if (isOk(result2)) {
      expect(result2.value).toBe(false);
    }
  });

  test('get policy', async () => {
    await adapter.init({ model: 'ACL' });
    await adapter.addPolicy('alice', 'data1', 'read');
    await adapter.addPolicy('bob', 'data2', 'write');

    const result = await adapter.getPolicy();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(2);
      expect(result.value).toContainEqual(['alice', 'data1', 'read']);
      expect(result.value).toContainEqual(['bob', 'data2', 'write']);
    }
  });

  test('add and get role for user', async () => {
    await adapter.init({ model: 'RBAC' });

    const addResult = await adapter.addRoleForUser('alice', 'admin');
    expect(isOk(addResult)).toBe(true);
    if (isOk(addResult)) {
      expect(addResult.value).toBe(true);
    }

    const getRolesResult = await adapter.getRolesForUser('alice');
    expect(isOk(getRolesResult)).toBe(true);
    if (isOk(getRolesResult)) {
      expect(getRolesResult.value).toContain('admin');
    }
  });

  test('add role for user with domain', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addRoleForUser('alice', 'admin', 'domain1');
    await adapter.addRoleForUser('alice', 'user', 'domain2');

    const result1 = await adapter.getRolesForUser('alice', 'domain1');
    if (isOk(result1)) {
      expect(result1.value).toEqual(['admin']);
    }

    const result2 = await adapter.getRolesForUser('alice', 'domain2');
    if (isOk(result2)) {
      expect(result2.value).toEqual(['user']);
    }
  });

  test('delete role for user', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addRoleForUser('alice', 'admin');
    await adapter.addRoleForUser('alice', 'user');

    const deleteResult = await adapter.deleteRoleForUser('alice', 'admin');
    expect(isOk(deleteResult)).toBe(true);
    if (isOk(deleteResult)) {
      expect(deleteResult.value).toBe(true);
    }

    const getRolesResult = await adapter.getRolesForUser('alice');
    if (isOk(getRolesResult)) {
      expect(getRolesResult.value).toEqual(['user']);
    }
  });

  test('get users for role', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addRoleForUser('alice', 'admin');
    await adapter.addRoleForUser('bob', 'admin');

    const result = await adapter.getUsersForRole('admin');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toContain('alice');
      expect(result.value).toContain('bob');
    }
  });

  test('has role for user', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addRoleForUser('alice', 'admin');

    const result1 = await adapter.hasRoleForUser('alice', 'admin');
    if (isOk(result1)) {
      expect(result1.value).toBe(true);
    }

    const result2 = await adapter.hasRoleForUser('alice', 'user');
    if (isOk(result2)) {
      expect(result2.value).toBe(false);
    }
  });

  test('delete all roles for user', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addRoleForUser('alice', 'admin');
    await adapter.addRoleForUser('alice', 'user');

    const deleteResult = await adapter.deleteRolesForUser('alice');
    expect(isOk(deleteResult)).toBe(true);
    if (isOk(deleteResult)) {
      expect(deleteResult.value).toBe(true);
    }

    const getRolesResult = await adapter.getRolesForUser('alice');
    if (isOk(getRolesResult)) {
      expect(getRolesResult.value).toEqual([]);
    }
  });

  test('delete user removes all policies', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addPolicy('alice', 'data1', 'read');
    await adapter.addRoleForUser('alice', 'admin');

    const deleteResult = await adapter.deleteUser('alice');
    expect(isOk(deleteResult)).toBe(true);
    if (isOk(deleteResult)) {
      expect(deleteResult.value).toBe(true);
    }

    const enforceResult = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(enforceResult)) {
      expect(enforceResult.value).toBe(false);
    }

    const getRolesResult = await adapter.getRolesForUser('alice');
    if (isOk(getRolesResult)) {
      expect(getRolesResult.value).toEqual([]);
    }
  });

  test('delete role removes policies and inheritance', async () => {
    await adapter.init({ model: 'RBAC' });

    await adapter.addPolicy('admin', 'data1', 'read');
    await adapter.addRoleForUser('alice', 'admin');

    const enforceResult1 = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(enforceResult1)) {
      expect(enforceResult1.value).toBe(true);
    }

    const deleteResult = await adapter.deleteRole('admin');
    expect(isOk(deleteResult)).toBe(true);
    if (isOk(deleteResult)) {
      expect(deleteResult.value).toBe(true);
    }

    const enforceResult2 = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(enforceResult2)) {
      expect(enforceResult2.value).toBe(false);
    }

    const getRolesResult = await adapter.getRolesForUser('alice');
    if (isOk(getRolesResult)) {
      expect(getRolesResult.value).toEqual([]);
    }
  });

  test('get all subjects', async () => {
    await adapter.init({ model: 'ACL' });

    await adapter.addPolicy('alice', 'data1', 'read');
    await adapter.addPolicy('bob', 'data2', 'write');
    await adapter.addPolicy('alice', 'data3', 'delete');

    const result = await adapter.getAllSubjects();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(2);
      expect(result.value).toContain('alice');
      expect(result.value).toContain('bob');
    }
  });

  test('get all objects', async () => {
    await adapter.init({ model: 'ACL' });

    await adapter.addPolicy('alice', 'data1', 'read');
    await adapter.addPolicy('bob', 'data2', 'write');
    await adapter.addPolicy('alice', 'data1', 'delete');

    const result = await adapter.getAllObjects();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(2);
      expect(result.value).toContain('data1');
      expect(result.value).toContain('data2');
    }
  });

  test('get all actions', async () => {
    await adapter.init({ model: 'ACL' });

    await adapter.addPolicy('alice', 'data1', 'read');
    await adapter.addPolicy('bob', 'data2', 'write');
    await adapter.addPolicy('alice', 'data1', 'read');

    const result = await adapter.getAllActions();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(2);
      expect(result.value).toContain('read');
      expect(result.value).toContain('write');
    }
  });

  test('health check when initialized', async () => {
    await adapter.init({ model: 'ACL' });

    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('healthy');
    }
  });

  test('health check when not initialized', async () => {
    const result = await adapter.health();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.status).toBe('unhealthy');
    }
  });

  test('complex RBAC scenario', async () => {
    await adapter.init({ model: 'RBAC' });

    // Set up roles and policies
    await adapter.addPolicy('admin', 'data1', 'read');
    await adapter.addPolicy('admin', 'data1', 'write');
    await adapter.addPolicy('user', 'data1', 'read');

    // Assign roles
    await adapter.addRoleForUser('alice', 'admin');
    await adapter.addRoleForUser('bob', 'user');

    // Alice (admin) can read and write
    const aliceRead = await adapter.enforce('alice', 'data1', 'read');
    if (isOk(aliceRead)) {
      expect(aliceRead.value).toBe(true);
    }

    const aliceWrite = await adapter.enforce('alice', 'data1', 'write');
    if (isOk(aliceWrite)) {
      expect(aliceWrite.value).toBe(true);
    }

    // Bob (user) can only read
    const bobRead = await adapter.enforce('bob', 'data1', 'read');
    if (isOk(bobRead)) {
      expect(bobRead.value).toBe(true);
    }

    const bobWrite = await adapter.enforce('bob', 'data1', 'write');
    if (isOk(bobWrite)) {
      expect(bobWrite.value).toBe(false);
    }
  });
});
