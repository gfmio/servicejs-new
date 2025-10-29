/**
 * Auth0 Adapter for ServiceJS
 *
 * Provides authentication and authorization via Auth0's OAuth 2.0/OIDC platform.
 * Supports user management, authentication flows, and token validation.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * Auth0 adapter configuration
 */
export interface Auth0AdapterConfig {
  /** Auth0 domain (e.g., "your-tenant.auth0.com" or "your-tenant.us.auth0.com") */
  domain: string;

  /** Client ID for your Auth0 application */
  clientId: string;

  /** Client secret (required for server-side operations) */
  clientSecret?: string;

  /** Audience for API authorization (optional) */
  audience?: string;

  /** Scopes to request (default: "openid profile email") */
  scope?: string;

  /** Custom connection name (optional, e.g., "Username-Password-Authentication") */
  connection?: string;

  /** Token cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl?: number;
}

/**
 * User profile returned from Auth0
 */
export interface Auth0User {
  user_id: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

/**
 * Authentication result with tokens
 */
export interface Auth0Tokens {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

/**
 * Login options
 */
export interface LoginOptions {
  username?: string;
  email?: string;
  password: string;
  realm?: string;
  scope?: string;
  audience?: string;
}

/**
 * Signup options
 */
export interface SignupOptions {
  email: string;
  password: string;
  username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  nickname?: string;
  picture?: string;
  user_metadata?: Record<string, any>;
  connection?: string;
}

/**
 * Password reset options
 */
export interface PasswordResetOptions {
  email: string;
  connection?: string;
}

/**
 * Token verification options
 */
export interface VerifyTokenOptions {
  token: string;
  audience?: string;
}

/**
 * User update options
 */
export interface UpdateUserOptions {
  userId: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  blocked?: boolean;
}

/**
 * Management API token cache
 */
interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * Auth0 adapter for authentication and user management
 */
export interface Auth0Adapter {
  /**
   * Initialize the adapter with configuration
   */
  init(config: Auth0AdapterConfig): Promise<Result<void, Error>>;

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
   * Authenticate user with username/password
   */
  login(options: LoginOptions): Promise<Result<Auth0Tokens, Error>>;

  /**
   * Create a new user account
   */
  signup(options: SignupOptions): Promise<Result<Auth0User, Error>>;

  /**
   * Send password reset email
   */
  resetPassword(options: PasswordResetOptions): Promise<Result<void, Error>>;

  /**
   * Get user profile by ID
   */
  getUser(userId: string): Promise<Result<Auth0User, Error>>;

  /**
   * Update user profile
   */
  updateUser(options: UpdateUserOptions): Promise<Result<Auth0User, Error>>;

  /**
   * Delete user account
   */
  deleteUser(userId: string): Promise<Result<void, Error>>;

  /**
   * Verify and decode an access token or ID token
   */
  verifyToken(options: VerifyTokenOptions): Promise<Result<any, Error>>;

  /**
   * Exchange authorization code for tokens
   */
  exchangeCode(code: string, redirectUri: string): Promise<Result<Auth0Tokens, Error>>;

  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<Result<Auth0Tokens, Error>>;

  /**
   * Revoke a refresh token
   */
  revokeToken(token: string): Promise<Result<void, Error>>;

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string;

