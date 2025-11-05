/**
 * Node.js HTTP/2 Server Adapter for ServiceJS
 * HTTP/2 server with stream multiplexing support
 */

import * as http2 from 'http2';
import { Result, ok, err } from '@servicejs/result';

export interface HTTP2ServerConfig {
  host?: string;
  port: number;
  key?: string | Buffer;  // For HTTPS
  cert?: string | Buffer; // For HTTPS
  allowHTTP1?: boolean;   // Allow HTTP/1.1 fallback
}

export interface HTTP2Request {
  id: string;
  method: string;
  url: string;
  headers: http2.IncomingHttpHeaders;
  body: Buffer;
  query: Record<string, string | string[]>;
}

export interface HTTP2Response {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body: string | Buffer;
}

export type RequestHandler = (request: HTTP2Request) => HTTP2Response | Promise<HTTP2Response>;
export type ErrorHandler = (error: Error, requestId?: string) => void;

export interface HTTP2ServerAdapter {
  init(config: HTTP2ServerConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;
  onRequest(handler: RequestHandler): void;
  onError(handler: ErrorHandler): void;
  getActiveStreams(): Promise<Result<number, Error>>;
}

export function createHTTP2Server(): HTTP2ServerAdapter {
  let config: HTTP2ServerConfig | null = null;
  let server: http2.Http2Server | http2.Http2SecureServer | null = null;
  let isRunning = false;
  let requestIdCounter = 0;
  let activeStreams = 0;
  let requestHandler: RequestHandler | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg: HTTP2ServerConfig): Promise<Result<void, Error>> {
      if (!cfg.port) return err(new Error('Port is required'));
      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) return err(new Error('Server not initialized'));
      if (server) return err(new Error('Server already started'));

      return new Promise((resolve) => {
        const handleStream = async (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) => {
          const requestId = `req_${++requestIdCounter}`;
          activeStreams++;

          try {
            const method = headers[':method'] as string || 'GET';
            const path = headers[':path'] as string || '/';
            const url = new URL(path, `http://localhost`);

            const query: Record<string, string | string[]> = {};
            url.searchParams.forEach((value, key) => {
              const existing = query[key];
              query[key] = existing ? (Array.isArray(existing) ? [...existing, value] : [existing, value]) : value;
            });

            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));

            await new Promise<void>((resolveData) => {
              stream.on('end', () => resolveData());
            });

            const http2Request: HTTP2Request = {
              id: requestId,
              method,
              url: url.pathname,
              headers,
              body: Buffer.concat(chunks),
              query,
            };

            if (requestHandler) {
              try {
                const response = await Promise.resolve(requestHandler(http2Request));

                const responseHeaders: http2.OutgoingHttpHeaders = {
                  ':status': response.statusCode,
                  ...response.headers,
                };

                stream.respond(responseHeaders);
                stream.end(response.body);
              } catch (error) {
                if (errorHandler) errorHandler(error as Error, requestId);
                stream.respond({ ':status': 500 });
                stream.end('Internal Server Error');
              }
            } else {
              stream.respond({ ':status': 404 });
              stream.end('Not Found');
            }
          } catch (error) {
            if (errorHandler) errorHandler(error as Error, requestId);
            stream.respond({ ':status': 500 });
            stream.end('Internal Server Error');
          } finally {
            activeStreams--;
          }
        };

        if (config!.key && config!.cert) {
          // Secure HTTP/2
          server = http2.createSecureServer({
            key: config!.key,
            cert: config!.cert,
            allowHTTP1: config!.allowHTTP1 || false,
          });
        } else {
          // Plain HTTP/2
          server = http2.createServer();
        }

        server!.on('stream', handleStream);

        server!.on('error', (error) => {
          if (errorHandler) errorHandler(error);
          if (!isRunning) resolve(err(error));
        });

        server!.listen(config!.port, config!.host || '0.0.0.0', () => {
          isRunning = true;
          resolve(ok(undefined));
        });
      });
    },

    async stop(): Promise<Result<void, Error>> {
      if (!server) return ok(undefined);
      return new Promise((resolve) => {
        server!.close((error) => {
          isRunning = false;
          server = null;
          resolve(error ? err(error as Error) : ok(undefined));
        });
      });
    },

    async destroy(): Promise<Result<void, Error>> {
      const result = await this.stop();
      config = null;
      requestHandler = null;
      errorHandler = null;
      return result;
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(isRunning && server !== null);
    },

    onRequest(handler: RequestHandler): void {
      requestHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    async getActiveStreams(): Promise<Result<number, Error>> {
      return ok(activeStreams);
    },
  };
}
