/**
 * Clerk Adapter for ServiceJS
 *
 * Provides authentication via Clerk's platform with pre-built UI components
 * and comprehensive Backend API support for user and session management.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * Clerk adapter configuration
 */
export interface ClerkAdapterConfig {
  /** Clerk Secret Key (starts with sk_) */
  secretKey: string;

  /** Clerk Publishable Key (starts with pk_) - optional for backend-only */
  publishableKey?: string;

  /** API version (default: "v1") */
  apiVersion?: string;

  /** Custom API base URL (default: "https://api.clerk.com") */
  apiUrl?: string;
}

/**
 * Clerk user object
 */
export interface ClerkUser {
  id: string;
  object: 'user';
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  has_image: boolean;
  primary_email_address_id: string | null;
  primary_phone_number_id: string | null;
  primary_web3_wallet_id: string | null;
  password_enabled: boolean;
  two_factor_enabled: boolean;
  totp_enabled: boolean;
  backup_code_enabled: boolean;
  email_addresses: EmailAddress[];
  phone_numbers: PhoneNumber[];
  web3_wallets: Web3Wallet[];
  external_accounts: ExternalAccount[];
  public_metadata: Record<string, any>;
  private_metadata: Record<string, any>;
  unsafe_metadata: Record<string, any>;
  created_at: number;
  updated_at: number;
  last_sign_in_at: number | null;
  banned: boolean;
  locked: boolean;
  lockout_expires_in_seconds: number | null;
  verification_attempts_remaining: number | null;
}

export interface EmailAddress {
  id: string;
  email_address: string;
  verification: Verification | null;
  linked_to: LinkedTo[];
}

export interface PhoneNumber {
  id: string;
  phone_number: string;
  reserved_for_second_factor: boolean;
  verification: Verification | null;
  linked_to: LinkedTo[];
}

export interface Web3Wallet {
  id: string;
  web3_wallet: string;
  verification: Verification | null;
}

export interface ExternalAccount {
  id: string;
  provider: string;
  identification_id: string;
  provider_user_id: string;
  approved_scopes: string;
  email_address: string;
  first_name: string;
  last_name: string;
  image_url: string;
  username: string | null;
  public_metadata: Record<string, any>;
  label: string | null;
  verification: Verification | null;
}

export interface Verification {
  status: 'verified' | 'unverified' | 'expired' | 'failed';
  strategy: string;
  attempts: number | null;
  expire_at: number | null;
}

export interface LinkedTo {
  type: string;
  id: string;
}

/**
 * Clerk session object
 */
export interface ClerkSession {
  id: string;
  object: 'session';
  client_id: string;
  user_id: string;
  status: 'abandoned' | 'active' | 'ended' | 'expired' | 'removed' | 'replaced' | 'revoked';
  last_active_at: number;
  expire_at: number;
  abandon_at: number;
  created_at: number;
  updated_at: number;
}

/**
 * Options for creating a user
 */
export interface CreateUserOptions {
  email_address?: string[];
  phone_number?: string[];
  web3_wallet?: string[];
  username?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  external_id?: string;
  public_metadata?: Record<string, any>;
  private_metadata?: Record<string, any>;
  unsafe_metadata?: Record<string, any>;
  skip_password_checks?: boolean;
  skip_password_requirement?: boolean;
  created_at?: string;
}

/**
 * Options for updating a user
 */
export interface UpdateUserOptions {
  userId: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  primary_email_address_id?: string;
  primary_phone_number_id?: string;
  primary_web3_wallet_id?: string;
  password?: string;
  public_metadata?: Record<string, any>;
  private_metadata?: Record<string, any>;
  unsafe_metadata?: Record<string, any>;
  skip_password_checks?: boolean;
}

/**
 * Options for listing users
 */
export interface ListUsersOptions {
  limit?: number;
  offset?: number;
  email_address?: string[];
  phone_number?: string[];
  external_id?: string[];
  username?: string[];
  web3_wallet?: string[];
  user_id?: string[];
  organization_id?: string[];
  query?: string;
  last_active_at_since?: number;
  order_by?: string;
}

/**
 * Options for verifying a session token
 */
export interface VerifyTokenOptions {
  token: string;
}

/**
 * Options for creating a session token
 */
export interface CreateTokenOptions {
  userId: string;
  expiresInSeconds?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total_count: number;
}

/**
 * Clerk adapter for authentication and user management
 */
export interface ClerkAdapter {
  /**
   * Initialize the adapter with configuration
   */
  init(config: ClerkAdapterConfig): Promise<Result<void, Error>>;

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
   * Get a user by ID
   */
  getUser(userId: string): Promise<Result<ClerkUser, Error>>;

  /**
   * List users with optional filters
   */
  listUsers(options?: ListUsersOptions): Promise<Result<PaginatedResponse<ClerkUser>, Error>>;

  /**
   * Create a new user
   */
  createUser(options: CreateUserOptions): Promise<Result<ClerkUser, Error>>;

  /**
   * Update a user
   */
  updateUser(options: UpdateUserOptions): Promise<Result<ClerkUser, Error>>;

  /**
   * Delete a user
   */
  deleteUser(userId: string): Promise<Result<void, Error>>;

  /**
   * Ban a user
   */
  banUser(userId: string): Promise<Result<ClerkUser, Error>>;

  /**
   * Unban a user
   */
  unbanUser(userId: string): Promise<Result<ClerkUser, Error>>;

  /**
   * Lock a user
   */
  lockUser(userId: string): Promise<Result<ClerkUser, Error>>;