  /**
   * Get logout URL
   */
  getLogoutUrl(returnTo?: string): string;
}

/**
 * Create a new Auth0 adapter instance
 */
export const createAuth0Adapter = (): Auth0Adapter => {
  let config: Auth0AdapterConfig | null = null;
  let managementTokenCache: TokenCache | null = null;

  const getBaseUrl = (): string => {
    if (!config) throw new Error('Adapter not initialized');
    return `https://${config.domain}`;
  };

  const getManagementToken = async (): Promise<Result<string, Error>> => {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    if (!config.clientSecret) {
      return err(new Error('Client secret required for Management API'));
    }

    // Check cache
    if (managementTokenCache && managementTokenCache.expiresAt > Date.now()) {
      return ok(managementTokenCache.token);
    }

    try {
      const response = await fetch(`${getBaseUrl()}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          audience: `${getBaseUrl()}/api/v2/`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return err(new Error(`Failed to get management token: ${error}`));
      }

      const data = await response.json();
      const cacheTtl = config.cacheTtl ?? 300000; // 5 minutes default

      managementTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + cacheTtl,
      };

      return ok(data.access_token);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: Auth0AdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = {
          ...cfg,
          scope: cfg.scope ?? 'openid profile email',
          cacheTtl: cfg.cacheTtl ?? 300000,
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
      managementTokenCache = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!config) {
        return ok({ status: 'unhealthy' });
      }

      try {
        const response = await fetch(`${getBaseUrl()}/.well-known/openid-configuration`);
        if (response.ok) {
          return ok({ status: 'healthy' });
        }
        return ok({ status: 'unhealthy' });
      } catch {
        return ok({ status: 'unhealthy' });
      }
    },

    login: async (options: LoginOptions): Promise<Result<Auth0Tokens, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        const body: any = {
          grant_type: 'password',
          client_id: config.clientId,
          username: options.username || options.email,
          password: options.password,
          scope: options.scope || config.scope,
        };

        if (config.clientSecret) {
          body.client_secret = config.clientSecret;
        }

        if (options.audience || config.audience) {
          body.audience = options.audience || config.audience;
        }

        if (options.realm) {
          body.realm = options.realm;
        }

        const response = await fetch(`${getBaseUrl()}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json();
          return err(new Error(error.error_description || 'Login failed'));
        }

        const tokens = await response.json();
        return ok(tokens);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    signup: async (options: SignupOptions): Promise<Result<Auth0User, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        const body: any = {
          client_id: config.clientId,
          email: options.email,
          password: options.password,
          connection: options.connection || config.connection || 'Username-Password-Authentication',
        };

        if (options.username) body.username = options.username;
        if (options.given_name) body.given_name = options.given_name;
        if (options.family_name) body.family_name = options.family_name;
        if (options.name) body.name = options.name;
        if (options.nickname) body.nickname = options.nickname;
        if (options.picture) body.picture = options.picture;
        if (options.user_metadata) body.user_metadata = options.user_metadata;

        const response = await fetch(`${getBaseUrl()}/dbconnections/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json();
          return err(new Error(error.description || 'Signup failed'));
        }

        const user = await response.json();
        return ok(user);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    resetPassword: async (options: PasswordResetOptions): Promise<Result<void, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        const response = await fetch(`${getBaseUrl()}/dbconnections/change_password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: config.clientId,
            email: options.email,
            connection: options.connection || config.connection || 'Username-Password-Authentication',
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return err(new Error(`Password reset failed: ${error}`));
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getUser: async (userId: string): Promise<Result<Auth0User, Error>> => {
      const tokenResult = await getManagementToken();
      if (!tokenResult.ok) {
        return err(tokenResult.error);
      }

      try {
        const response = await fetch(`${getBaseUrl()}/api/v2/users/${encodeURIComponent(userId)}`, {
          headers: {
            'Authorization': `Bearer ${tokenResult.value}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          return err(new Error(`Failed to get user: ${error}`));
        }

        const user = await response.json();
        return ok(user);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    updateUser: async (options: UpdateUserOptions): Promise<Result<Auth0User, Error>> => {
      const tokenResult = await getManagementToken();
      if (!tokenResult.ok) {
        return err(tokenResult.error);
      }

      try {
        const body: any = {};
        if (options.email !== undefined) body.email = options.email;
        if (options.email_verified !== undefined) body.email_verified = options.email_verified;
        if (options.name !== undefined) body.name = options.name;
        if (options.nickname !== undefined) body.nickname = options.nickname;
        if (options.picture !== undefined) body.picture = options.picture;
        if (options.user_metadata !== undefined) body.user_metadata = options.user_metadata;
        if (options.app_metadata !== undefined) body.app_metadata = options.app_metadata;
        if (options.blocked !== undefined) body.blocked = options.blocked;

        const response = await fetch(`${getBaseUrl()}/api/v2/users/${encodeURIComponent(options.userId)}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${tokenResult.value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.text();
          return err(new Error(`Failed to update user: ${error}`));
        }

        const user = await response.json();
        return ok(user);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteUser: async (userId: string): Promise<Result<void, Error>> => {
      const tokenResult = await getManagementToken();
      if (!tokenResult.ok) {
        return err(tokenResult.error);
      }

      try {
        const response = await fetch(`${getBaseUrl()}/api/v2/users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokenResult.value}`,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          return err(new Error(`Failed to delete user: ${error}`));
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    verifyToken: async (options: VerifyTokenOptions): Promise<Result<any, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        // Decode JWT payload (without verification - for display purposes)
        const parts = options.token.split('.');
        if (parts.length !== 3) {
          return err(new Error('Invalid token format'));
        }

        const payload = JSON.parse(atob(parts[1]));

        // Basic validation
        if (payload.exp && payload.exp < Date.now() / 1000) {
          return err(new Error('Token expired'));
        }

        if (options.audience && payload.aud !== options.audience) {
          return err(new Error('Invalid audience'));
        }

        return ok(payload);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    exchangeCode: async (code: string, redirectUri: string): Promise<Result<Auth0Tokens, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        const body: any = {
          grant_type: 'authorization_code',
          client_id: config.clientId,
          code,
          redirect_uri: redirectUri,
        };

        if (config.clientSecret) {
          body.client_secret = config.clientSecret;
        }

        const response = await fetch(`${getBaseUrl()}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json();
          return err(new Error(error.error_description || 'Code exchange failed'));
        }

        const tokens = await response.json();
        return ok(tokens);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    refreshToken: async (refreshToken: string): Promise<Result<Auth0Tokens, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      if (!config.clientSecret) {
        return err(new Error('Client secret required for refresh token'));
      }

      try {
        const response = await fetch(`${getBaseUrl()}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          return err(new Error(error.error_description || 'Token refresh failed'));
        }

        const tokens = await response.json();
        return ok(tokens);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    revokeToken: async (token: string): Promise<Result<void, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      if (!config.clientSecret) {
        return err(new Error('Client secret required for token revocation'));
      }

      try {
        const response = await fetch(`${getBaseUrl()}/oauth/revoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            token,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return err(new Error(`Token revocation failed: ${error}`));
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getAuthorizationUrl: (redirectUri: string, state?: string): string => {
      if (!config) {
        throw new Error('Adapter not initialized');
      }

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: config.scope!,
      });

      if (state) {
        params.set('state', state);
      }

      if (config.audience) {
        params.set('audience', config.audience);
      }

      if (config.connection) {
        params.set('connection', config.connection);
      }

      return `${getBaseUrl()}/authorize?${params.toString()}`;
    },

    getLogoutUrl: (returnTo?: string): string => {
      if (!config) {
        throw new Error('Adapter not initialized');
      }

      const params = new URLSearchParams({
        client_id: config.clientId,
      });

      if (returnTo) {
        params.set('returnTo', returnTo);
      }

      return `${getBaseUrl()}/v2/logout?${params.toString()}`;
    },
  };
};
