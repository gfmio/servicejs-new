/**
 * SuperTokens Adapter for ServiceJS
 *
 * Provides open-source authentication with support for EmailPassword,
 * ThirdParty, and Passwordless authentication recipes.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * SuperTokens adapter configuration
 */
export interface SuperTokensAdapterConfig {
  /** SuperTokens Core connection URI */
  connectionURI: string;

  /** API key for SuperTokens Core (optional) */
  apiKey?: string;

  /** App name for session management */
  appName?: string;

  /** API domain (e.g., "https://api.example.com") */
  apiDomain?: string;

  /** Website domain (e.g., "https://example.com") */
  websiteDomain?: string;
}

/**
 * User information
 */
export interface SuperTokensUser {
  id: string;
  email?: string;
  phoneNumber?: string;
  timeJoined: number;
  tenantIds: string[];
}

/**
 * Session information
 */
export interface SuperTokensSession {
  handle: string;
  userId: string;
  tenantId: string;
  userDataInAccessToken: Record<string, any>;
  userDataInDatabase: Record<string, any>;
  timeCreated: number;
  expiry: number;
}

/**
 * Options for creating a user with email/password
 */
export interface CreateEmailPasswordUserOptions {
  email: string;
  password: string;
  tenantId?: string;
}

/**
 * Options for signing in
 */
export interface SignInOptions {
  email: string;
  password: string;
  tenantId?: string;
}

/**
 * Options for creating a passwordless user
 */
export interface CreatePasswordlessUserOptions {
  email?: string;
  phoneNumber?: string;
  tenantId?: string;
}

/**
 * Options for updating user
 */
export interface UpdateUserOptions {
  userId: string;
  email?: string;
  password?: string;
}

/**
 * Options for creating session
 */
export interface CreateSessionOptions {
  userId: string;
  userDataInAccessToken?: Record<string, any>;
  userDataInDatabase?: Record<string, any>;
  tenantId?: string;
}

/**
 * Options for verifying session
 */
export interface VerifySessionOptions {
  sessionHandle: string;
  antiCsrfToken?: string;
  enableAntiCsrfCheck?: boolean;
}

/**
 * Reset password token
 */
export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
}

/**
 * SuperTokens adapter for authentication
 */
export interface SuperTokensAdapter {
  /**
   * Initialize the adapter with configuration
   */
  init(config: SuperTokensAdapterConfig): Promise<Result<void, Error>>;

  /**
   * Start the adapter
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the adapter
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Destroy the adapter and cleanup resources
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Health check
   */
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Create user with email and password
   */
  createEmailPasswordUser(options: CreateEmailPasswordUserOptions): Promise<Result<SuperTokensUser, Error>>;

  /**
   * Sign in with email and password
   */
  signIn(options: SignInOptions): Promise<Result<SuperTokensUser, Error>>;

  /**
   * Create passwordless user
   */
  createPasswordlessUser(options: CreatePasswordlessUserOptions): Promise<Result<SuperTokensUser, Error>>;

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<Result<SuperTokensUser, Error>>;

  /**
   * Get user by email
   */
  getUserByEmail(email: string, tenantId?: string): Promise<Result<SuperTokensUser | null, Error>>;

  /**
   * Update user
   */
  updateUser(options: UpdateUserOptions): Promise<Result<void, Error>>;

  /**
   * Delete user
   */
  deleteUser(userId: string): Promise<Result<void, Error>>;

  /**
   * Create password reset token
   */
  createResetPasswordToken(userId: string, tenantId?: string): Promise<Result<PasswordResetToken, Error>>;

  /**
   * Reset password using token
   */
  resetPasswordUsingToken(token: string, newPassword: string, tenantId?: string): Promise<Result<void, Error>>;

  /**
   * Create session
   */
  createSession(options: CreateSessionOptions): Promise<Result<SuperTokensSession, Error>>;

  /**
   * Get session
   */
  getSession(sessionHandle: string): Promise<Result<SuperTokensSession, Error>>;

  /**
   * Verify session
   */
  verifySession(options: VerifySessionOptions): Promise<Result<SuperTokensSession, Error>>;

  /**
   * Revoke session
   */
  revokeSession(sessionHandle: string): Promise<Result<void, Error>>;

  /**
   * Revoke all sessions for user
   */
  revokeAllSessions(userId: string): Promise<Result<void, Error>>;

