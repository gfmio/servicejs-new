/**
 * Slack Adapter for ServiceJS
 *
 * Provides team communication and collaboration features via Slack API.
 */

import { ok, err, type Result } from '@servicejs/result';

export interface SlackAdapterConfig {
  /** Bot token (starts with xoxb-) */
  botToken?: string;

  /** User token (starts with xoxp-) */
  userToken?: string;

  /** Signing secret for webhook verification */
  signingSecret?: string;

  /** Webhook URL for incoming webhooks */
  webhookUrl?: string;

  /** API base URL (default: https://slack.com/api) */
  apiUrl?: string;
}

export interface SlackMessage {
  /** Channel ID or name */
  channel: string;

  /** Message text */
  text: string;

  /** Message blocks (rich formatting) */
  blocks?: any[];

  /** Thread timestamp (for threaded messages) */
  thread_ts?: string;

  /** Username override (webhooks only) */
  username?: string;

  /** Icon emoji (webhooks only) */
  icon_emoji?: string;

  /** Icon URL (webhooks only) */
  icon_url?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  num_members?: number;
  topic?: { value: string };
  purpose?: { value: string };
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  email?: string;
  is_bot: boolean;
  is_admin?: boolean;
  profile?: {
    display_name?: string;
    email?: string;
    image_72?: string;
  };
}

export interface SlackMessageResponse {
  ts: string;
  channel: string;
  message?: any;
}

