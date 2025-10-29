/**
 * SuperTokens Adapter - Basic Usage Example
 */

import { createSuperTokensAdapter } from '@servicejs/adapter-supertokens';
import { isOk } from '@servicejs/result';

async function main() {
  const supertokens = createSuperTokensAdapter();

  await supertokens.init({
    connectionURI: 'http://localhost:3567',
    apiKey: process.env.SUPERTOKENS_API_KEY,
  });

  await supertokens.start();

  // Create user with email/password
  const userResult = await supertokens.createEmailPasswordUser({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  });

  if (isOk(userResult)) {
    console.log('User created:', userResult.value.id);

    // Create session
    const sessionResult = await supertokens.createSession({
      userId: userResult.value.id,
      userDataInAccessToken: { role: 'user' },
    });

    if (isOk(sessionResult)) {
      console.log('Session created:', sessionResult.value.handle);

      // Verify session
      const verifyResult = await supertokens.verifySession({
        sessionHandle: sessionResult.value.handle,
      });

      if (isOk(verifyResult)) {
        console.log('Session verified for user:', verifyResult.value.userId);
      }
    }
  }

  await supertokens.stop();
  await supertokens.destroy();
}

main().catch(console.error);
