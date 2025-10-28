/**
 * Twilio Adapter
 * Supports SMS and Voice calls
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import twilio from 'twilio';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
}

export interface SMSMessage {
  from: string;
  to: string;
  body: string;
  mediaUrl?: string[];
}

export interface SMSResponse {
  sid: string;
  status: string;
  dateCreated: Date;
}

export interface VoiceCallOptions {
  from: string;
  to: string;
  url?: string;
  twiml?: string;
  statusCallback?: string;
  statusCallbackMethod?: 'GET' | 'POST';
}

export interface VoiceCallResponse {
  sid: string;
  status: string;
  direction: string;
}

export interface TwilioAdapter {
  init(config: TwilioConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  sendSMS(message: SMSMessage): Promise<Result<SMSResponse, Error>>;
  makeCall(options: VoiceCallOptions): Promise<Result<VoiceCallResponse, Error>>;
  getMessageStatus(sid: string): Promise<Result<SMSResponse, Error>>;
  getCallStatus(sid: string): Promise<Result<VoiceCallResponse, Error>>;
}

export const createTwilioAdapter = (): TwilioAdapter => {
  let client: ReturnType<typeof twilio> | null = null;

  return {
    init: async (config: TwilioConfig): Promise<Result<void, Error>> => {
      try {
        client = twilio(config.accountSid, config.authToken);
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
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Twilio not initialized') });
      }

      try {
        // Try to fetch account info to verify credentials
        await client.api.accounts(client.accountSid).fetch();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    sendSMS: async (message: SMSMessage): Promise<Result<SMSResponse, Error>> => {
      if (!client) {
        return err(new Error('Twilio not initialized'));
      }

      try {
        const response = await client.messages.create({
          from: message.from,
          to: message.to,
          body: message.body,
          mediaUrl: message.mediaUrl,
        });

        return ok({
          sid: response.sid,
          status: response.status,
          dateCreated: response.dateCreated,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    makeCall: async (options: VoiceCallOptions): Promise<Result<VoiceCallResponse, Error>> => {
      if (!client) {
        return err(new Error('Twilio not initialized'));
      }

      try {
        const callOptions: any = {
          from: options.from,
          to: options.to,
        };

        if (options.url) {
          callOptions.url = options.url;
        } else if (options.twiml) {
          callOptions.twiml = options.twiml;
        } else {
          return err(new Error('Either url or twiml must be provided'));
        }

        if (options.statusCallback) {
          callOptions.statusCallback = options.statusCallback;
          callOptions.statusCallbackMethod = options.statusCallbackMethod || 'POST';
        }

        const response = await client.calls.create(callOptions);

        return ok({
          sid: response.sid,
          status: response.status,
          direction: response.direction,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getMessageStatus: async (sid: string): Promise<Result<SMSResponse, Error>> => {
      if (!client) {
        return err(new Error('Twilio not initialized'));
      }

      try {
        const message = await client.messages(sid).fetch();

        return ok({
          sid: message.sid,
          status: message.status,
          dateCreated: message.dateCreated,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getCallStatus: async (sid: string): Promise<Result<VoiceCallResponse, Error>> => {
      if (!client) {
        return err(new Error('Twilio not initialized'));
      }

      try {
        const call = await client.calls(sid).fetch();

        return ok({
          sid: call.sid,
          status: call.status,
          direction: call.direction,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
