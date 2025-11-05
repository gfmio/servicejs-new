/**
 * Node.js HTTP Server Adapter for ServiceJS
 *
 * Provides HTTP server functionality with request/response handling as messages
 */

import * as http from 'http';
import { Result, ok, err } from '@servicejs/result';

export interface HTTPServerConfig {
  host?: string;
  port: number;
  keepAliveTimeout?: number;
  headersTimeout?: number;
  requestTimeout?: number;
  maxHeaderSize?: number;
}

export interface HTTPRequest {
  id: string;
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  query: Record<string, string | string[]>;
  params: Record<string, string>;
}

export interface HTTPResponse {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body: string | Buffer;
}

export type RequestHandler = (request: HTTPRequest) => HTTPResponse | Promise<HTTPResponse>;
export type ErrorHandler = (error: Error, requestId?: string) => void;

export interface HTTPServerAdapter {
  init(config: HTTPServerConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  onRequest(handler: RequestHandler): void;
  onError(handler: ErrorHandler): void;

  getActiveRequests(): Promise<Result<number, Error>>;
}

export function createHTTPServer(): HTTPServerAdapter {
  let config: HTTPServerConfig | null = null;
  let server: http.Server | null = null;
  let isRunning = false;

  let requestIdCounter = 0;
  let activeRequests = 0;

  let requestHandler: RequestHandler | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg: HTTPServerConfig): Promise<Result<void, Error>> {
      if (!cfg.port) {
        return err(new Error('Port is required'));
      }
      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Server not initialized'));
      }
      if (server) {
        return err(new Error('Server already started'));
      }

      return new Promise((resolve) => {
        server = http.createServer(async (req, res) => {
          const requestId = `req_${++requestIdCounter}`;
          activeRequests++;

          try {
            // Parse URL and query string
            const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
            const query: Record<string, string | string[]> = {};

            url.searchParams.forEach((value, key) => {
              const existing = query[key];
              if (existing) {
                query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
              } else {
                query[key] = value;
              }
            });

            // Read body
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const body = Buffer.concat(chunks);

            // Create request object
            const httpRequest: HTTPRequest = {
              id: requestId,
              method: req.method || 'GET',
              url: url.pathname,
              headers: req.headers,
              body,
              query,
              params: {},
            };

            // Call handler
            if (requestHandler) {
              try {
                const response = await Promise.resolve(requestHandler(httpRequest));

                // Set headers
                if (response.headers) {
                  Object.entries(response.headers).forEach(([key, value]) => {
                    res.setHeader(key, value);
                  });
                }

                // Send response
                res.statusCode = response.statusCode;
                res.end(response.body);
              } catch (error) {
                if (errorHandler) errorHandler(error as Error, requestId);

                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            } else {
              res.statusCode = 404;
              res.end('Not Found');
            }
          } catch (error) {
            if (errorHandler) errorHandler(error as Error, requestId);

            res.statusCode = 500;
            res.end('Internal Server Error');
          } finally {
            activeRequests--;
          }
        });

        // Set timeouts
        if (config!.keepAliveTimeout !== undefined) {
          server!.keepAliveTimeout = config!.keepAliveTimeout;
        }
        if (config!.headersTimeout !== undefined) {
          server!.headersTimeout = config!.headersTimeout;
        }
        if (config!.requestTimeout !== undefined) {
          server!.requestTimeout = config!.requestTimeout;
        }
        if (config!.maxHeaderSize !== undefined) {
          server!.maxHeaderSize = config!.maxHeaderSize;
        }

        server!.on('error', (error) => {
          if (errorHandler) errorHandler(error);
          if (!isRunning) {
            resolve(err(error));
          }
        });

        server!.listen(config!.port, config!.host || '0.0.0.0', () => {
          isRunning = true;
          resolve(ok(undefined));
        });
      });
    },

    async stop(): Promise<Result<void, Error>> {
      if (!server) {
        return ok(undefined);
      }

      return new Promise((resolve) => {
        server!.close((error) => {
          isRunning = false;
          server = null;
          if (error) {
            resolve(err(error));
          } else {
            resolve(ok(undefined));
          }
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

    async getActiveRequests(): Promise<Result<number, Error>> {
      return ok(activeRequests);
    },
  };
}
