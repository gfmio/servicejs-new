/**
 * Node.js HTTPS Server Adapter for ServiceJS
 * HTTPS server with TLS certificate support
 */

import * as https from 'https';
import * as http from 'http';
import { Result, ok, err } from '@servicejs/result';

export interface HTTPSServerConfig {
  host?: string;
  port: number;
  key: string | Buffer;  // Private key
  cert: string | Buffer; // Certificate
  ca?: string | Buffer;  // Certificate authority
  passphrase?: string;   // Key passphrase
  keepAliveTimeout?: number;
  headersTimeout?: number;
  requestTimeout?: number;
}

export interface HTTPRequest {
  id: string;
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  query: Record<string, string | string[]>;
}

export interface HTTPResponse {
  statusCode: number;
  headers?: Record<string, string | string[]>;
  body: string | Buffer;
}

export type RequestHandler = (request: HTTPRequest) => HTTPResponse | Promise<HTTPResponse>;
export type ErrorHandler = (error: Error, requestId?: string) => void;

export interface HTTPSServerAdapter {
  init(config: HTTPSServerConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;
  onRequest(handler: RequestHandler): void;
  onError(handler: ErrorHandler): void;
  getActiveRequests(): Promise<Result<number, Error>>;
}

export function createHTTPSServer(): HTTPSServerAdapter {
  let config: HTTPSServerConfig | null = null;
  let server: https.Server | null = null;
  let isRunning = false;
  let requestIdCounter = 0;
  let activeRequests = 0;
  let requestHandler: RequestHandler | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg: HTTPSServerConfig): Promise<Result<void, Error>> {
      if (!cfg.port) return err(new Error('Port is required'));
      if (!cfg.key || !cfg.cert) return err(new Error('Key and certificate are required'));
      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) return err(new Error('Server not initialized'));
      if (server) return err(new Error('Server already started'));

      return new Promise((resolve) => {
        const options: https.ServerOptions = {
          key: config!.key,
          cert: config!.cert,
          ...(config!.ca && { ca: config!.ca }),
          ...(config!.passphrase && { passphrase: config!.passphrase }),
        };

        server = https.createServer(options, async (req, res) => {
          const requestId = `req_${++requestIdCounter}`;
          activeRequests++;

          try {
            const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
            const query: Record<string, string | string[]> = {};
            url.searchParams.forEach((value, key) => {
              const existing = query[key];
              query[key] = existing ? (Array.isArray(existing) ? [...existing, value] : [existing, value]) : value;
            });

            const chunks: Buffer[] = [];
            for await (const chunk of req) chunks.push(chunk);

            const httpRequest: HTTPRequest = {
              id: requestId,
              method: req.method || 'GET',
              url: url.pathname,
              headers: req.headers,
              body: Buffer.concat(chunks),
              query,
            };

            if (requestHandler) {
              try {
                const response = await Promise.resolve(requestHandler(httpRequest));
                if (response.headers) {
                  Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
                }
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

        if (config!.keepAliveTimeout) server!.keepAliveTimeout = config!.keepAliveTimeout;
        if (config!.headersTimeout) server!.headersTimeout = config!.headersTimeout;
        if (config!.requestTimeout) server!.requestTimeout = config!.requestTimeout;

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
          resolve(error ? err(error) : ok(undefined));
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
