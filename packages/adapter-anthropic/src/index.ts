/**
 * Anthropic Adapter
 *
 * Provides access to Anthropic's Claude models via the Messages API.
 * This is a mock implementation for demo/testing purposes.
 * In production, replace with actual Anthropic API calls.
 */

import { Result, ok, err, isOk } from '@servicejs/result';
import { EventEmitter } from 'events';

/**
 * Configuration for Anthropic adapter
 */
export interface AnthropicConfig {
  /**
   * Anthropic API key
   */
  apiKey: string;

  /**
   * Base URL for API requests (optional)
   */
  baseURL?: string;

  /**
   * Default model
   */
  defaultModel?: string;

  /**
   * Default max tokens
   */
  defaultMaxTokens?: number;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Message role in conversation
 */
export type AnthropicRole = 'user' | 'assistant';

/**
 * Content block types
 */
export type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

/**
 * Message in conversation
 */
export interface AnthropicMessage {
  role: AnthropicRole;
  content: string | AnthropicContentBlock[];
}

/**
 * Message creation options
 */
export interface AnthropicMessageOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
  system?: string;
  metadata?: {
    userId?: string;
  };
}

/**
 * Token usage information
 */
export interface AnthropicUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Message response
 */
export interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stopSequence: string | null;
  usage: AnthropicUsage;
}

/**
 * Stream event types
 */
export type AnthropicStreamEvent =
  | { type: 'message_start'; message: Partial<AnthropicMessageResponse> }
  | { type: 'content_block_start'; index: number; content_block: AnthropicContentBlock }
  | { type: 'content_block_delta'; index: number; delta: { type: 'text_delta'; text: string } }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stop_reason: string; stop_sequence: string | null }; usage: AnthropicUsage }
  | { type: 'message_stop' };

/**
 * Stream event emitter
 */
export interface AnthropicStream extends EventEmitter {
  on(event: 'data', listener: (event: AnthropicStreamEvent) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  cancel(): void;
}

/**
 * Model information
 */
export interface AnthropicModel {
  id: string;
  displayName: string;
  maxTokens: number;
  created: number;
}

/**
 * Anthropic adapter interface
 */
export interface AnthropicAdapter {
  /**
   * Initialize the adapter
   */
  init(config: AnthropicConfig): Promise<Result<void, Error>>;

  /**
   * Start the adapter (optional lifecycle)
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the adapter (optional lifecycle)
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Destroy the adapter and clean up resources
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Health check
   */
  health(): Promise<Result<boolean, Error>>;

  /**
   * Create a message completion
   */
  createMessage(
    messages: AnthropicMessage[],
    options?: AnthropicMessageOptions
  ): Promise<Result<AnthropicMessageResponse, Error>>;

  /**
   * Create a streaming message completion
   */
  createMessageStream(
    messages: AnthropicMessage[],
    options?: AnthropicMessageOptions
  ): Promise<Result<AnthropicStream, Error>>;

  /**
   * List available models
   */
  listModels(): Promise<Result<AnthropicModel[], Error>>;

