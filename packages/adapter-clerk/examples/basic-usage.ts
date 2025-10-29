/**
 * Clerk Adapter - Basic Usage Example
 */

import { createClerkAdapter } from '@servicejs/adapter-clerk';
import { isOk } from '@servicejs/result';

async function main() {
  const clerk = createClerkAdapter();

  // Initialize
  await clerk.init({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  await clerk.start();

  // Create user
  const userResult = await clerk.createUser({
    email_address: ['user@example.com'],
    first_name: 'John',
    last_name: 'Doe',
    password: 'SecurePassword123!',
    public_metadata: { plan: 'free' },
  });

  if (isOk(userResult)) {
    console.log('User created:', userResult.value.id);

    // Get user
    const getResult = await clerk.getUser(userResult.value.id);
    if (isOk(getResult)) {
      console.log('User:', getResult.value.email_addresses[0].email_address);
    }

    // Update user
    await clerk.updateUser({
      userId: userResult.value.id,
      public_metadata: { plan: 'pro' },
    });

    // List sessions
    const sessionsResult = await clerk.getUserSessions(userResult.value.id);
    if (isOk(sessionsResult)) {
      console.log('Sessions:', sessionsResult.value.length);
    }
  }

  await clerk.stop();
  await clerk.destroy();
}

main().catch(console.error);
