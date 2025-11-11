/**
 * Common types for Cloudflare Workers adapters
 */

import { Result } from '@servicejs/result';

/**
 * HTTP request information extracted from Cloudflare Request
 */
export interface WorkersHTTPRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string | ArrayBuffer;
  cf?: IncomingRequestCfProperties;
}

/**
 * HTTP response for Workers
 */
export interface WorkersHTTPResponse {
  statusCode?: number;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | ReadableStream;
}

/**
 * Handler for HTTP requests in Workers
 */
export type FetchHandler<Env = unknown> = (
  request: WorkersHTTPRequest,
  env: Env,
  ctx: ExecutionContext
) => Promise<WorkersHTTPResponse> | WorkersHTTPResponse;

/**
 * Scheduled event information
 */
export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

/**
 * Handler for scheduled events (cron triggers)
 */
export type ScheduledHandler<Env = unknown> = (
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
) => Promise<void> | void;

/**
 * Queue message batch
 */
export interface QueueMessageBatch<Body = unknown> {
  queue: string;
  messages: Array<{
    id: string;
    timestamp: Date;
    body: Body;
  }>;
}

/**
 * Handler for queue consumers
 */
export type QueueHandler<Env = unknown, Body = unknown> = (
  batch: QueueMessageBatch<Body>,
  env: Env,
  ctx: ExecutionContext
) => Promise<void> | void;

/**
 * Durable Object state interface
 */
export interface DurableObjectState {
  id: DurableObjectId;
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Alarm handler for Durable Objects
 */
export type AlarmHandler<Env = unknown> = (
  env: Env
) => Promise<void> | void;

/**
 * Error handler type
 */
export type ErrorHandler = (error: Error) => void | Promise<void>;
