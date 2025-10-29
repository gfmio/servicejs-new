import { createCasbinAdapter } from '@servicejs/adapter-casbin';
import { isOk } from '@servicejs/result';

async function main() {
  const casbin = createCasbinAdapter();

  // Initialize with RBAC model
  await casbin.init({
    model: 'RBAC',
    policy: [
      // Define permissions for roles
      ['p', 'admin', 'data1', 'read'],
      ['p', 'admin', 'data1', 'write'],
      ['p', 'admin', 'data2', '*'], // Admin can do anything with data2
      ['p', 'user', 'data1', 'read'],

      // Define role inheritance
      ['g', 'alice', 'admin'],
      ['g', 'bob', 'user'],
    ],
  });

  console.log('=== Checking Permissions ===\n');

  // Check Alice's permissions (admin)
  const aliceReadResult = await casbin.enforce('alice', 'data1', 'read');
  if (isOk(aliceReadResult)) {
    console.log('Alice can read data1:', aliceReadResult.value);
  }

  const aliceWriteResult = await casbin.enforce('alice', 'data1', 'write');
  if (isOk(aliceWriteResult)) {
    console.log('Alice can write data1:', aliceWriteResult.value);
  }

  // Check Bob's permissions (user)
  const bobReadResult = await casbin.enforce('bob', 'data1', 'read');
  if (isOk(bobReadResult)) {
    console.log('Bob can read data1:', bobReadResult.value);
  }

  const bobWriteResult = await casbin.enforce('bob', 'data1', 'write');
  if (isOk(bobWriteResult)) {
    console.log('Bob can write data1:', bobWriteResult.value);
  }

  console.log('\n=== Batch Enforcement ===\n');

  // Check multiple permissions at once
  const batchResult = await casbin.batchEnforce([
    ['alice', 'data1', 'read'],
    ['alice', 'data1', 'write'],
    ['bob', 'data1', 'read'],
    ['bob', 'data1', 'write'],
    ['alice', 'data2', 'delete'], // Wildcard match
  ]);

  if (isOk(batchResult)) {
    console.log('Batch results:', batchResult.value);
  }

  console.log('\n=== Adding New Roles and Policies ===\n');

  // Add a new role
  await casbin.addRoleForUser('charlie', 'user');

  // Check Charlie's permissions
  const charlieResult = await casbin.enforce('charlie', 'data1', 'read');
  if (isOk(charlieResult)) {
    console.log('Charlie can read data1:', charlieResult.value);
  }

  // Add a new policy
  await casbin.addPolicy('user', 'data3', 'read');

  const charlieData3Result = await casbin.enforce('charlie', 'data3', 'read');
  if (isOk(charlieData3Result)) {
    console.log('Charlie can read data3:', charlieData3Result.value);
  }

  console.log('\n=== Role Management ===\n');

  // Get all roles for a user
  const aliceRolesResult = await casbin.getRolesForUser('alice');
  if (isOk(aliceRolesResult)) {
    console.log('Alice has roles:', aliceRolesResult.value);
  }

  // Get all users with a role
  const adminUsersResult = await casbin.getUsersForRole('admin');
  if (isOk(adminUsersResult)) {
    console.log('Users with admin role:', adminUsersResult.value);
  }

  console.log('\n=== Querying Policies ===\n');

  // Get all subjects (users/roles with policies)
  const subjectsResult = await casbin.getAllSubjects();
  if (isOk(subjectsResult)) {
    console.log('All subjects:', subjectsResult.value);
  }

  // Get all objects (resources)
  const objectsResult = await casbin.getAllObjects();
  if (isOk(objectsResult)) {
    console.log('All objects:', objectsResult.value);
  }

  // Get all actions
  const actionsResult = await casbin.getAllActions();
  if (isOk(actionsResult)) {
    console.log('All actions:', actionsResult.value);
  }

  await casbin.destroy();
}

main().catch(console.error);
