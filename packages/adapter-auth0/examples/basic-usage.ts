/**
 * Auth0 Adapter - Basic Usage Example
 */

import { createAuth0Adapter } from '@servicejs/adapter-auth0';
import { isOk } from '@servicejs/result';

async function main() {
  // Create adapter instance
  const auth0 = createAuth0Adapter();

  // Initialize with Auth0 configuration
  const initResult = await auth0.init({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    scope: 'openid profile email offline_access',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Start the adapter
  await auth0.start();

  // Example 1: Sign up a new user
  console.log('\n=== Sign Up ===');
  const signupResult = await auth0.signup({
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    name: 'John Doe',
    user_metadata: {
      preferences: {
        theme: 'dark',
        notifications: true,
      },
    },
  });

  if (isOk(signupResult)) {
    console.log('User created:', signupResult.value.user_id);
  } else {
    console.error('Signup failed:', signupResult.error.message);
  }

  // Example 2: Log in with username/password
  console.log('\n=== Login ===');
  const loginResult = await auth0.login({
    email: 'user@example.com',
    password: 'UserPassword123!',
  });

  if (isOk(loginResult)) {
    console.log('Login successful!');
    console.log('Access token:', loginResult.value.access_token);
    console.log('ID token:', loginResult.value.id_token);
    console.log('Expires in:', loginResult.value.expires_in, 'seconds');

    // Verify the access token
    const verifyResult = await auth0.verifyToken({
      token: loginResult.value.access_token,
    });

    if (isOk(verifyResult)) {
      console.log('Token payload:', verifyResult.value);
    }
  } else {
    console.error('Login failed:', loginResult.error.message);
  }

  // Example 3: Get user profile
  if (isOk(loginResult)) {
    console.log('\n=== Get User Profile ===');
    // Extract user ID from token
    const verifyResult = await auth0.verifyToken({
      token: loginResult.value.access_token,
    });

    if (isOk(verifyResult)) {
      const userId = verifyResult.value.sub;
      const userResult = await auth0.getUser(userId);

      if (isOk(userResult)) {
        console.log('User profile:', {
          id: userResult.value.user_id,
          email: userResult.value.email,
          name: userResult.value.name,
          email_verified: userResult.value.email_verified,
        });
      }
    }
  }

  // Example 4: Update user profile
  console.log('\n=== Update User ===');
  if (isOk(loginResult)) {
    const verifyResult = await auth0.verifyToken({
      token: loginResult.value.access_token,
    });

    if (isOk(verifyResult)) {
      const updateResult = await auth0.updateUser({
        userId: verifyResult.value.sub,
        name: 'John Updated Doe',
        user_metadata: {
          preferences: {
            theme: 'light',
            notifications: false,
          },
        },
      });

      if (isOk(updateResult)) {
        console.log('User updated:', updateResult.value.name);
      }
    }
  }

  // Example 5: Password reset
  console.log('\n=== Password Reset ===');
  const resetResult = await auth0.resetPassword({
    email: 'user@example.com',
  });

  if (isOk(resetResult)) {
    console.log('Password reset email sent');
  } else {
    console.error('Password reset failed:', resetResult.error.message);
  }

  // Example 6: Refresh token
  if (isOk(loginResult) && loginResult.value.refresh_token) {
    console.log('\n=== Refresh Token ===');
    const refreshResult = await auth0.refreshToken(loginResult.value.refresh_token);

    if (isOk(refreshResult)) {
      console.log('Token refreshed successfully');
      console.log('New access token:', refreshResult.value.access_token);
    }
  }

  // Example 7: Revoke token
  if (isOk(loginResult) && loginResult.value.refresh_token) {
    console.log('\n=== Revoke Token ===');
    const revokeResult = await auth0.revokeToken(loginResult.value.refresh_token);

    if (isOk(revokeResult)) {
      console.log('Token revoked successfully');
    }
  }

  // Cleanup
  await auth0.stop();
  await auth0.destroy();
}

main().catch(console.error);
