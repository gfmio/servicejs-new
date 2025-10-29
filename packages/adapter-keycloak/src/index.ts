/**
 * Keycloak Adapter for ServiceJS
 *
 * Provides enterprise SSO with Keycloak Admin REST API support.
 */

import { ok, err, type Result } from '@servicejs/result';

export interface KeycloakAdapterConfig {
  /** Keycloak server URL (e.g., "https://keycloak.example.com") */
  serverUrl: string;

  /** Realm name */
  realm: string;

  /** Client ID for admin access */
  clientId: string;

  /** Client secret for admin access */
  clientSecret: string;

  /** Grant type (default: "client_credentials") */
  grantType?: string;
}

export interface KeycloakUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
}

export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
  composite: boolean;
  clientRole: boolean;
  containerId: string;
}

export interface KeycloakGroup {
  id: string;
  name: string;
  path: string;
  subGroups?: KeycloakGroup[];
}

export interface CreateUserOptions {
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  credentials?: Array<{
    type: string;
    value: string;
    temporary?: boolean;
  }>;
  attributes?: Record<string, string[]>;
}

export interface UpdateUserOptions {
  userId: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  attributes?: Record<string, string[]>;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token?: string;
  token_type: string;
  scope?: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

export interface KeycloakAdapter {
  init(config: KeycloakAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  getUser(userId: string): Promise<Result<KeycloakUser, Error>>;
  getUserByUsername(username: string): Promise<Result<KeycloakUser | null, Error>>;
  listUsers(params?: { max?: number; first?: number; search?: string }): Promise<Result<KeycloakUser[], Error>>;
  createUser(options: CreateUserOptions): Promise<Result<string, Error>>;
  updateUser(options: UpdateUserOptions): Promise<Result<void, Error>>;
  deleteUser(userId: string): Promise<Result<void, Error>>;

  getUserRoles(userId: string): Promise<Result<KeycloakRole[], Error>>;
  assignRole(userId: string, roleId: string, roleName: string): Promise<Result<void, Error>>;
  removeRole(userId: string, roleId: string, roleName: string): Promise<Result<void, Error>>;

  getUserGroups(userId: string): Promise<Result<KeycloakGroup[], Error>>;
  joinGroup(userId: string, groupId: string): Promise<Result<void, Error>>;
  leaveGroup(userId: string, groupId: string): Promise<Result<void, Error>>;

  sendVerifyEmail(userId: string): Promise<Result<void, Error>>;
  resetPassword(userId: string): Promise<Result<void, Error>>;
}

export const createKeycloakAdapter = (): KeycloakAdapter => {
  let config: KeycloakAdapterConfig | null = null;
  let tokenCache: TokenCache | null = null;

  const getAdminToken = async (): Promise<Result<string, Error>> => {
    if (!config) return err(new Error('Adapter not initialized'));

    if (tokenCache && tokenCache.expiresAt > Date.now()) {
      return ok(tokenCache.token);
    }

    try {
      const tokenUrl = `${config.serverUrl}/realms/${config.realm}/protocol/openid-connect/token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: config.grantType || 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!response.ok) {
        return err(new Error(`Token request failed: ${response.status}`));
      }

      const data: TokenResponse = await response.json();
      tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
      };

      return ok(data.access_token);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const makeRequest = async <T>(
    method: string,
    path: string,
    body?: any
  ): Promise<Result<T, Error>> => {
    const tokenResult = await getAdminToken();
    if (!tokenResult.ok) return tokenResult;

    try {
      const url = `${config!.serverUrl}/admin/realms/${config!.realm}${path}`;
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${tokenResult.value}`,
        'Content-Type': 'application/json',
      };

      const options: RequestInit = { method, headers };
      if (body) options.body = JSON.stringify(body);

      const response = await fetch(url, options);

      if (response.status === 204) {
        return ok(undefined as T);
      }

      if (!response.ok) {
        const error = await response.text();
        return err(new Error(`Keycloak API error: ${response.status} - ${error}`));
      }

      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        return ok(data);
      }

      // For 201 Created with Location header (user creation)
      if (response.status === 201) {
        const location = response.headers.get('location');
        if (location) {
          const userId = location.split('/').pop();
          return ok(userId as T);
        }
      }

      return ok(undefined as T);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: KeycloakAdapterConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.serverUrl || !cfg.realm || !cfg.clientId || !cfg.clientSecret) {
          return err(new Error('Missing required configuration'));
        }
        config = { ...cfg, grantType: cfg.grantType || 'client_credentials' };
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!config) return err(new Error('Adapter not initialized'));
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => ok(undefined),

