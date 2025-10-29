import { createAuthJSAdapter } from '@servicejs/adapter-authjs';
import { isOk } from '@servicejs/result';

async function main() {
  const authjs = createAuthJSAdapter();

  await authjs.init({
    baseUrl: 'http://localhost:3000',
    secret: process.env.NEXTAUTH_SECRET!,
  });

  // Create user
  const userResult = await authjs.createUser({
    email: 'user@example.com',
    name: 'John Doe',
  });

  if (isOk(userResult)) {
    console.log('User created:', userResult.value.id);

    // Create session
    const sessionResult = await authjs.createSession({
      userId: userResult.value.id,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    if (isOk(sessionResult)) {
      console.log('Session token:', sessionResult.value.sessionToken);

      // Verify session
      const verifyResult = await authjs.getSessionAndUser(sessionResult.value.sessionToken);
      if (isOk(verifyResult)) {
        console.log('Session valid for:', verifyResult.value.user.email);
      }
    }
  }

  await authjs.destroy();
}

main().catch(console.error);