  /**
   * Get all sessions for user
   */
  getAllSessionsForUser(userId: string): Promise<Result<SuperTokensSession[], Error>>;
}

/**
 * Create a new SuperTokens adapter instance
 */
export const createSuperTokensAdapter = (): SuperTokensAdapter => {
  let config: SuperTokensAdapterConfig | null = null;

  const makeRequest = async <T>(
    method: string,
    path: string,
    body?: any
  ): Promise<Result<T, Error>> => {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    try {
      const url = `${config.connectionURI}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['api-key'] = config.apiKey;
      }

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.text();
        return err(new Error(`SuperTokens API error: ${response.status} - ${error}`));
      }

      const data = await response.json();

      if (data.status === 'OK') {
        return ok(data as T);
      }

      return err(new Error(data.message || 'Request failed'));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: SuperTokensAdapterConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.connectionURI) {
          return err(new Error('Connection URI is required'));
        }

        config = cfg;
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
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!config) {
        return ok({ status: 'unhealthy' });
      }

      try {
        const response = await fetch(`${config.connectionURI}/hello`);
        if (response.ok) {
          return ok({ status: 'healthy' });
        }
        return ok({ status: 'unhealthy' });
      } catch {
        return ok({ status: 'unhealthy' });
      }
    },

    createEmailPasswordUser: async (
      options: CreateEmailPasswordUserOptions
    ): Promise<Result<SuperTokensUser, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/signup', {
        email: options.email,
        password: options.password,
        tenantId: options.tenantId || 'public',
      });

      if (!result.ok) return result;

      return ok({
        id: result.value.user.id,
        email: result.value.user.email,
        timeJoined: result.value.user.timeJoined,
        tenantIds: result.value.user.tenantIds || ['public'],
      });
    },

    signIn: async (options: SignInOptions): Promise<Result<SuperTokensUser, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/signin', {
        email: options.email,
        password: options.password,
        tenantId: options.tenantId || 'public',
      });

      if (!result.ok) return result;

      return ok({
        id: result.value.user.id,
        email: result.value.user.email,
        timeJoined: result.value.user.timeJoined,
        tenantIds: result.value.user.tenantIds || ['public'],
      });
    },

    createPasswordlessUser: async (
      options: CreatePasswordlessUserOptions
    ): Promise<Result<SuperTokensUser, Error>> => {
      const body: any = {
        tenantId: options.tenantId || 'public',
      };

      if (options.email) {
        body.email = options.email;
      } else if (options.phoneNumber) {
        body.phoneNumber = options.phoneNumber;
      } else {
        return err(new Error('Either email or phoneNumber is required'));
      }

      const result = await makeRequest<any>('POST', '/recipe/user', body);

      if (!result.ok) return result;

      return ok({
        id: result.value.user.id,
        email: result.value.user.email,
        phoneNumber: result.value.user.phoneNumber,
        timeJoined: result.value.user.timeJoined,
        tenantIds: result.value.user.tenantIds || ['public'],
      });
    },

    getUser: async (userId: string): Promise<Result<SuperTokensUser, Error>> => {
      const result = await makeRequest<any>('GET', `/recipe/user?userId=${userId}`);

      if (!result.ok) return result;

      if (!result.value.user) {
        return err(new Error('User not found'));
      }

      return ok({
        id: result.value.user.id,
        email: result.value.user.email,
        phoneNumber: result.value.user.phoneNumber,
        timeJoined: result.value.user.timeJoined,
        tenantIds: result.value.user.tenantIds || ['public'],
      });
    },

    getUserByEmail: async (email: string, tenantId?: string): Promise<Result<SuperTokensUser | null, Error>> => {
      const tid = tenantId || 'public';
      const result = await makeRequest<any>('GET', `/recipe/user?email=${encodeURIComponent(email)}&tenantId=${tid}`);

      if (!result.ok) return result;

      if (!result.value.user) {
        return ok(null);
      }

      return ok({
        id: result.value.user.id,
        email: result.value.user.email,
        phoneNumber: result.value.user.phoneNumber,
        timeJoined: result.value.user.timeJoined,
        tenantIds: result.value.user.tenantIds || ['public'],
      });
    },

    updateUser: async (options: UpdateUserOptions): Promise<Result<void, Error>> => {
      const body: any = {
        userId: options.userId,
      };

      if (options.email !== undefined) {
        body.email = options.email;
      }

      if (options.password !== undefined) {
        body.password = options.password;
      }

      const result = await makeRequest<any>('PUT', '/recipe/user', body);

      if (!result.ok) return result;

      return ok(undefined);
    },

    deleteUser: async (userId: string): Promise<Result<void, Error>> => {
      const result = await makeRequest<any>('DELETE', `/user/remove?userId=${userId}`);

      if (!result.ok) return result;

      return ok(undefined);
    },

    createResetPasswordToken: async (
      userId: string,
      tenantId?: string
    ): Promise<Result<PasswordResetToken, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/user/password/reset/token', {
        userId,
        tenantId: tenantId || 'public',
      });

      if (!result.ok) return result;

      return ok({
        token: result.value.token,
        userId,
        email: result.value.email || '',
      });
    },

    resetPasswordUsingToken: async (
      token: string,
      newPassword: string,
      tenantId?: string
    ): Promise<Result<void, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/user/password/reset', {
        method: 'token',
        token,
        newPassword,
        tenantId: tenantId || 'public',
      });

      if (!result.ok) return result;

      return ok(undefined);
    },

    createSession: async (options: CreateSessionOptions): Promise<Result<SuperTokensSession, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/session', {
        userId: options.userId,
        userDataInJWT: options.userDataInAccessToken || {},
        userDataInDatabase: options.userDataInDatabase || {},
        tenantId: options.tenantId || 'public',
      });

      if (!result.ok) return result;

      return ok({
        handle: result.value.session.handle,
        userId: result.value.session.userId,
        tenantId: result.value.session.tenantId || 'public',
        userDataInAccessToken: result.value.session.userDataInJWT || {},
        userDataInDatabase: result.value.session.userDataInDatabase || {},
        timeCreated: result.value.session.timeCreated,
        expiry: result.value.session.expiry,
      });
    },

    getSession: async (sessionHandle: string): Promise<Result<SuperTokensSession, Error>> => {
      const result = await makeRequest<any>('GET', `/recipe/session?sessionHandle=${sessionHandle}`);

      if (!result.ok) return result;

      if (!result.value.session) {
        return err(new Error('Session not found'));
      }

      return ok({
        handle: result.value.session.handle,
        userId: result.value.session.userId,
        tenantId: result.value.session.tenantId || 'public',
        userDataInAccessToken: result.value.session.userDataInJWT || {},
        userDataInDatabase: result.value.session.userDataInDatabase || {},
        timeCreated: result.value.session.timeCreated,
        expiry: result.value.session.expiry,
      });
    },

    verifySession: async (options: VerifySessionOptions): Promise<Result<SuperTokensSession, Error>> => {
      const body: any = {
        sessionHandle: options.sessionHandle,
        enableAntiCsrfCheck: options.enableAntiCsrfCheck !== false,
      };

      if (options.antiCsrfToken) {
        body.antiCsrfToken = options.antiCsrfToken;
      }

      const result = await makeRequest<any>('POST', '/recipe/session/verify', body);

      if (!result.ok) return result;

      return ok({
        handle: result.value.session.handle,
        userId: result.value.session.userId,
        tenantId: result.value.session.tenantId || 'public',
        userDataInAccessToken: result.value.session.userDataInJWT || {},
        userDataInDatabase: result.value.session.userDataInDatabase || {},
        timeCreated: result.value.session.timeCreated,
        expiry: result.value.session.expiry,
      });
    },

    revokeSession: async (sessionHandle: string): Promise<Result<void, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/session/remove', {
        sessionHandles: [sessionHandle],
      });

      if (!result.ok) return result;

      return ok(undefined);
    },

    revokeAllSessions: async (userId: string): Promise<Result<void, Error>> => {
      const result = await makeRequest<any>('POST', '/recipe/session/remove', {
        userId,
      });

      if (!result.ok) return result;

      return ok(undefined);
    },

    getAllSessionsForUser: async (userId: string): Promise<Result<SuperTokensSession[], Error>> => {
      const result = await makeRequest<any>('GET', `/recipe/session/user?userId=${userId}`);

      if (!result.ok) return result;

      const sessions = (result.value.sessions || []).map((s: any) => ({
        handle: s.handle,
        userId: s.userId,
        tenantId: s.tenantId || 'public',
        userDataInAccessToken: s.userDataInJWT || {},
        userDataInDatabase: s.userDataInDatabase || {},
        timeCreated: s.timeCreated,
        expiry: s.expiry,
      }));

      return ok(sessions);
    },
  };
};