  /**
   * Unlock a user
   */
  unlockUser(userId: string): Promise<Result<ClerkUser, Error>>;

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Promise<Result<ClerkSession, Error>>;

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): Promise<Result<ClerkSession[], Error>>;

  /**
   * Revoke a session
   */
  revokeSession(sessionId: string): Promise<Result<ClerkSession, Error>>;

  /**
   * Verify a session token and return session details
   */
  verifyToken(options: VerifyTokenOptions): Promise<Result<ClerkSession, Error>>;

  /**
   * Create a session token for a user (for testing/admin purposes)
   */
  createToken(options: CreateTokenOptions): Promise<Result<{ token: string }, Error>>;
}

/**
 * Create a new Clerk adapter instance
 */
export const createClerkAdapter = (): ClerkAdapter => {
  let config: ClerkAdapterConfig | null = null;

  const getApiUrl = (): string => {
    if (!config) throw new Error('Adapter not initialized');
    const baseUrl = config.apiUrl || 'https://api.clerk.com';
    const version = config.apiVersion || 'v1';
    return `${baseUrl}/${version}`;
  };

  const makeRequest = async <T>(
    method: string,
    path: string,
    body?: any
  ): Promise<Result<T, Error>> => {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    try {
      const url = `${getApiUrl()}${path}`;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      };

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
        return err(new Error(`Clerk API error: ${response.status} - ${error}`));
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return ok(undefined as T);
      }

      const data = await response.json();
      return ok(data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: ClerkAdapterConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.secretKey) {
          return err(new Error('Secret key is required'));
        }

        if (!cfg.secretKey.startsWith('sk_')) {
          return err(new Error('Invalid secret key format (must start with sk_)'));
        }

        config = {
          ...cfg,
          apiVersion: cfg.apiVersion || 'v1',
          apiUrl: cfg.apiUrl || 'https://api.clerk.com',
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
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!config) {
        return ok({ status: 'unhealthy' });
      }

      // Test API connectivity by listing users with limit 1
      const result = await makeRequest<any>('GET', '/users?limit=1');

      if (result.ok) {
        return ok({ status: 'healthy' });
      }

      return ok({ status: 'unhealthy' });
    },

    getUser: async (userId: string): Promise<Result<ClerkUser, Error>> => {
      return makeRequest<ClerkUser>('GET', `/users/${userId}`);
    },

    listUsers: async (
      options?: ListUsersOptions
    ): Promise<Result<PaginatedResponse<ClerkUser>, Error>> => {
      const params = new URLSearchParams();

      if (options) {
        if (options.limit !== undefined) params.set('limit', String(options.limit));
        if (options.offset !== undefined) params.set('offset', String(options.offset));
        if (options.query) params.set('query', options.query);
        if (options.order_by) params.set('order_by', options.order_by);
        if (options.last_active_at_since) params.set('last_active_at_since', String(options.last_active_at_since));

        // Array parameters
        options.email_address?.forEach(email => params.append('email_address', email));
        options.phone_number?.forEach(phone => params.append('phone_number', phone));
        options.external_id?.forEach(id => params.append('external_id', id));
        options.username?.forEach(username => params.append('username', username));
        options.web3_wallet?.forEach(wallet => params.append('web3_wallet', wallet));
        options.user_id?.forEach(id => params.append('user_id', id));
        options.organization_id?.forEach(id => params.append('organization_id', id));
      }

      const queryString = params.toString();
      const path = queryString ? `/users?${queryString}` : '/users';

      return makeRequest<PaginatedResponse<ClerkUser>>('GET', path);
    },

    createUser: async (options: CreateUserOptions): Promise<Result<ClerkUser, Error>> => {
      return makeRequest<ClerkUser>('POST', '/users', options);
    },

    updateUser: async (options: UpdateUserOptions): Promise<Result<ClerkUser, Error>> => {
      const { userId, ...body } = options;
      return makeRequest<ClerkUser>('PATCH', `/users/${userId}`, body);
    },

    deleteUser: async (userId: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('DELETE', `/users/${userId}`);
    },

    banUser: async (userId: string): Promise<Result<ClerkUser, Error>> => {
      return makeRequest<ClerkUser>('POST', `/users/${userId}/ban`);
    },

    unbanUser: async (userId: string): Promise<Result<ClerkUser, Error>> => {
      return makeRequest<ClerkUser>('POST', `/users/${userId}/unban`);
    },

    lockUser: async (userId: string): Promise<Result<ClerkUser, Error>> => {
      return makeRequest<ClerkUser>('POST', `/users/${userId}/lock`);
    },

    unlockUser: async (userId: string): Promise<Result<ClerkUser, Error>> => {
      return makeRequest<ClerkUser>('POST', `/users/${userId}/unlock`);
    },

    getSession: async (sessionId: string): Promise<Result<ClerkSession, Error>> => {
      return makeRequest<ClerkSession>('GET', `/sessions/${sessionId}`);
    },

    getUserSessions: async (userId: string): Promise<Result<ClerkSession[], Error>> => {
      return makeRequest<ClerkSession[]>('GET', `/users/${userId}/sessions`);
    },

    revokeSession: async (sessionId: string): Promise<Result<ClerkSession, Error>> => {
      return makeRequest<ClerkSession>('POST', `/sessions/${sessionId}/revoke`);
    },

    verifyToken: async (options: VerifyTokenOptions): Promise<Result<ClerkSession, Error>> => {
      return makeRequest<ClerkSession>('POST', '/sessions/verify', {
        token: options.token,
      });
    },

    createToken: async (options: CreateTokenOptions): Promise<Result<{ token: string }, Error>> => {
      const body: any = {
        user_id: options.userId,
      };

      if (options.expiresInSeconds !== undefined) {
        body.expires_in_seconds = options.expiresInSeconds;
      }

      return makeRequest<{ token: string }>('POST', '/sessions/tokens', body);
    },
  };
};
