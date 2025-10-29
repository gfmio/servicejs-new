/**
 * Redis Streams Adapter
 *
 * Event sourcing and stream processing using Redis Streams
 */

import Redis from 'ioredis';
import { ok, err } from '@servicejs/result';
import type { Result } from '@servicejs/result';

export interface RedisStreamsConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export interface StreamMessage<T = Record<string, string>> {
  id: string;
  data: T;
}

export interface StreamReadResult<T = Record<string, string>> {
  stream: string;
  messages: Array<StreamMessage<T>>;
}

export interface ConsumerGroupInfo {
  name: string;
  consumers: number;
  pending: number;
  lastDeliveredId: string;
}

export interface RedisStreamsAdapter {
  init(config: RedisStreamsConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Stream operations
  xadd(stream: string, data: Record<string, string>, id?: string, maxLen?: number): Promise<Result<string, Error>>;
  xread(streams: Array<{ stream: string; id: string }>, count?: number, block?: number): Promise<Result<StreamReadResult[], Error>>;
  xlen(stream: string): Promise<Result<number, Error>>;
  xrange(stream: string, start: string, end: string, count?: number): Promise<Result<StreamMessage[], Error>>;
  xrevrange(stream: string, end: string, start: string, count?: number): Promise<Result<StreamMessage[], Error>>;
  xtrim(stream: string, maxLen: number): Promise<Result<number, Error>>;
  xdel(stream: string, ids: string[]): Promise<Result<number, Error>>;

  // Consumer group operations
  xgroupCreate(stream: string, group: string, id?: string, mkstream?: boolean): Promise<Result<void, Error>>;
  xgroupDestroy(stream: string, group: string): Promise<Result<number, Error>>;
  xgroupCreateConsumer(stream: string, group: string, consumer: string): Promise<Result<number, Error>>;
  xgroupDelConsumer(stream: string, group: string, consumer: string): Promise<Result<number, Error>>;
  xgroupSetId(stream: string, group: string, id: string): Promise<Result<void, Error>>;

  // Consumer group reading
  xreadgroup(
    group: string,
    consumer: string,
    streams: Array<{ stream: string; id: string }>,
    count?: number,
    block?: number
  ): Promise<Result<StreamReadResult[], Error>>;
  xack(stream: string, group: string, ids: string[]): Promise<Result<number, Error>>;
  xpending(stream: string, group: string, start?: string, end?: string, count?: number, consumer?: string): Promise<Result<any, Error>>;
  xclaim(stream: string, group: string, consumer: string, minIdleTime: number, ids: string[]): Promise<Result<StreamMessage[], Error>>;

  // Info operations
  xinfoStream(stream: string): Promise<Result<any, Error>>;
  xinfoGroups(stream: string): Promise<Result<ConsumerGroupInfo[], Error>>;
  xinfoConsumers(stream: string, group: string): Promise<Result<any[], Error>>;
}

/**
 * Create a Redis Streams adapter
 *
 * Redis Streams is a powerful data structure for event sourcing, message queues,
 * and real-time data processing with consumer groups and acknowledgments.
 *
 * @example
 * ```typescript
 * const streams = createRedisStreams();
 * await streams.init({ host: 'localhost', port: 6379 });
 * await streams.start();
 *
 * // Create a consumer group
 * await streams.xgroupCreate('events', 'processors', '$', true);
 *
 * // Add events
 * await streams.xadd('events', { type: 'user.created', userId: '123' });
 *
 * // Read from consumer group
 * const result = await streams.xreadgroup(
 *   'processors',
 *   'worker-1',
 *   [{ stream: 'events', id: '>' }],
 *   10,
 *   1000
 * );
 *
 * if (isOk(result)) {
 *   for (const stream of result.value) {
 *     for (const msg of stream.messages) {
 *       console.log('Processing:', msg.data);
 *       await streams.xack(stream.stream, 'processors', [msg.id]);
 *     }
 *   }
 * }
 * ```
 */
export const createRedisStreams = (): RedisStreamsAdapter => {
  let client: Redis | null = null;
  let initialized = false;

  return {
    init: async (config: RedisStreamsConfig): Promise<Result<void, Error>> => {
      try {
        const options: {
          host: string;
          port: number;
          password?: string;
          db: number;
          keyPrefix?: string;
        } = {
          host: config.host || 'localhost',
          port: config.port || 6379,
          db: config.db || 0,
        };

        if (config.password !== undefined) {
          options.password = config.password;
        }

        if (config.keyPrefix !== undefined) {
          options.keyPrefix = config.keyPrefix;
        }

        client = new Redis(options);

        await new Promise<void>((resolve, reject) => {
          client!.once('ready', () => resolve());
          client!.once('error', (err) => reject(err));
        });

        initialized = true;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!initialized || !client) {
        return err(new Error('Redis Streams client not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        await client.quit();
        client = null;
      }
      initialized = false;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!initialized || !client) {
        return ok({ status: 'unhealthy', error: new Error('Redis Streams client not initialized') });
      }

      try {
        await client.ping();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    // Stream operations
    xadd: async (stream: string, data: Record<string, string>, id?: string, maxLen?: number): Promise<Result<string, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const flatData: string[] = [];
        for (const [key, value] of Object.entries(data)) {
          flatData.push(key, value);
        }

        let messageId: string | null;
        if (maxLen !== undefined) {
          messageId = await client.xadd(stream, 'MAXLEN', '~', maxLen, id || '*', ...flatData);
        } else {
          messageId = await client.xadd(stream, id || '*', ...flatData);
        }
        return ok(messageId || '');
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xread: async (streams: Array<{ stream: string; id: string }>, count?: number, block?: number): Promise<Result<StreamReadResult[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const streamNames = streams.map((s) => s.stream);
        const streamIds = streams.map((s) => s.id);

        let result: any;
        if (count !== undefined && block !== undefined) {
          result = await client.xread('COUNT', count, 'BLOCK', block, 'STREAMS', ...streamNames, ...streamIds);
        } else if (count !== undefined) {
          result = await client.xread('COUNT', count, 'STREAMS', ...streamNames, ...streamIds);
        } else if (block !== undefined) {
          result = await client.xread('BLOCK', block, 'STREAMS', ...streamNames, ...streamIds);
        } else {
          result = await client.xread('STREAMS', ...streamNames, ...streamIds);
        }

        if (!result) {
          return ok([]);
        }

        const parsed: StreamReadResult[] = result.map((streamData: any) => ({
          stream: streamData[0],
          messages: streamData[1].map((msg: any) => ({
            id: msg[0],
            data: msg[1].reduce((acc: any, val: any, idx: number, arr: any[]) => {
              if (idx % 2 === 0) {
                acc[val] = arr[idx + 1];
              }
              return acc;
            }, {}),
          })),
        }));

        return ok(parsed);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xlen: async (stream: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const length = await client.xlen(stream);
        return ok(length);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xrange: async (stream: string, start: string, end: string, count?: number): Promise<Result<StreamMessage[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = count !== undefined
          ? await client.xrange(stream, start, end, 'COUNT', count)
          : await client.xrange(stream, start, end);
        const messages: StreamMessage[] = result.map((msg: any) => ({
          id: msg[0],
          data: msg[1].reduce((acc: any, val: any, idx: number, arr: any[]) => {
            if (idx % 2 === 0) {
              acc[val] = arr[idx + 1];
            }
            return acc;
          }, {}),
        }));

        return ok(messages);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xrevrange: async (stream: string, end: string, start: string, count?: number): Promise<Result<StreamMessage[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = count !== undefined
          ? await client.xrevrange(stream, end, start, 'COUNT', count)
          : await client.xrevrange(stream, end, start);
        const messages: StreamMessage[] = result.map((msg: any) => ({
          id: msg[0],
          data: msg[1].reduce((acc: any, val: any, idx: number, arr: any[]) => {
            if (idx % 2 === 0) {
              acc[val] = arr[idx + 1];
            }
            return acc;
          }, {}),
        }));

        return ok(messages);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xtrim: async (stream: string, maxLen: number): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const count = await client.xtrim(stream, 'MAXLEN', '~', maxLen);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xdel: async (stream: string, ids: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const count = await client.xdel(stream, ...ids);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Consumer group operations
    xgroupCreate: async (stream: string, group: string, id?: string, mkstream?: boolean): Promise<Result<void, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        if (mkstream) {
          await client.xgroup('CREATE', stream, group, id || '$', 'MKSTREAM');
        } else {
          await client.xgroup('CREATE', stream, group, id || '$');
        }
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xgroupDestroy: async (stream: string, group: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xgroup('DESTROY', stream, group) as number;
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xgroupCreateConsumer: async (stream: string, group: string, consumer: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xgroup('CREATECONSUMER', stream, group, consumer) as number;
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xgroupDelConsumer: async (stream: string, group: string, consumer: string): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xgroup('DELCONSUMER', stream, group, consumer) as number;
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xgroupSetId: async (stream: string, group: string, id: string): Promise<Result<void, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        await client.xgroup('SETID', stream, group, id);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Consumer group reading
    xreadgroup: async (
      group: string,
      consumer: string,
      streams: Array<{ stream: string; id: string }>,
      count?: number,
      block?: number
    ): Promise<Result<StreamReadResult[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const streamNames = streams.map((s) => s.stream);
        const streamIds = streams.map((s) => s.id);

        let result: any;
        if (count !== undefined && block !== undefined) {
          result = await client.xreadgroup('GROUP', group, consumer, 'COUNT', count, 'BLOCK', block, 'STREAMS', ...streamNames, ...streamIds);
        } else if (count !== undefined) {
          result = await client.xreadgroup('GROUP', group, consumer, 'COUNT', count, 'STREAMS', ...streamNames, ...streamIds);
        } else if (block !== undefined) {
          result = await client.xreadgroup('GROUP', group, consumer, 'BLOCK', block, 'STREAMS', ...streamNames, ...streamIds);
        } else {
          result = await client.xreadgroup('GROUP', group, consumer, 'STREAMS', ...streamNames, ...streamIds);
        }

        if (!result) {
          return ok([]);
        }

        const parsed: StreamReadResult[] = result.map((streamData: any) => ({
          stream: streamData[0],
          messages: streamData[1].map((msg: any) => ({
            id: msg[0],
            data: msg[1].reduce((acc: any, val: any, idx: number, arr: any[]) => {
              if (idx % 2 === 0) {
                acc[val] = arr[idx + 1];
              }
              return acc;
            }, {}),
          })),
        }));

        return ok(parsed);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xack: async (stream: string, group: string, ids: string[]): Promise<Result<number, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const count = await client.xack(stream, group, ...ids);
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xpending: async (stream: string, group: string, start?: string, end?: string, count?: number, consumer?: string): Promise<Result<any, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        let result: any;
        if (start !== undefined && end !== undefined) {
          if (consumer !== undefined) {
            result = await client.xpending(stream, group, start, end, count || 10, consumer);
          } else {
            result = await client.xpending(stream, group, start, end, count || 10);
          }
        } else {
          result = await client.xpending(stream, group);
        }
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xclaim: async (stream: string, group: string, consumer: string, minIdleTime: number, ids: string[]): Promise<Result<StreamMessage[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xclaim(stream, group, consumer, minIdleTime, ...ids);
        const messages: StreamMessage[] = result.map((msg: any) => ({
          id: msg[0],
          data: msg[1].reduce((acc: any, val: any, idx: number, arr: any[]) => {
            if (idx % 2 === 0) {
              acc[val] = arr[idx + 1];
            }
            return acc;
          }, {}),
        }));

        return ok(messages);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // Info operations
    xinfoStream: async (stream: string): Promise<Result<any, Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xinfo('STREAM', stream);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xinfoGroups: async (stream: string): Promise<Result<ConsumerGroupInfo[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xinfo('GROUPS', stream) as any[];
        const groups: ConsumerGroupInfo[] = result.map((group: any) => ({
          name: group[1],
          consumers: group[3],
          pending: group[5],
          lastDeliveredId: group[7],
        }));
        return ok(groups);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    xinfoConsumers: async (stream: string, group: string): Promise<Result<any[], Error>> => {
      if (!client) return err(new Error('Redis Streams client not initialized'));
      try {
        const result = await client.xinfo('CONSUMERS', stream, group) as any[];
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