  /**
   * Get a specific model
   */
  getModel(modelId: string): Promise<Result<AnthropicModel, Error>>;
}

/**
 * Create an Anthropic adapter
 *
 * This is a mock implementation for demo/testing purposes.
 * In production, replace with actual Anthropic API integration.
 */
export const createAnthropicAdapter = (): AnthropicAdapter => {
  let config: AnthropicConfig | null = null;
  let isStarted = false;
  const messages: AnthropicMessageResponse[] = [];

  const adapter: AnthropicAdapter = {
    init: async (cfg) => {
      try {
        config = cfg;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async () => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }
        isStarted = true;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    stop: async () => {
      try {
        isStarted = false;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    destroy: async () => {
      try {
        config = null;
        isStarted = false;
        messages.length = 0;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    health: async () => {
      try {
        return ok(config !== null && isStarted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createMessage: async (msgs, options = {}) => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock implementation - in production, call Anthropic API
        const model = options.model || config.defaultModel || 'claude-3-5-sonnet-20241022';
        const maxTokens = options.maxTokens || config.defaultMaxTokens || 1024;

        const lastMessage = msgs[msgs.length - 1];
        const lastContent =
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : lastMessage.content
                .filter((c) => c.type === 'text')
                .map((c) => (c as any).text)
                .join(' ');

        const response: AnthropicMessageResponse = {
          id: `msg_${crypto.randomUUID()}`,
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: `Mock Claude response to: ${lastContent.substring(0, 50)}...`,
            },
          ],
          model,
          stopReason: 'end_turn',
          stopSequence: null,
          usage: {
            inputTokens: msgs.reduce((sum, msg) => {
              const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
              return sum + content.length / 4;
            }, 0),
            outputTokens: 25,
          },
        };

        messages.push(response);
        return ok(response);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createMessageStream: async (msgs, options = {}) => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock streaming implementation
        const model = options.model || config.defaultModel || 'claude-3-5-sonnet-20241022';

        const lastMessage = msgs[msgs.length - 1];
        const lastContent =
          typeof lastMessage.content === 'string'
            ? lastMessage.content
            : lastMessage.content
                .filter((c) => c.type === 'text')
                .map((c) => (c as any).text)
                .join(' ');

        const responseText = `Mock Claude streaming response to: ${lastContent.substring(0, 50)}...`;

        const emitter = new EventEmitter() as AnthropicStream;
        let cancelled = false;

        emitter.cancel = () => {
          cancelled = true;
        };

        // Simulate streaming events
        setTimeout(() => {
          // Message start event
          emitter.emit('data', {
            type: 'message_start',
            message: {
              id: `msg_${crypto.randomUUID()}`,
              type: 'message',
              role: 'assistant',
              model,
              usage: { inputTokens: 100, outputTokens: 0 },
            },
          });

          // Content block start
          emitter.emit('data', {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'text', text: '' },
          });

          // Stream text in chunks
          const words = responseText.split(' ');
          let index = 0;

          const sendDelta = () => {
            if (cancelled || index >= words.length) {
              // Content block stop
              emitter.emit('data', {
                type: 'content_block_stop',
                index: 0,
              });

              // Message delta with stop reason
              emitter.emit('data', {
                type: 'message_delta',
                delta: {
                  stop_reason: 'end_turn',
                  stop_sequence: null,
                },
                usage: { inputTokens: 0, outputTokens: 25 },
              });

              // Message stop
              emitter.emit('data', {
                type: 'message_stop',
              });

              emitter.emit('end');
              return;
            }

            // Content block delta
            emitter.emit('data', {
              type: 'content_block_delta',
              index: 0,
              delta: {
                type: 'text_delta',
                text: words[index] + ' ',
              },
            });

            index++;
            setTimeout(sendDelta, 50);
          };

          sendDelta();
        }, 100);

        return ok(emitter);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listModels: async () => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock model list
        const models: AnthropicModel[] = [
          {
            id: 'claude-3-5-sonnet-20241022',
            displayName: 'Claude 3.5 Sonnet',
            maxTokens: 8192,
            created: 1729555200,
          },
          {
            id: 'claude-3-opus-20240229',
            displayName: 'Claude 3 Opus',
            maxTokens: 4096,
            created: 1709251200,
          },
          {
            id: 'claude-3-sonnet-20240229',
            displayName: 'Claude 3 Sonnet',
            maxTokens: 4096,
            created: 1709251200,
          },
          {
            id: 'claude-3-haiku-20240307',
            displayName: 'Claude 3 Haiku',
            maxTokens: 4096,
            created: 1709769600,
          },
        ];

        return ok(models);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getModel: async (modelId) => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock model retrieval
        const modelsResult = await adapter.listModels();
        if (!isOk(modelsResult)) {
          return modelsResult;
        }

        const model = modelsResult.value.find((m) => m.id === modelId);
        if (!model) {
          return err(new Error(`Model not found: ${modelId}`));
        }

        return ok(model);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  return adapter;
};
