import { createLuciaAdapter } from '@servicejs/adapter-lucia';
import { isOk } from '@servicejs/result';

async function main() {
  const lucia = createLuciaAdapter();

  await lucia.init({
    sessionExpiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    sessionIdleTimeout: 15 * 60 * 1000, // 15 minutes
  });

  // Create user with password
  const userResult = await lucia.createUser({
    attributes: { email: 'user@example.com', username: 'johndoe' },
    key: {
      providerId: 'email',
      providerUserId: 'user@example.com',
      password: 'SecurePassword123!',
    },
  });

  if (isOk(userResult)) {
    console.log('User created:', userResult.value.id);

    // Verify password
    const verifyResult = await lucia.verifyPassword('email', 'user@example.com', 'SecurePassword123!');
    if (isOk(verifyResult) && verifyResult.value) {
      // Create session
      const sessionResult = await lucia.createSession({
        userId: userResult.value.id,
        attributes: { device: 'desktop' },
      });

      if (isOk(sessionResult)) {
        console.log('Session created:', sessionResult.value.id);

        // Validate session
        const validateResult = await lucia.validateSession(sessionResult.value.id);
        if (isOk(validateResult)) {
          console.log('Session valid for:', validateResult.value.user.attributes.email);
        }
      }
    }
  }

  await lucia.destroy();
}

main().catch(console.error);
