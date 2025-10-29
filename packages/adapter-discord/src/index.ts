/**
 * Discord Adapter for ServiceJS
 *
 * Provides community platform and bot integration via Discord API.
 */

import { ok, err, type Result } from '@servicejs/result';

export interface DiscordAdapterConfig {
  /** Bot token */
  botToken?: string;

  /** Webhook URL for sending messages */
  webhookUrl?: string;

  /** Application ID */
  applicationId?: string;

  /** API base URL (default: https://discord.com/api/v10) */
  apiUrl?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

export interface DiscordMessage {
  /** Message content */
  content: string;

  /** Rich embeds */
  embeds?: DiscordEmbed[];

  /** Thread to reply in */
  thread_id?: string;

  /** Username override (webhooks only) */
  username?: string;

  /** Avatar URL (webhooks only) */
  avatar_url?: string;
}

export interface DiscordChannel {
  id: string;
  type: number;
  name?: string;
  position?: number;
  guild_id?: string;
  topic?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner_id: string;
  member_count?: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
}

export interface DiscordMessageResponse {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
}

export interface DiscordAdapter {
  init(config: DiscordAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Send a message to a channel
   */
  sendMessage(channelId: string, message: DiscordMessage): Promise<Result<DiscordMessageResponse, Error>>;

  /**
   * Edit a message
   */
  editMessage(channelId: string, messageId: string, content: string, embeds?: DiscordEmbed[]): Promise<Result<DiscordMessageResponse, Error>>;

  /**
   * Delete a message
   */
  deleteMessage(channelId: string, messageId: string): Promise<Result<void, Error>>;

  /**
   * Add a reaction to a message
   */
  addReaction(channelId: string, messageId: string, emoji: string): Promise<Result<void, Error>>;

  /**
   * Remove a reaction
   */
  removeReaction(channelId: string, messageId: string, emoji: string): Promise<Result<void, Error>>;

  /**
   * Get channel information
   */
  getChannel(channelId: string): Promise<Result<DiscordChannel, Error>>;

  /**
   * Get guild (server) information
   */
  getGuild(guildId: string): Promise<Result<DiscordGuild, Error>>;

  /**
   * List guild channels
   */
  listGuildChannels(guildId: string): Promise<Result<DiscordChannel[], Error>>;

  /**
   * Get user information
   */
  getUser(userId: string): Promise<Result<DiscordUser, Error>>;

  /**
   * Get current bot user
   */
  getCurrentUser(): Promise<Result<DiscordUser, Error>>;

  /**
   * Send message via webhook
   */
  sendWebhook(message: DiscordMessage): Promise<Result<DiscordMessageResponse, Error>>;

  /**
   * Create an invite for a channel
   */
  createInvite(channelId: string, options?: { max_age?: number; max_uses?: number }): Promise<Result<{ code: string; url: string }, Error>>;
}

export const createDiscordAdapter = (): DiscordAdapter => {
  let config: DiscordAdapterConfig | null = null;

  const makeRequest = async <T = any>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<Result<T, Error>> => {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    if (!config.botToken) {
      return err(new Error('Bot token not configured'));
    }

    try {
      const url = `${config.apiUrl || 'https://discord.com/api/v10'}/${endpoint}`;
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bot ${config.botToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (method === 'DELETE' && response.status === 204) {
        return ok(undefined as T);
      }

      if (!response.ok) {
        const error = await response.text();
        return err(new Error(`Discord API error: ${response.status} ${error}`));
      }

      const data = await response.json();
      return ok(data as T);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: DiscordAdapterConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.botToken && !cfg.webhookUrl) {
          return err(new Error('Either botToken or webhookUrl is required'));
        }

        config = {
          ...cfg,
          apiUrl: cfg.apiUrl || 'https://discord.com/api/v10',
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
        const result = await makeRequest<any>('users/@me');
        return ok({ status: result.ok ? 'healthy' : 'unhealthy' });
      }

      return ok({ status: 'healthy' });
    },

    sendMessage: async (channelId: string, message: DiscordMessage): Promise<Result<DiscordMessageResponse, Error>> => {
      const body: any = { content: message.content };
      if (message.embeds) {
        body.embeds = message.embeds;
      }

      const result = await makeRequest<any>(`channels/${channelId}/messages`, 'POST', body);
      if (result.ok) {
        return ok({
          id: result.value.id,
          channel_id: result.value.channel_id,
          content: result.value.content,
          timestamp: result.value.timestamp,
        });
      }
      return err(result.error);
    },

    editMessage: async (
      channelId: string,
      messageId: string,
      content: string,
      embeds?: DiscordEmbed[]
    ): Promise<Result<DiscordMessageResponse, Error>> => {
      const body: any = { content };
      if (embeds) {
        body.embeds = embeds;
      }

      const result = await makeRequest<any>(`channels/${channelId}/messages/${messageId}`, 'PATCH', body);
      if (result.ok) {
        return ok({
          id: result.value.id,
          channel_id: result.value.channel_id,
          content: result.value.content,
          timestamp: result.value.timestamp,
        });
      }
      return err(result.error);
    },

    deleteMessage: async (channelId: string, messageId: string): Promise<Result<void, Error>> => {
      const result = await makeRequest(`channels/${channelId}/messages/${messageId}`, 'DELETE');
      return result.ok ? ok(undefined) : err(result.error);
    },

    addReaction: async (channelId: string, messageId: string, emoji: string): Promise<Result<void, Error>> => {
      const encodedEmoji = encodeURIComponent(emoji);
      const result = await makeRequest(
        `channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
        'PUT'
      );
      return result.ok ? ok(undefined) : err(result.error);
    },

    removeReaction: async (channelId: string, messageId: string, emoji: string): Promise<Result<void, Error>> => {
      const encodedEmoji = encodeURIComponent(emoji);
      const result = await makeRequest(
        `channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
        'DELETE'
      );
      return result.ok ? ok(undefined) : err(result.error);
    },

    getChannel: async (channelId: string): Promise<Result<DiscordChannel, Error>> => {
      const result = await makeRequest<any>(`channels/${channelId}`);
      if (result.ok) {
        return ok({
          id: result.value.id,
          type: result.value.type,
          name: result.value.name,
          position: result.value.position,
          guild_id: result.value.guild_id,
          topic: result.value.topic,
        });
      }
      return err(result.error);
    },

    getGuild: async (guildId: string): Promise<Result<DiscordGuild, Error>> => {
      const result = await makeRequest<any>(`guilds/${guildId}?with_counts=true`);
      if (result.ok) {
        return ok({
          id: result.value.id,
          name: result.value.name,
          icon: result.value.icon,
          owner_id: result.value.owner_id,
          member_count: result.value.approximate_member_count,
        });
      }
      return err(result.error);
    },

    listGuildChannels: async (guildId: string): Promise<Result<DiscordChannel[], Error>> => {
      const result = await makeRequest<any[]>(`guilds/${guildId}/channels`);
      if (result.ok) {
        const channels = result.value.map((ch: any) => ({
          id: ch.id,
          type: ch.type,
          name: ch.name,
          position: ch.position,
          guild_id: ch.guild_id,
          topic: ch.topic,
        }));
        return ok(channels);
      }
      return err(result.error);
    },

    getUser: async (userId: string): Promise<Result<DiscordUser, Error>> => {
      const result = await makeRequest<any>(`users/${userId}`);
      if (result.ok) {
        return ok({
          id: result.value.id,
          username: result.value.username,
          discriminator: result.value.discriminator,
          avatar: result.value.avatar,
          bot: result.value.bot,
        });
      }
      return err(result.error);
    },

    getCurrentUser: async (): Promise<Result<DiscordUser, Error>> => {
      const result = await makeRequest<any>('users/@me');
      if (result.ok) {
        return ok({
          id: result.value.id,
          username: result.value.username,
          discriminator: result.value.discriminator,
          avatar: result.value.avatar,
          bot: result.value.bot,
        });
      }
      return err(result.error);
    },

    sendWebhook: async (message: DiscordMessage): Promise<Result<DiscordMessageResponse, Error>> => {
      if (!config?.webhookUrl) {
        return err(new Error('Webhook URL not configured'));
      }

      try {
        const body: any = { content: message.content };
        if (message.embeds) {
          body.embeds = message.embeds;
        }
        if (message.username) {
          body.username = message.username;
        }
        if (message.avatar_url) {
          body.avatar_url = message.avatar_url;
        }

        const response = await fetch(`${config.webhookUrl}?wait=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          return err(new Error(`Webhook request failed: ${response.statusText}`));
        }

        const data = await response.json();
        return ok({
          id: data.id,
          channel_id: data.channel_id,
          content: data.content,
          timestamp: data.timestamp,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createInvite: async (
      channelId: string,
      options?: { max_age?: number; max_uses?: number }
    ): Promise<Result<{ code: string; url: string }, Error>> => {
      const body: any = {
        max_age: options?.max_age || 86400, // 24 hours default
        max_uses: options?.max_uses || 0, // Unlimited default
      };

      const result = await makeRequest<any>(`channels/${channelId}/invites`, 'POST', body);
      if (result.ok) {
        return ok({
          code: result.value.code,
          url: `https://discord.gg/${result.value.code}`,
        });
      }
      return err(result.error);
    },
  };
};
