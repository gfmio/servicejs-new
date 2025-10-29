/**
 * Supabase Adapter
 *
 * Provides PostgreSQL database, authentication, real-time subscriptions, and storage
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type {
  SupabaseClient,
  PostgrestQueryBuilder,
  PostgrestFilterBuilder,
  RealtimeChannel,
  User,
  Session,
  AuthChangeEvent,
  AuthError,
  StorageError,
  FileObject,
} from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

export interface SupabaseAdapterConfig {
  // Supabase project URL
  url: string;

  // Supabase anon/service key
  key: string;

  // Optional: auth options
  auth?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
    detectSessionInUrl?: boolean;
  };

  // Optional: realtime options
  realtime?: {
    params?: Record<string, string>;
  };
}

export interface DatabaseQueryOptions {
  table: string;
  select?: string;
  filter?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface DatabaseInsertOptions {
  table: string;
  data: any | any[];
  returning?: boolean;
}

export interface DatabaseUpdateOptions {
  table: string;
  data: any;
  filter: Record<string, any>;
  returning?: boolean;
}

export interface DatabaseDeleteOptions {
  table: string;
  filter: Record<string, any>;
  returning?: boolean;
}

export interface AuthSignUpOptions {
  email: string;
  password: string;
  options?: {
    data?: object;
    emailRedirectTo?: string;
  };
}

export interface AuthSignInOptions {
  email: string;
  password: string;
}

export interface RealtimeSubscribeOptions {
  channel: string;
  table?: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
}

export interface StorageUploadOptions {
  bucket: string;
  path: string;
  file: File | Blob | ArrayBuffer;
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  };
}

export interface StorageDownloadOptions {
  bucket: string;
  path: string;
}

export interface StorageListOptions {
  bucket: string;
  path?: string;
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: string };
  };
}

export interface SupabaseAdapter {
  init(config: SupabaseAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Supabase client
  getClient(): Result<SupabaseClient, Error>;

  // Database operations
  query(options: DatabaseQueryOptions): Promise<Result<any[], Error>>;
  insert(options: DatabaseInsertOptions): Promise<Result<any, Error>>;
  update(options: DatabaseUpdateOptions): Promise<Result<any, Error>>;
  delete(options: DatabaseDeleteOptions): Promise<Result<any, Error>>;

  // RPC (stored procedures)
  rpc<T = any>(functionName: string, params?: object): Promise<Result<T, Error>>;

  // Authentication
  signUp(options: AuthSignUpOptions): Promise<Result<{ user: User | null; session: Session | null }, AuthError>>;
  signIn(options: AuthSignInOptions): Promise<Result<{ user: User | null; session: Session | null }, AuthError>>;
  signOut(): Promise<Result<void, AuthError>>;
  getSession(): Promise<Result<Session | null, AuthError>>;
  getUser(): Promise<Result<User | null, AuthError>>;
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void;

  // Real-time subscriptions
  subscribe(options: RealtimeSubscribeOptions): Result<RealtimeChannel, Error>;
  unsubscribe(channel: RealtimeChannel): Promise<Result<void, Error>>;

  // Storage
  uploadFile(options: StorageUploadOptions): Promise<Result<{ path: string }, StorageError>>;
  downloadFile(options: StorageDownloadOptions): Promise<Result<Blob, StorageError>>;
  listFiles(options: StorageListOptions): Promise<Result<FileObject[], StorageError>>;
  deleteFile(bucket: string, paths: string[]): Promise<Result<void, StorageError>>;
  getPublicUrl(bucket: string, path: string): Result<string, Error>;
}

export const createSupabaseAdapter = (): SupabaseAdapter => {
  let client: SupabaseClient | null = null;
  let config: SupabaseAdapterConfig | null = null;

  return {
    init: async (cfg: SupabaseAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;
        client = createClient(cfg.url, cfg.key, {
          auth: cfg.auth,
          realtime: cfg.realtime,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Supabase client doesn't need explicit cleanup for basic operations
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        // Remove all channels and cleanup
        client.removeAllChannels();
        client = null;
        config = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Client not initialized') });
      }

      try {
        // Test database connection with a simple query
        const { error } = await client.from('_health_check').select('*').limit(1);

        if (error && error.message.includes('does not exist')) {
          // Table doesn't exist, but connection is healthy
          return ok({ status: 'healthy' });
        }

        if (error) {
          return ok({ status: 'degraded', error: new Error(error.message) });
        }

        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getClient: (): Result<SupabaseClient, Error> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }
      return ok(client);
    },

    query: async (options: DatabaseQueryOptions): Promise<Result<any[], Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        let query = client.from(options.table).select(options.select || '*');

        if (options.filter) {
          for (const [key, value] of Object.entries(options.filter)) {
            query = query.eq(key, value);
          }
        }

        if (options.order) {
          query = query.order(options.order.column, { ascending: options.order.ascending !== false });
        }

        if (options.limit !== undefined) {
          query = query.limit(options.limit);
        }

        if (options.offset !== undefined) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) {
          return err(new Error(error.message));
        }

        return ok(data || []);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    insert: async (options: DatabaseInsertOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        const query = client.from(options.table).insert(options.data);

        if (options.returning !== false) {
          query.select();
        }

        const { data, error } = await query;

        if (error) {
          return err(new Error(error.message));
        }

        return ok(data);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    update: async (options: DatabaseUpdateOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        let query = client.from(options.table).update(options.data);

        for (const [key, value] of Object.entries(options.filter)) {
          query = query.eq(key, value);
        }

        if (options.returning !== false) {
          query.select();
        }

        const { data, error } = await query;

        if (error) {
          return err(new Error(error.message));
        }

        return ok(data);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (options: DatabaseDeleteOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        let query = client.from(options.table).delete();

        for (const [key, value] of Object.entries(options.filter)) {
          query = query.eq(key, value);
        }

        if (options.returning !== false) {
          query.select();
        }

        const { data, error } = await query;

        if (error) {
          return err(new Error(error.message));
        }

        return ok(data);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    rpc: async <T = any>(functionName: string, params?: object): Promise<Result<T, Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        const { data, error } = await client.rpc(functionName, params);

        if (error) {
          return err(new Error(error.message));
        }

        return ok(data as T);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    signUp: async (options: AuthSignUpOptions): Promise<Result<{ user: User | null; session: Session | null }, AuthError>> => {
      if (!client) {
        return err({ name: 'AuthError', message: 'Supabase client not initialized', status: 0 } as AuthError);
      }

      const { data, error } = await client.auth.signUp({
        email: options.email,
        password: options.password,
        options: options.options,
      });

      if (error) {
        return err(error);
      }

      return ok({ user: data.user, session: data.session });
    },

    signIn: async (options: AuthSignInOptions): Promise<Result<{ user: User | null; session: Session | null }, AuthError>> => {
      if (!client) {
        return err({ name: 'AuthError', message: 'Supabase client not initialized', status: 0 } as AuthError);
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: options.email,
        password: options.password,
      });

      if (error) {
        return err(error);
      }

      return ok({ user: data.user, session: data.session });
    },

    signOut: async (): Promise<Result<void, AuthError>> => {
      if (!client) {
        return err({ name: 'AuthError', message: 'Supabase client not initialized', status: 0 } as AuthError);
      }

      const { error } = await client.auth.signOut();

      if (error) {
        return err(error);
      }

      return ok(undefined);
    },

    getSession: async (): Promise<Result<Session | null, AuthError>> => {
      if (!client) {
        return err({ name: 'AuthError', message: 'Supabase client not initialized', status: 0 } as AuthError);
      }

      const { data, error } = await client.auth.getSession();

      if (error) {
        return err(error);
      }

      return ok(data.session);
    },

    getUser: async (): Promise<Result<User | null, AuthError>> => {
      if (!client) {
        return err({ name: 'AuthError', message: 'Supabase client not initialized', status: 0 } as AuthError);
      }

      const { data, error } = await client.auth.getUser();

      if (error) {
        return err(error);
      }

      return ok(data.user);
    },

    onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void): (() => void) => {
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data: { subscription } } = client.auth.onAuthStateChange(callback);

      return () => {
        subscription.unsubscribe();
      };
    },

    subscribe: (options: RealtimeSubscribeOptions): Result<RealtimeChannel, Error> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        let channel = client.channel(options.channel);

        if (options.table) {
          channel = channel.on(
            'postgres_changes',
            {
              event: options.event || '*',
              schema: 'public',
              table: options.table,
              filter: options.filter,
            },
            options.callback
          );
        }

        channel.subscribe();

        return ok(channel);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    unsubscribe: async (channel: RealtimeChannel): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      try {
        await client.removeChannel(channel);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    uploadFile: async (options: StorageUploadOptions): Promise<Result<{ path: string }, StorageError>> => {
      if (!client) {
        return err({ name: 'StorageError', message: 'Supabase client not initialized' } as StorageError);
      }

      const { data, error } = await client.storage
        .from(options.bucket)
        .upload(options.path, options.file, options.options);

      if (error) {
        return err(error);
      }

      return ok({ path: data.path });
    },

    downloadFile: async (options: StorageDownloadOptions): Promise<Result<Blob, StorageError>> => {
      if (!client) {
        return err({ name: 'StorageError', message: 'Supabase client not initialized' } as StorageError);
      }

      const { data, error } = await client.storage
        .from(options.bucket)
        .download(options.path);

      if (error) {
        return err(error);
      }

      return ok(data);
    },

    listFiles: async (options: StorageListOptions): Promise<Result<FileObject[], StorageError>> => {
      if (!client) {
        return err({ name: 'StorageError', message: 'Supabase client not initialized' } as StorageError);
      }

      const { data, error } = await client.storage
        .from(options.bucket)
        .list(options.path, options.options);

      if (error) {
        return err(error);
      }

      return ok(data);
    },

    deleteFile: async (bucket: string, paths: string[]): Promise<Result<void, StorageError>> => {
      if (!client) {
        return err({ name: 'StorageError', message: 'Supabase client not initialized' } as StorageError);
      }

      const { error } = await client.storage.from(bucket).remove(paths);

      if (error) {
        return err(error);
      }

      return ok(undefined);
    },

    getPublicUrl: (bucket: string, path: string): Result<string, Error> => {
      if (!client) {
        return err(new Error('Supabase client not initialized'));
      }

      const { data } = client.storage.from(bucket).getPublicUrl(path);

      return ok(data.publicUrl);
    },
  };
};
