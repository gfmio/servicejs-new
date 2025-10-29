/**
 * Auth.js (NextAuth) Adapter for ServiceJS
 *
 * Provides authentication for Next.js applications via Auth.js/NextAuth integration.
 * This adapter wraps Auth.js functionality for use in ServiceJS applications.
 */

import { ok, err, type Result } from '@servicejs/result';

export interface AuthJSAdapterConfig {
  /** Base URL for your application */
  baseUrl: string;

  /** Secret for signing tokens */
  secret: string;

  /** Auth.js API endpoint (default: "/api/auth") */
  authPath?: string;
}

export interface AuthJSUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
}

export interface AuthJSSession {
  sessionToken: string;
  userId: string;
  expires: Date;
}

export interface AuthJSAccount {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
}

export interface SignInOptions {
  email?: string;
  provider?: string;
  callbackUrl?: string;
}

export interface AuthJSAdapter {
  init(config: AuthJSAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<Result<AuthJSUser, Error>>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string): Promise<Result<AuthJSUser | null, Error>>;

  /**
   * Create user
   */
  createUser(user: Omit<AuthJSUser, 'id'>): Promise<Result<AuthJSUser, Error>>;

  /**
   * Update user
   */
  updateUser(userId: string, data: Partial<AuthJSUser>): Promise<Result<AuthJSUser, Error>>;

  /**
   * Delete user
   */
  deleteUser(userId: string): Promise<Result<void, Error>>;

  /**
   * Get session by token
   */
  getSessionAndUser(sessionToken: string): Promise<Result<{ session: AuthJSSession; user: AuthJSUser }, Error>>;

  /**
   * Create session
   */
  createSession(session: Omit<AuthJSSession, 'sessionToken'> & { sessionToken?: string }): Promise<Result<AuthJSSession, Error>>;

  /**
   * Update session
   */
  updateSession(sessionToken: string, data: Partial<AuthJSSession>): Promise<Result<AuthJSSession, Error>>;

  /**
   * Delete session
   */
  deleteSession(sessionToken: string): Promise<Result<void, Error>>;

  /**
   * Link account to user
   */
  linkAccount(account: AuthJSAccount): Promise<Result<void, Error>>;

  /**
   * Unlink account
   */
  unlinkAccount(provider: string, providerAccountId: string): Promise<Result<void, Error>>;
}

export const createAuthJSAdapter = (): AuthJSAdapter => {
  let config: AuthJSAdapterConfig | null = null;

  // In-memory storage for demo/testing purposes
  // In production, this would use a real database adapter
  const users = new Map<string, AuthJSUser>();
  const sessions = new Map<string, AuthJSSession>();
  const accounts = new Map<string, AuthJSAccount>();
  const emailIndex = new Map<string, string>();

  const generateId = () => crypto.randomUUID();

  return {
    init: async (cfg: AuthJSAdapterConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.baseUrl || !cfg.secret) {
          return err(new Error('Base URL and secret are required'));
        }

        config = {
          ...cfg,
          authPath: cfg.authPath || '/api/auth',
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

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      config = null;
      users.clear();
      sessions.clear();
      accounts.clear();
      emailIndex.clear();
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!config) {
        return ok({ status: 'unhealthy' });
      }

      return ok({ status: 'healthy' });
    },

    getUser: async (userId: string): Promise<Result<AuthJSUser, Error>> => {
      const user = users.get(userId);
      if (!user) {
        return err(new Error('User not found'));
      }
      return ok(user);
    },

    getUserByEmail: async (email: string): Promise<Result<AuthJSUser | null, Error>> => {
      const userId = emailIndex.get(email);
      if (!userId) {
        return ok(null);
      }
      const user = users.get(userId);
      return ok(user || null);
    },

    createUser: async (userData: Omit<AuthJSUser, 'id'>): Promise<Result<AuthJSUser, Error>> => {
      const id = generateId();
      const user: AuthJSUser = { id, ...userData };

      users.set(id, user);
      if (user.email) {
        emailIndex.set(user.email, id);
      }

      return ok(user);
    },

    updateUser: async (userId: string, data: Partial<AuthJSUser>): Promise<Result<AuthJSUser, Error>> => {
      const user = users.get(userId);
      if (!user) {
        return err(new Error('User not found'));
      }

      // Update email index if email changed
      if (data.email && data.email !== user.email) {
        if (user.email) {
          emailIndex.delete(user.email);
        }
        emailIndex.set(data.email, userId);
      }

      const updatedUser = { ...user, ...data };
      users.set(userId, updatedUser);

      return ok(updatedUser);
    },

    deleteUser: async (userId: string): Promise<Result<void, Error>> => {
      const user = users.get(userId);
      if (!user) {
        return err(new Error('User not found'));
      }

      if (user.email) {
        emailIndex.delete(user.email);
      }
      users.delete(userId);

      // Delete user's sessions
      for (const [token, session] of sessions.entries()) {
        if (session.userId === userId) {
          sessions.delete(token);
        }
      }

      // Delete user's accounts
      for (const [key, account] of accounts.entries()) {
        if (account.userId === userId) {
          accounts.delete(key);
        }
      }

      return ok(undefined);
    },

    getSessionAndUser: async (
      sessionToken: string
    ): Promise<Result<{ session: AuthJSSession; user: AuthJSUser }, Error>> => {
      const session = sessions.get(sessionToken);
      if (!session) {
        return err(new Error('Session not found'));
      }

      // Check if session is expired
      if (session.expires < new Date()) {
        sessions.delete(sessionToken);
        return err(new Error('Session expired'));
      }

      const user = users.get(session.userId);
      if (!user) {
        return err(new Error('User not found'));
      }

      return ok({ session, user });
    },

    createSession: async (
      sessionData: Omit<AuthJSSession, 'sessionToken'> & { sessionToken?: string }
    ): Promise<Result<AuthJSSession, Error>> => {
      const sessionToken = sessionData.sessionToken || generateId();
      const session: AuthJSSession = {
        sessionToken,
        userId: sessionData.userId,
        expires: sessionData.expires,
      };

      sessions.set(sessionToken, session);

      return ok(session);
    },

    updateSession: async (
      sessionToken: string,
      data: Partial<AuthJSSession>
    ): Promise<Result<AuthJSSession, Error>> => {
      const session = sessions.get(sessionToken);
      if (!session) {
        return err(new Error('Session not found'));
      }

      const updatedSession = { ...session, ...data, sessionToken };
      sessions.set(sessionToken, updatedSession);

      return ok(updatedSession);
    },

    deleteSession: async (sessionToken: string): Promise<Result<void, Error>> => {
      sessions.delete(sessionToken);
      return ok(undefined);
    },

    linkAccount: async (account: AuthJSAccount): Promise<Result<void, Error>> => {
      const key = `${account.provider}:${account.providerAccountId}`;
      accounts.set(key, account);
      return ok(undefined);
    },

    unlinkAccount: async (provider: string, providerAccountId: string): Promise<Result<void, Error>> => {
      const key = `${provider}:${providerAccountId}`;
      accounts.delete(key);
      return ok(undefined);
    },
  };
};