    destroy: async (): Promise<Result<void, Error>> => {
      config = null;
      tokenCache = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!config) return ok({ status: 'unhealthy' });

      try {
        const response = await fetch(`${config.serverUrl}/realms/${config.realm}`);
        return ok({ status: response.ok ? 'healthy' : 'unhealthy' });
      } catch {
        return ok({ status: 'unhealthy' });
      }
    },

    getUser: async (userId: string): Promise<Result<KeycloakUser, Error>> => {
      return makeRequest<KeycloakUser>('GET', `/users/${userId}`);
    },

    getUserByUsername: async (username: string): Promise<Result<KeycloakUser | null, Error>> => {
      const result = await makeRequest<KeycloakUser[]>('GET', `/users?username=${encodeURIComponent(username)}&exact=true`);
      if (!result.ok) return result;
      return ok(result.value.length > 0 ? result.value[0] : null);
    },

    listUsers: async (params?: { max?: number; first?: number; search?: string }): Promise<Result<KeycloakUser[], Error>> => {
      const query = new URLSearchParams();
      if (params?.max) query.set('max', String(params.max));
      if (params?.first) query.set('first', String(params.first));
      if (params?.search) query.set('search', params.search);
      const path = `/users${query.toString() ? `?${query}` : ''}`;
      return makeRequest<KeycloakUser[]>('GET', path);
    },

    createUser: async (options: CreateUserOptions): Promise<Result<string, Error>> => {
      const body = {
        username: options.username,
        email: options.email,
        firstName: options.firstName,
        lastName: options.lastName,
        enabled: options.enabled ?? true,
        emailVerified: options.emailVerified ?? false,
        credentials: options.credentials,
        attributes: options.attributes,
      };
      return makeRequest<string>('POST', '/users', body);
    },

    updateUser: async (options: UpdateUserOptions): Promise<Result<void, Error>> => {
      const { userId, ...body } = options;
      return makeRequest<void>('PUT', `/users/${userId}`, body);
    },

    deleteUser: async (userId: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('DELETE', `/users/${userId}`);
    },

    getUserRoles: async (userId: string): Promise<Result<KeycloakRole[], Error>> => {
      return makeRequest<KeycloakRole[]>('GET', `/users/${userId}/role-mappings/realm`);
    },

    assignRole: async (userId: string, roleId: string, roleName: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('POST', `/users/${userId}/role-mappings/realm`, [{
        id: roleId,
        name: roleName,
      }]);
    },

    removeRole: async (userId: string, roleId: string, roleName: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('DELETE', `/users/${userId}/role-mappings/realm`, [{
        id: roleId,
        name: roleName,
      }]);
    },

    getUserGroups: async (userId: string): Promise<Result<KeycloakGroup[], Error>> => {
      return makeRequest<KeycloakGroup[]>('GET', `/users/${userId}/groups`);
    },

    joinGroup: async (userId: string, groupId: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('PUT', `/users/${userId}/groups/${groupId}`);
    },

    leaveGroup: async (userId: string, groupId: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('DELETE', `/users/${userId}/groups/${groupId}`);
    },

    sendVerifyEmail: async (userId: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('PUT', `/users/${userId}/send-verify-email`);
    },

    resetPassword: async (userId: string): Promise<Result<void, Error>> => {
      return makeRequest<void>('PUT', `/users/${userId}/execute-actions-email`, ['UPDATE_PASSWORD']);
    },
  };
};
