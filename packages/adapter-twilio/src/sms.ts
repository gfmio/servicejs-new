/**
 * Twilio SMS Adapter
 * Implements @servicejs/adapter-sms types
 */

import type { Result } from '@servicejs/result';
import type { SMSAdapter, SMSMessage, SMSMessageResponse, SMSBatchResult } from '@servicejs/adapter-sms';
import { err, ok } from '@servicejs/result';
import twilio from 'twilio';

export interface TwilioSMSConfig {
  accountSid: string;
  authToken: string;
  from: string; // Default sender number
}

export const createTwilioSMSAdapter = (): SMSAdapter<TwilioSMSConfig> => {
  let client: ReturnType<typeof twilio> | null = null;
  let config: TwilioSMSConfig | null = null;

  return {
    init: async (cfg: TwilioSMSConfig): Promise<Result<void, Error>> => {
      try {
        client = twilio(cfg.accountSid, cfg.authToken);
        config = cfg;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Twilio not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      client = null;
      config = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      if (!client || !config) {
        return ok({ status: 'unhealthy' });
      }

      try {
        // Verify credentials by fetching account info
        await client.api.accounts(config.accountSid).fetch();
        return ok({ status: 'healthy' });
      } catch {
        return ok({ status: 'unhealthy' });
      }
    },

    send: async (message: SMSMessage): Promise<Result<SMSMessageResponse, Error>> => {
      if (!client || !config) {
        return err(new Error('Twilio not initialized'));
      }

      try {
        const response = await client.messages.create({
          from: message.from || config.from,
          to: message.to,
          body: message.body,
          mediaUrl: message.mediaUrls,
        });

        return ok({
          messageId: response.sid,
          success: true,
          status: response.status,
          cost: response.price ? {
            amount: Math.abs(parseFloat(response.price)).toString(),
            currency: response.priceUnit || 'USD',
          } : undefined,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    sendBatch: async (messages: SMSMessage[]): Promise<Result<SMSBatchResult[], Error>> => {
      if (!client || !config) {
        return err(new Error('Twilio not initialized'));
      }

      const results: SMSBatchResult[] = await Promise.all(
        messages.map(async (message) => {
          try {
            const response = await client!.messages.create({
              from: message.from || config!.from,
              to: message.to,
              body: message.body,
              mediaUrl: message.mediaUrls,
            });

            return {
              success: true,
              messageId: response.sid,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      return ok(results);
    },
  };
};
