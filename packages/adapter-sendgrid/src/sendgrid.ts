/**
 * SendGrid Email Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { EmailAdapter, EmailMessage, EmailResponse } from '@servicejs/adapter-email';

export interface SendGridConfig {
  apiKey: string;
}

export const createSendGridAdapter = (): EmailAdapter => {
  let sgMail: any = null;

  return {
    init: async (config: SendGridConfig): Promise<Result<void, Error>> => {
      try {
        sgMail = (await import('@sendgrid/mail')).default;
        sgMail.setApiKey(config.apiKey);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!sgMail) {
        return err(new Error('Email not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      sgMail = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!sgMail) {
        return ok({ status: 'unhealthy', error: new Error('Email not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    send: async (message: EmailMessage): Promise<Result<EmailResponse, Error>> => {
      if (!sgMail) {
        return err(new Error('Email not initialized'));
      }

      try {
        const msg: any = {
          from: message.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          cc: message.cc,
          bcc: message.bcc,
          replyTo: message.replyTo,
        };

        if (message.attachments) {
          msg.attachments = message.attachments.map((att) => ({
            filename: att.filename,
            content: att.content instanceof Buffer ? att.content.toString('base64') : att.content,
            type: att.contentType,
            disposition: 'attachment',
          }));
        }

        const response = await sgMail.send(msg);
        const messageId = response[0]?.headers?.['x-message-id'] || '';

        return ok({
          id: messageId,
          provider: 'sendgrid',
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