export interface SlackAdapter {
  init(config: SlackAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Post a message to a channel
   */
  postMessage(message: SlackMessage): Promise<Result<SlackMessageResponse, Error>>;

  /**
   * Update an existing message
   */
  updateMessage(channel: string, ts: string, text: string, blocks?: any[]): Promise<Result<SlackMessageResponse, Error>>;

  /**
   * Delete a message
   */
  deleteMessage(channel: string, ts: string): Promise<Result<void, Error>>;

  /**
   * Add a reaction to a message
   */
  addReaction(channel: string, timestamp: string, emoji: string): Promise<Result<void, Error>>;

  /**
   * Remove a reaction from a message
   */
  removeReaction(channel: string, timestamp: string, emoji: string): Promise<Result<void, Error>>;

  /**
   * Get channel information
   */
  getChannel(channelId: string): Promise<Result<SlackChannel, Error>>;

  /**
   * List all channels
   */
  listChannels(options?: { types?: string; limit?: number }): Promise<Result<SlackChannel[], Error>>;

  /**
   * Create a new channel
   */
  createChannel(name: string, isPrivate?: boolean): Promise<Result<SlackChannel, Error>>;

  /**
   * Archive a channel
   */
  archiveChannel(channelId: string): Promise<Result<void, Error>>;

  /**
   * Invite user to channel
   */
  inviteToChannel(channelId: string, userIds: string[]): Promise<Result<void, Error>>;

  /**
   * Get user information
   */
  getUser(userId: string): Promise<Result<SlackUser, Error>>;

  /**
   * List all users
   */
  listUsers(options?: { limit?: number }): Promise<Result<SlackUser[], Error>>;

  /**
   * Send message via webhook
   */
  postWebhook(message: Omit<SlackMessage, 'channel'>): Promise<Result<void, Error>>;
}

export const createSlackAdapter = (): SlackAdapter => {
  let config: SlackAdapterConfig | null = null;

  const makeRequest = async <T = any>(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    useUserToken: boolean = false
  ): Promise<Result<T, Error>> => {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    const token = useUserToken ? config.userToken : config.botToken;
    if (!token) {
      return err(new Error(`${useUserToken ? 'User' : 'Bot'} token not configured`));
    }

    try {
      const url = `${config.apiUrl || 'https://slack.com/api'}/${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!data.ok) {
        return err(new Error(data.error || 'Slack API error'));
      }

      return ok(data as T);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: SlackAdapterConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.botToken && !cfg.userToken && !cfg.webhookUrl) {
          return err(new Error('At least one of botToken, userToken, or webhookUrl is required'));
        }

        config = {
          ...cfg,
          apiUrl: cfg.apiUrl || 'https://slack.com/api',
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
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!config) {
        return ok({ status: 'unhealthy' });
      }

      // Test API connection
      if (config.botToken) {
        const result = await makeRequest('auth.test');
        return ok({ status: result.ok ? 'healthy' : 'unhealthy' });
      }

      return ok({ status: 'healthy' });
    },

    postMessage: async (message: SlackMessage): Promise<Result<SlackMessageResponse, Error>> => {
      const result = await makeRequest<any>('chat.postMessage', 'POST', message);
      if (result.ok) {
        return ok({
          ts: result.value.ts,
          channel: result.value.channel,
          message: result.value.message,
        });
      }
      return err(result.error);
    },

    updateMessage: async (
      channel: string,
      ts: string,
      text: string,
      blocks?: any[]
    ): Promise<Result<SlackMessageResponse, Error>> => {
      const body: any = { channel, ts, text };
      if (blocks) {
        body.blocks = blocks;
      }

      const result = await makeRequest<any>('chat.update', 'POST', body);
      if (result.ok) {
        return ok({
          ts: result.value.ts,
          channel: result.value.channel,
          message: result.value.message,
        });
      }
      return err(result.error);
    },

    deleteMessage: async (channel: string, ts: string): Promise<Result<void, Error>> => {
      const result = await makeRequest('chat.delete', 'POST', { channel, ts });
      return result.ok ? ok(undefined) : err(result.error);
    },

    addReaction: async (channel: string, timestamp: string, emoji: string): Promise<Result<void, Error>> => {
      const result = await makeRequest('reactions.add', 'POST', {
        channel,
        timestamp,
        name: emoji.replace(/:/g, ''),
      });
      return result.ok ? ok(undefined) : err(result.error);
    },

    removeReaction: async (channel: string, timestamp: string, emoji: string): Promise<Result<void, Error>> => {
      const result = await makeRequest('reactions.remove', 'POST', {
        channel,
        timestamp,
        name: emoji.replace(/:/g, ''),
      });
      return result.ok ? ok(undefined) : err(result.error);
    },

    getChannel: async (channelId: string): Promise<Result<SlackChannel, Error>> => {
      const result = await makeRequest<{ channel: any }>('conversations.info', 'GET', { channel: channelId });
      if (result.ok) {
        const ch = result.value.channel;
        return ok({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          is_archived: ch.is_archived,
          num_members: ch.num_members,
          topic: ch.topic,
          purpose: ch.purpose,
        });
      }
      return err(result.error);
    },

    listChannels: async (options?: { types?: string; limit?: number }): Promise<Result<SlackChannel[], Error>> => {
      const params: any = {
        types: options?.types || 'public_channel,private_channel',
        limit: options?.limit || 100,
      };

      const result = await makeRequest<{ channels: any[] }>('conversations.list', 'GET', params);
      if (result.ok) {
        const channels = result.value.channels.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          is_archived: ch.is_archived,
          num_members: ch.num_members,
          topic: ch.topic,
          purpose: ch.purpose,
        }));
        return ok(channels);
      }
      return err(result.error);
    },

    createChannel: async (name: string, isPrivate: boolean = false): Promise<Result<SlackChannel, Error>> => {
      const result = await makeRequest<{ channel: any }>('conversations.create', 'POST', {
        name,
        is_private: isPrivate,
      });

      if (result.ok) {
        const ch = result.value.channel;
        return ok({
          id: ch.id,
          name: ch.name,
          is_private: ch.is_private,
          is_archived: ch.is_archived,
        });
      }
      return err(result.error);
    },

    archiveChannel: async (channelId: string): Promise<Result<void, Error>> => {
      const result = await makeRequest('conversations.archive', 'POST', { channel: channelId });
      return result.ok ? ok(undefined) : err(result.error);
    },

    inviteToChannel: async (channelId: string, userIds: string[]): Promise<Result<void, Error>> => {
      const result = await makeRequest('conversations.invite', 'POST', {
        channel: channelId,
        users: userIds.join(','),
      });
      return result.ok ? ok(undefined) : err(result.error);
    },

    getUser: async (userId: string): Promise<Result<SlackUser, Error>> => {
      const result = await makeRequest<{ user: any }>('users.info', 'GET', { user: userId });
      if (result.ok) {
        const u = result.value.user;
        return ok({
          id: u.id,
          name: u.name,
          real_name: u.real_name,
          is_bot: u.is_bot,
          is_admin: u.is_admin,
          profile: u.profile,
        });
      }
      return err(result.error);
    },

    listUsers: async (options?: { limit?: number }): Promise<Result<SlackUser[], Error>> => {
      const params: any = {
        limit: options?.limit || 100,
      };

      const result = await makeRequest<{ members: any[] }>('users.list', 'GET', params);
      if (result.ok) {
        const users = result.value.members.map((u: any) => ({
          id: u.id,
          name: u.name,
          real_name: u.real_name,
          is_bot: u.is_bot,
          is_admin: u.is_admin,
          profile: u.profile,
        }));
        return ok(users);
      }
      return err(result.error);
    },

    postWebhook: async (message: Omit<SlackMessage, 'channel'>): Promise<Result<void, Error>> => {
      if (!config?.webhookUrl) {
        return err(new Error('Webhook URL not configured'));
      }

      try {
        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          return err(new Error(`Webhook request failed: ${response.statusText}`));
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
