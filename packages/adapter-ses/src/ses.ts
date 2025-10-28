/**
 * AWS SES Email Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { EmailAdapter, EmailMessage, EmailResponse } from '@servicejs/adapter-email';

export interface SESConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export const createSESAdapter = (): EmailAdapter => {
  let ses: any = null;

  return {
    init: async (config: SESConfig): Promise<Result<void, Error>> => {
      try {
        const { SESClient } = await import('@aws-sdk/client-ses');
        ses = new SESClient({
          region: config.region,
          credentials: config.credentials,
        });
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!ses) {
        return err(new Error('Email not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (ses) {
        ses.destroy();
        ses = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!ses) {
        return ok({ status: 'unhealthy', error: new Error('Email not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    send: async (message: EmailMessage): Promise<Result<EmailResponse, Error>> => {
      if (!ses) {
        return err(new Error('Email not initialized'));
      }

      try {
        const { SendEmailCommand } = await import('@aws-sdk/client-ses');

        const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
        const ccAddresses = message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined;
        const bccAddresses = message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined;

        const response = await ses.send(
          new SendEmailCommand({
            Source: message.from,
            Destination: {
              ToAddresses: toAddresses,
              CcAddresses: ccAddresses,
              BccAddresses: bccAddresses,
            },
            Message: {
              Subject: {
                Data: message.subject,
              },
              Body: {
                Html: message.html ? { Data: message.html } : undefined,
                Text: message.text ? { Data: message.text } : undefined,
              },
            },
            ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
          })
        );

        return ok({
          id: response.MessageId || '',
          provider: 'ses',
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
