/**
 * Telegram Adapter for ServiceJS
 * Provides bot messaging via Telegram Bot API
 */

import { ok, err, type Result } from '@servicejs/result';

export interface TelegramAdapterConfig {
  botToken: string;
  apiUrl?: string;
}

export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_to_message_id?: number;
  disable_notification?: boolean;
}

export interface TelegramAdapter {
  init(config: TelegramAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  sendMessage(message: TelegramMessage): Promise<Result<any, Error>>;
  editMessage(chatId: string | number, messageId: number, text: string): Promise<Result<any, Error>>;
  deleteMessage(chatId: string | number, messageId: number): Promise<Result<void, Error>>;
  sendPhoto(chatId: string | number, photo: string, caption?: string): Promise<Result<any, Error>>;
  getMe(): Promise<Result<any, Error>>;
}

export const createTelegramAdapter = (): TelegramAdapter => {
  let config: TelegramAdapterConfig | null = null;

  const makeRequest = async <T = any>(method: string, body?: any): Promise<Result<T, Error>> => {
    if (!config) return err(new Error('Adapter not initialized'));

    try {
      const url = `${config.apiUrl || 'https://api.telegram.org'}/bot${config.botToken}/${method}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!data.ok) return err(new Error(data.description || 'Telegram API error'));

      return ok(data.result as T);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: TelegramAdapterConfig) => {
      if (!cfg.botToken) return err(new Error('Bot token is required'));
      config = cfg;
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => { config = null; return ok(undefined); },

    health: async () => {
      if (!config) return ok({ status: 'unhealthy' as const });
      const result = await makeRequest('getMe');
      return ok({ status: result.ok ? 'healthy' as const : 'unhealthy' as const });
    },

    sendMessage: async (message) => makeRequest('sendMessage', message),
    editMessage: async (chatId, messageId, text) =>
      makeRequest('editMessageText', { chat_id: chatId, message_id: messageId, text }),
    deleteMessage: async (chatId, messageId) =>
      makeRequest('deleteMessage', { chat_id: chatId, message_id: messageId }),
    sendPhoto: async (chatId, photo, caption) =>
      makeRequest('sendPhoto', { chat_id: chatId, photo, caption }),
    getMe: async () => makeRequest('getMe'),
  };
};
