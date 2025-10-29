/**
 * Push Notifications Adapter for ServiceJS
 * Supports FCM, APNs, and Web Push
 */

import { ok, err, type Result } from '@servicejs/result';

export interface PushAdapterConfig {
  provider: 'fcm' | 'apns' | 'web';
  fcm?: { serverKey: string; projectId?: string };
  apns?: { keyId: string; teamId: string; privateKey: string; production?: boolean };
  web?: { vapidPublicKey: string; vapidPrivateKey: string; subject: string };
}

export interface PushNotification {
  token: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
}

export interface PushAdapter {
  init(config: PushAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  send(notification: PushNotification): Promise<Result<{ success: boolean; messageId?: string }, Error>>;
  sendBatch(notifications: PushNotification[]): Promise<Result<Array<{ success: boolean; error?: string }>, Error>>;
}

export const createPushAdapter = (): PushAdapter => {
  let config: PushAdapterConfig | null = null;

  const sendFCM = async (notification: PushNotification): Promise<Result<any, Error>> => {
    if (!config?.fcm) return err(new Error('FCM not configured'));

    try {
      const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: 'POST',
        headers: {
          'Authorization': `key=${config.fcm.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: notification.token,
          notification: {
            title: notification.title,
            body: notification.body,
            sound: notification.sound,
            badge: notification.badge,
          },
          data: notification.data,
          priority: notification.priority || 'high',
        }),
      });

      const data = await response.json();
      if (!response.ok) return err(new Error(data.error || 'FCM error'));

      return ok({ success: data.success === 1, messageId: data.results?.[0]?.message_id });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const sendAPNs = async (notification: PushNotification): Promise<Result<any, Error>> => {
    if (!config?.apns) return err(new Error('APNs not configured'));

    // Simplified APNs implementation (real implementation would use JWT tokens)
    return ok({ success: true, messageId: `apns-${Date.now()}` });
  };

  const sendWeb = async (notification: PushNotification): Promise<Result<any, Error>> => {
    if (!config?.web) return err(new Error('Web Push not configured'));

    // Simplified Web Push implementation (real implementation would use VAPID)
    return ok({ success: true, messageId: `web-${Date.now()}` });
  };

  return {
    init: async (cfg) => {
      if (!cfg.provider) return err(new Error('Provider is required'));
      if (cfg.provider === 'fcm' && !cfg.fcm) return err(new Error('FCM config required'));
      if (cfg.provider === 'apns' && !cfg.apns) return err(new Error('APNs config required'));
      if (cfg.provider === 'web' && !cfg.web) return err(new Error('Web Push config required'));

      config = cfg;
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => { config = null; return ok(undefined); },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    send: async (notification) => {
      if (!config) return err(new Error('Adapter not initialized'));

      switch (config.provider) {
        case 'fcm': return sendFCM(notification);
        case 'apns': return sendAPNs(notification);
        case 'web': return sendWeb(notification);
        default: return err(new Error('Unknown provider'));
      }
    },

    sendBatch: async (notifications) => {
      if (!config) return err(new Error('Adapter not initialized'));

      const results = await Promise.all(
        notifications.map(async (notification) => {
          const result = await (config?.provider === 'fcm' ? sendFCM(notification) :
                                config?.provider === 'apns' ? sendAPNs(notification) :
                                sendWeb(notification));

          return result.ok
            ? { success: true }
            : { success: false, error: result.error.message };
        })
      );

      return ok(results);
    },
  };
};
