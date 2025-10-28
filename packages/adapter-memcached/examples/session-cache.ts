/**
 * Session Cache Example with Memcached
 *
 * This example demonstrates using Memcached as a session cache
 * with automatic expiration and session management.
 *
 * Prerequisites:
 * - Start Memcached: docker run -d -p 11211:11211 memcached
 * - Run: bun run examples/session-cache.ts
 */

import { createMemcachedAdapter } from '../src/memcached.js';
import { isOk, isErr } from '@servicejs/result';
import type { CacheAdapter } from '../src/memcached.js';

interface Session {
  userId: string;
  username: string;
  email: string;
  loginTime: number;
  lastActivity: number;
  data: Record<string, unknown>;
}

class SessionManager {
  private cache: CacheAdapter;
  private readonly sessionTTL: number;
  private readonly sessionPrefix = 'session:';

  constructor(cache: CacheAdapter, sessionTTLSeconds: number = 3600) {
    this.cache = cache;
    this.sessionTTL = sessionTTLSeconds;
  }

  /**
   * Create a new session
   */
  async createSession(userId: string, username: string, email: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: Session = {
      userId,
      username,
      email,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      data: {},
    };

    const result = await this.cache.set(
      `${this.sessionPrefix}${sessionId}`,
      session,
      this.sessionTTL
    );

    if (isErr(result)) {
      throw new Error(`Failed to create session: ${result.error.message}`);
    }

    return sessionId;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.cache.get<Session>(`${this.sessionPrefix}${sessionId}`);

    if (isErr(result)) {
      throw new Error(`Failed to get session: ${result.error.message}`);
    }

    return result.value;
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, data: Record<string, unknown>): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();
    session.data = { ...session.data, ...data };

    const result = await this.cache.set(
      `${this.sessionPrefix}${sessionId}`,
      session,
      this.sessionTTL
    );

    if (isErr(result)) {
      throw new Error(`Failed to update session: ${result.error.message}`);
    }
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivity = Date.now();

    const result = await this.cache.set(
      `${this.sessionPrefix}${sessionId}`,
      session,
      this.sessionTTL
    );

    if (isErr(result)) {
      throw new Error(`Failed to refresh session: ${result.error.message}`);
    }
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    const result = await this.cache.delete(`${this.sessionPrefix}${sessionId}`);

    if (isErr(result)) {
      throw new Error(`Failed to destroy session: ${result.error.message}`);
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    const result = await this.cache.exists(`${this.sessionPrefix}${sessionId}`);

    if (isErr(result)) {
      throw new Error(`Failed to check session: ${result.error.message}`);
    }

    return result.value;
  }

  /**
   * Generate a random session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}

async function main() {
  console.log('=== Memcached Session Cache Example ===\n');

  // Create and initialize cache
  const cache = createMemcachedAdapter();

  console.log('1. Initializing cache...');
  const initResult = await cache.init({ servers: 'localhost:11211' });
  if (isErr(initResult)) {
    console.error('Failed to initialize:', initResult.error.message);
    return;
  }

  await cache.start();
  console.log('✓ Cache initialized and started\n');

  // Create session manager with 10 second TTL for demo
  const sessionManager = new SessionManager(cache, 10);

  // Create a session
  console.log('2. Creating session for user Alice...');
  const sessionId = await sessionManager.createSession(
    'user-123',
    'alice',
    'alice@example.com'
  );
  console.log(`✓ Session created: ${sessionId}\n`);

  // Get the session
  console.log('3. Getting session...');
  const session = await sessionManager.getSession(sessionId);
  if (session) {
    console.log('✓ Session data:', {
      userId: session.userId,
      username: session.username,
      email: session.email,
      loginTime: new Date(session.loginTime).toISOString(),
    });
    console.log();
  }

  // Update session with custom data
  console.log('4. Updating session with custom data...');
  await sessionManager.updateSession(sessionId, {
    preferences: { theme: 'dark', language: 'en' },
    cart: ['item1', 'item2'],
  });
  console.log('✓ Session updated\n');

  // Get updated session
  console.log('5. Getting updated session...');
  const updatedSession = await sessionManager.getSession(sessionId);
  if (updatedSession) {
    console.log('✓ Session data:', {
      username: updatedSession.username,
      customData: updatedSession.data,
    });
    console.log();
  }

  // Check if session exists
  console.log('6. Checking if session exists...');
  const exists = await sessionManager.sessionExists(sessionId);
  console.log(`✓ Session exists: ${exists}\n`);

  // Simulate waiting 3 seconds and refreshing
  console.log('7. Waiting 3 seconds and refreshing session...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  await sessionManager.refreshSession(sessionId);
  console.log('✓ Session refreshed (TTL reset to 10 seconds)\n');

  // Create another session
  console.log('8. Creating session for user Bob...');
  const sessionId2 = await sessionManager.createSession(
    'user-456',
    'bob',
    'bob@example.com'
  );
  console.log(`✓ Session created: ${sessionId2}\n`);

  // Update Bob's session
  console.log('9. Updating Bob\'s session...');
  await sessionManager.updateSession(sessionId2, {
    preferences: { theme: 'light', language: 'fr' },
  });
  console.log('✓ Session updated\n');

  // Destroy Alice's session
  console.log('10. Destroying Alice\'s session...');
  await sessionManager.destroySession(sessionId);
  console.log('✓ Session destroyed\n');

  // Verify Alice's session is gone
  console.log('11. Verifying Alice\'s session is destroyed...');
  const aliceExists = await sessionManager.sessionExists(sessionId);
  console.log(`✓ Alice's session exists: ${aliceExists}\n`);

  // Bob's session should still exist
  console.log('12. Verifying Bob\'s session still exists...');
  const bobExists = await sessionManager.sessionExists(sessionId2);
  console.log(`✓ Bob's session exists: ${bobExists}\n`);

  // Get Bob's session
  const bobSession = await sessionManager.getSession(sessionId2);
  if (bobSession) {
    console.log('✓ Bob\'s session:', {
      username: bobSession.username,
      data: bobSession.data,
    });
    console.log();
  }

  // Wait for Bob's session to expire
  console.log('13. Waiting 11 seconds for Bob\'s session to expire...');
  await new Promise(resolve => setTimeout(resolve, 11000));

  console.log('14. Checking if Bob\'s session expired...');
  const bobExistsAfter = await sessionManager.sessionExists(sessionId2);
  console.log(`✓ Bob's session exists: ${bobExistsAfter} (expired)\n`);

  // Cleanup
  console.log('15. Cleaning up...');
  await cache.flush();
  await cache.stop();
  await cache.destroy();
  console.log('✓ Cache cleaned up\n');

  console.log('=== Example Complete ===');
}

main().catch(console.error);
