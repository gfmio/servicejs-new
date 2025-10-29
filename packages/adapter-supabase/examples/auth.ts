/**
 * Supabase Authentication Example
 *
 * Demonstrates user authentication with Supabase Auth
 */

import { createSupabaseAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';

async function main() {
  const adapter = createSupabaseAdapter();

  await adapter.init({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });

  await adapter.start();

  // Sign up a new user
  console.log('\n--- Sign Up ---');
  const signUpResult = await adapter.signUp({
    email: 'test@example.com',
    password: 'securepassword123',
    options: {
      data: {
        name: 'Test User',
        age: 25,
      },
    },
  });

  if (isOk(signUpResult)) {
    console.log('User signed up:', signUpResult.value.user?.email);
    console.log('Session:', signUpResult.value.session?.access_token ? 'Created' : 'None');
  } else {
    console.error('Sign up failed:', signUpResult.error.message);
  }

  // Sign in
  console.log('\n--- Sign In ---');
  const signInResult = await adapter.signIn({
    email: 'test@example.com',
    password: 'securepassword123',
  });

  if (isOk(signInResult)) {
    console.log('User signed in:', signInResult.value.user?.email);
    console.log('Access token:', signInResult.value.session?.access_token?.substring(0, 20) + '...');
  } else {
    console.error('Sign in failed:', signInResult.error.message);
  }

  // Get current session
  console.log('\n--- Get Session ---');
  const sessionResult = await adapter.getSession();

  if (isOk(sessionResult)) {
    if (sessionResult.value) {
      console.log('Current session expires at:', new Date(sessionResult.value.expires_at! * 1000));
    } else {
      console.log('No active session');
    }
  }

  // Get current user
  console.log('\n--- Get User ---');
  const userResult = await adapter.getUser();

  if (isOk(userResult)) {
    if (userResult.value) {
      console.log('Current user:', userResult.value.email);
      console.log('User metadata:', userResult.value.user_metadata);
    } else {
      console.log('No authenticated user');
    }
  }

  // Listen to auth state changes
  console.log('\n--- Auth State Changes ---');
  const unsubscribe = adapter.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    console.log('Session:', session ? 'Active' : 'None');
  });

  // Wait a bit to see auth events
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Sign out
  console.log('\n--- Sign Out ---');
  const signOutResult = await adapter.signOut();

  if (isOk(signOutResult)) {
    console.log('User signed out');
  } else {
    console.error('Sign out failed:', signOutResult.error.message);
  }

  // Stop listening to auth changes
  unsubscribe();

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
