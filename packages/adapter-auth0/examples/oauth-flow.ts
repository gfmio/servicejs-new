/**
 * Auth0 Adapter - OAuth Authorization Code Flow Example
 */

import { createAuth0Adapter } from '@servicejs/adapter-auth0';
import { isOk } from '@servicejs/result';

async function main() {
  // Create and initialize adapter
  const auth0 = createAuth0Adapter();

  await auth0.init({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
  });

  await auth0.start();

  // Step 1: Generate authorization URL
  console.log('=== OAuth Authorization Flow ===\n');

  const redirectUri = 'http://localhost:3000/callback';
  const state = generateRandomState();

  const authUrl = auth0.getAuthorizationUrl(redirectUri, state);

  console.log('1. Redirect user to:');
  console.log(authUrl);
  console.log('\n2. User authenticates and authorizes app');
  console.log('3. Auth0 redirects back to:', redirectUri);
  console.log('   with code and state parameters\n');

  // Simulate receiving callback (in real app, this would be an HTTP endpoint)
  const simulatedCode = 'simulated-authorization-code';
  const receivedState = state;

  // Step 2: Verify state parameter (CSRF protection)
  if (receivedState !== state) {
    console.error('State mismatch - possible CSRF attack!');
    return;
  }

  console.log('4. Exchange authorization code for tokens\n');

  // Step 3: Exchange authorization code for tokens
  const tokenResult = await auth0.exchangeCode(simulatedCode, redirectUri);

  if (isOk(tokenResult)) {
    console.log('Token exchange successful!');
    console.log('Access token:', tokenResult.value.access_token.substring(0, 20) + '...');
    console.log('ID token:', tokenResult.value.id_token?.substring(0, 20) + '...');
    console.log('Refresh token:', tokenResult.value.refresh_token?.substring(0, 20) + '...');
    console.log('Expires in:', tokenResult.value.expires_in, 'seconds');

    // Step 4: Verify ID token
    if (tokenResult.value.id_token) {
      console.log('\n5. Verify ID token\n');
      const verifyResult = await auth0.verifyToken({
        token: tokenResult.value.id_token,
      });

      if (isOk(verifyResult)) {
        console.log('User information from ID token:');
        console.log('  Subject (User ID):', verifyResult.value.sub);
        console.log('  Email:', verifyResult.value.email);
        console.log('  Name:', verifyResult.value.name);
        console.log('  Email verified:', verifyResult.value.email_verified);
      }
    }

    // Step 5: Use access token for API calls
    console.log('\n6. Use access token for API calls');
    console.log('   Authorization: Bearer', tokenResult.value.access_token.substring(0, 20) + '...');

    // Step 6: Refresh token when expired
    if (tokenResult.value.refresh_token) {
      console.log('\n7. Refresh access token when expired\n');
      const refreshResult = await auth0.refreshToken(tokenResult.value.refresh_token);

      if (isOk(refreshResult)) {
        console.log('Token refreshed successfully');
        console.log('New access token:', refreshResult.value.access_token.substring(0, 20) + '...');
      }
    }

    // Step 7: Logout
    console.log('\n8. Logout user\n');
    const logoutUrl = auth0.getLogoutUrl('http://localhost:3000');
    console.log('Redirect user to:', logoutUrl);
  } else {
    console.error('Token exchange failed:', tokenResult.error.message);
  }

  // Cleanup
  await auth0.stop();
  await auth0.destroy();
}

function generateRandomState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

main().catch(console.error);
