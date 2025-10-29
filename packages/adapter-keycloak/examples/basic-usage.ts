import { createKeycloakAdapter } from '@servicejs/adapter-keycloak';
import { isOk } from '@servicejs/result';

async function main() {
  const keycloak = createKeycloakAdapter();

  await keycloak.init({
    serverUrl: 'http://localhost:8080',
    realm: 'master',
    clientId: 'admin-cli',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
  });

  await keycloak.start();

  // Create user
  const userIdResult = await keycloak.createUser({
    username: 'johndoe',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    credentials: [{
      type: 'password',
      value: 'password123',
      temporary: false,
    }],
  });

  if (isOk(userIdResult)) {
    console.log('User created:', userIdResult.value);

    // Get user
    const user = await keycloak.getUser(userIdResult.value);
    if (isOk(user)) {
      console.log('User:', user.value.username);
    }

    // Send verification email
    await keycloak.sendVerifyEmail(userIdResult.value);
  }

  await keycloak.destroy();
}

main().catch(console.error);
