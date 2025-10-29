/**
 * Lucia Adapter for ServiceJS
 *
 * Provides lightweight session-based authentication with Lucia.
 */

import { ok, err, type Result } from '@servicejs/result';

export interface LuciaAdapterConfig {
  /** Session expiry time in milliseconds (default: 30 days) */
  sessionExpiresIn?: number;

  /** Session idle timeout in milliseconds (optional) */
  sessionIdleTimeout?: number;
}

export interface LuciaUser {
  id: string;
  attributes: Record<string, any>;
}

export interface LuciaSession {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  idleExpiresAt?: Date;
  attributes: Record<string, any>;
}

export interface LuciaKey {
  id: string;
  userId: string;
  hashedPassword: string | null;
}

export interface CreateUserOptions {
  userId?: string;
  attributes?: Record<string, any>;
  key?: {
    providerId: string;
    providerUserId: string;
    password?: string;
  };
}

export interface CreateSessionOptions {
  userId: string;
  attributes?: Record<string, any>;
}

export interface LuciaAdapter {
  init(config?: LuciaAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Create user
   */
  createUser(options: CreateUserOptions): Promise<Result<LuciaUser, Error>>;

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<Result<LuciaUser, Error>>;

  /**
   * Update user attributes
   */
  updateUser(userId: string, attributes: Record<string, any>): Promise<Result<LuciaUser, Error>>;

  /**
   * Delete user
   */
  deleteUser(userId: string): Promise<Result<void, Error>>;

  /**
   * Create session
   */
  createSession(options: CreateSessionOptions): Promise<Result<LuciaSession, Error>>;

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Promise<Result<LuciaSession, Error>>;

  /**
   * Validate session (checks expiry)
   */
  validateSession(sessionId: string): Promise<Result<{ session: LuciaSession; user: LuciaUser }, Error>>;

  /**
   * Invalidate session
   */
  invalidateSession(sessionId: string): Promise<Result<void, Error>>;

  /**
   * Invalidate all sessions for user
   */
  invalidateAllUserSessions(userId: string): Promise<Result<void, Error>>;

  /**
   * Create key (for password or OAuth)
   */
  createKey(userId: string, providerId: string, providerUserId: string, password?: string): Promise<Result<LuciaKey, Error>>;

  /**
   * Get key
   */
  getKey(providerId: string, providerUserId: string): Promise<Result<LuciaKey, Error>>;

  /**
   * Delete key
   */
  deleteKey(providerId: string, providerUserId: string): Promise<Result<void, Error>>;

  /**
   * Verify password
   */
  verifyPassword(providerId: string, providerUserId: string, password: string): Promise<Result<boolean, Error>>;
}

export const createLuciaAdapter = (): LuciaAdapter => {
  let config: LuciaAdapterConfig | null = null;

  // In-memory storage
  const users = new Map<string, LuciaUser>();
  const sessions = new Map<string, LuciaSession>();
  const keys = new Map<string, LuciaKey>();

  const generateId = () => crypto.randomUUID();

  const hashPassword = async (password: string): Promise<string> => {
    // Simple hash for demo (in production use bcrypt/argon2)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  return {
    init: async (cfg?: LuciaAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = {
          sessionExpiresIn: cfg?.sessionExpiresIn ?? 30 * 24 * 60 * 60 * 1000, // 30 days
          sessionIdleTimeout: cfg?.sessionIdleTimeout,
        };
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => ok(undefined),

    destroy: async (): Promise<Result<void, Error>> => {
      config = null;
      users.clear();
      sessions.clear();
      keys.clear();
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      return ok({ status: config ? 'healthy' : 'unhealthy' });
    },

    createUser: async (options: CreateUserOptions): Promise<Result<LuciaUser, Error>> => {
      const userId = options.userId || generateId();
      const user: LuciaUser = {
        id: userId,
        attributes: options.attributes || {},
      };

      users.set(userId, user);

      // Create key if provided
      if (options.key) {
        const keyId = `${options.key.providerId}:${options.key.providerUserId}`;
        const hashedPassword = options.key.password ? await hashPassword(options.key.password) : null;

        keys.set(keyId, {
          id: keyId,
          userId,
          hashedPassword,
        });
      }

      return ok(user);
    },

    getUser: async (userId: string): Promise<Result<LuciaUser, Error>> => {
      const user = users.get(userId);
      if (!user) {
        return err(new Error('User not found'));
      }
      return ok(user);
    },

    updateUser: async (userId: string, attributes: Record<string, any>): Promise<Result<LuciaUser, Error>> => {
      const user = users.get(userId);
      if (!user) {
        return err(new Error('User not found'));
      }

      const updatedUser = {
        ...user,
        attributes: { ...user.attributes, ...attributes },
      };

      users.set(userId, updatedUser);
      return ok(updatedUser);
    },

    deleteUser: async (userId: string): Promise<Result<void, Error>> => {
      users.delete(userId);

      // Delete user's sessions
      for (const [id, session] of sessions.entries()) {
        if (session.userId === userId) {
          sessions.delete(id);
        }
      }

      // Delete user's keys
      for (const [id, key] of keys.entries()) {
        if (key.userId === userId) {
          keys.delete(id);
        }
      }

      return ok(undefined);
    },

    createSession: async (options: CreateSessionOptions): Promise<Result<LuciaSession, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      const sessionId = generateId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.sessionExpiresIn!);

      const session: LuciaSession = {
        id: sessionId,
        userId: options.userId,
        expiresAt,
        createdAt: now,
        idleExpiresAt: config.sessionIdleTimeout
          ? new Date(now.getTime() + config.sessionIdleTimeout)
          : undefined,
        attributes: options.attributes || {},
      };

      sessions.set(sessionId, session);
      return ok(session);
    },

    getSession: async (sessionId: string): Promise<Result<LuciaSession, Error>> => {
      const session = sessions.get(sessionId);
      if (!session) {
        return err(new Error('Session not found'));
      }
      return ok(session);
    },

    validateSession: async (sessionId: string): Promise<Result<{ session: LuciaSession; user: LuciaUser }, Error>> => {
      const session = sessions.get(sessionId);
      if (!session) {
        return err(new Error('Session not found'));
      }

      const now = new Date();

      // Check if session is expired
      if (session.expiresAt < now) {
        sessions.delete(sessionId);
        return err(new Error('Session expired'));
      }

      // Check idle timeout
      if (session.idleExpiresAt && session.idleExpiresAt < now) {
        sessions.delete(sessionId);
        return err(new Error('Session idle timeout'));
      }

      const user = users.get(session.userId);
      if (!user) {
        return err(new Error('User not found'));
      }

      // Update idle timeout
      if (config?.sessionIdleTimeout) {
        session.idleExpiresAt = new Date(now.getTime() + config.sessionIdleTimeout);
        sessions.set(sessionId, session);
      }

      return ok({ session, user });
    },

    invalidateSession: async (sessionId: string): Promise<Result<void, Error>> => {
      sessions.delete(sessionId);
      return ok(undefined);
    },

    invalidateAllUserSessions: async (userId: string): Promise<Result<void, Error>> => {
      for (const [id, session] of sessions.entries()) {
        if (session.userId === userId) {
          sessions.delete(id);
        }
      }
      return ok(undefined);
    },

    createKey: async (
      userId: string,
      providerId: string,
      providerUserId: string,
      password?: string
    ): Promise<Result<LuciaKey, Error>> => {
      const keyId = `${providerId}:${providerUserId}`;
      const hashedPassword = password ? await hashPassword(password) : null;

      const key: LuciaKey = {
        id: keyId,
        userId,
        hashedPassword,
      };

      keys.set(keyId, key);
      return ok(key);
    },

    getKey: async (providerId: string, providerUserId: string): Promise<Result<LuciaKey, Error>> => {
      const keyId = `${providerId}:${providerUserId}`;
      const key = keys.get(keyId);

      if (!key) {
        return err(new Error('Key not found'));
      }

      return ok(key);
    },

    deleteKey: async (providerId: string, providerUserId: string): Promise<Result<void, Error>> => {
      const keyId = `${providerId}:${providerUserId}`;
      keys.delete(keyId);
      return ok(undefined);
    },

    verifyPassword: async (
      providerId: string,
      providerUserId: string,
      password: string
    ): Promise<Result<boolean, Error>> => {
      const keyId = `${providerId}:${providerUserId}`;
      const key = keys.get(keyId);

      if (!key || !key.hashedPassword) {
        return ok(false);
      }

      const hashedInput = await hashPassword(password);
      return ok(hashedInput === key.hashedPassword);
    },
  };
};
