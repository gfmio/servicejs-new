/**
 * Resend Email Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { EmailAdapter, EmailMessage, EmailResponse } from '@servicejs/adapter-email';

export interface ResendConfig {
  apiKey: string;
}

export const createResendAdapter = (): EmailAdapter => {
  let resend: any = null;

  return {
    init: async (config: ResendConfig): Promise<Result<void, Error>> => {
      try {
        const { Resend } = await import('resend');
        resend = new Resend(config.apiKey);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!resend) {
        return err(new Error('Email not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      resend = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!resend) {
        return ok({ status: 'unhealthy', error: new Error('Email not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    send: async (message: EmailMessage): Promise<Result<EmailResponse, Error>> => {
      if (!resend) {
        return err(new Error('Email not initialized'));
      }

      try {
        const response = await resend.emails.send({
          from: message.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          cc: message.cc,
          bcc: message.bcc,
          reply_to: message.replyTo,
          attachments: message.attachments,
        });

        return ok({
          id: response.id || response.data?.id,
          provider: 'resend',
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
