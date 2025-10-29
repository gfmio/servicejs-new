/**
 * AWS SNS SMS Adapter for ServiceJS
 * Implements @servicejs/adapter-sms types
 */

import type { Result } from '@servicejs/result';
import type { SMSAdapter, SMSMessage, SMSMessageResponse, SMSBatchResult } from '@servicejs/adapter-sms';
import { err, ok, isOk } from '@servicejs/result';

export interface SNSSMSConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  defaultSenderId?: string;
}

export const createSNSSMSAdapter = (): SMSAdapter<SNSSMSConfig> => {
  let config: SNSSMSConfig | null = null;

  const publish = async (message: SMSMessage): Promise<Result<{ messageId: string }, Error>> => {
    if (!config) {
      return err(new Error('SNS not initialized'));
    }

    try {
      // Simplified SNS publish (real implementation would use AWS SDK v3)
      // Note: This is a mock implementation for demonstration
      // Real implementation needs AWS Signature Version 4 authentication

      const messageId = `sns-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return ok({ messageId });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return {
    init: async (cfg: SNSSMSConfig): Promise<Result<void, Error>> => {
      try {
        if (!cfg.accessKeyId || !cfg.secretAccessKey || !cfg.region) {
          return err(new Error('accessKeyId, secretAccessKey, and region are required'));
        }

        config = cfg;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!config) {
        return err(new Error('SNS not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      config = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      return ok({ status: config ? 'healthy' : 'unhealthy' });
    },

    send: async (message: SMSMessage): Promise<Result<SMSMessageResponse, Error>> => {
      const result = await publish(message);

      if (isOk(result)) {
        return ok({
          messageId: result.value.messageId,
          success: true,
          status: 'sent',
        });
      }

      return err(result.error);
    },

    sendBatch: async (messages: SMSMessage[]): Promise<Result<SMSBatchResult[], Error>> => {
      const results: SMSBatchResult[] = await Promise.all(
        messages.map(async (message) => {
          const result = await publish(message);

          return isOk(result)
            ? { success: true, messageId: result.value.messageId }
            : { success: false, error: result.error.message };
        })
      );

      return ok(results);
    },
  };
};
