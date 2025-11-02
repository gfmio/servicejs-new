/**
 * OpenAI Adapter
 *
 * Provides access to OpenAI's GPT models, embeddings, and other AI capabilities.
 * This is a mock implementation for demo/testing purposes.
 * In production, replace with actual OpenAI API calls.
 */

import { Result, ok, err, isOk } from '@servicejs/result';
import { EventEmitter } from 'events';

/**
 * Configuration for OpenAI adapter
 */
export interface OpenAIConfig {
  /**
   * OpenAI API key
   */
  apiKey: string;

  /**
   * Organization ID (optional)
   */
  organization?: string;

  /**
   * Base URL for API requests (optional, for custom endpoints)
   */
  baseURL?: string;

  /**
   * Default model for chat completions
   */
  defaultModel?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Message role in chat completion
 */
export type OpenAIRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * Chat message
 */
export interface OpenAIMessage {
  role: OpenAIRole;
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Function definition for function calling
 */
export interface OpenAIFunction {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Chat completion request options
 */
export interface OpenAIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  user?: string;
  functions?: OpenAIFunction[];
  functionCall?: 'auto' | 'none' | { name: string };
  stream?: boolean;
}

/**
 * Token usage information
 */
export interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Chat completion choice
 */
export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

/**
 * Chat completion response
 */
export interface OpenAIChatCompletion {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

/**
 * Stream chunk delta
 */
export interface OpenAIDelta {
  role?: OpenAIRole;
  content?: string;
  function_call?: {
    name?: string;
    arguments?: string;
  };
}

/**
 * Stream chunk choice
 */
export interface OpenAIStreamChoice {
  index: number;
  delta: OpenAIDelta;
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

/**
 * Stream chunk
 */
export interface OpenAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: OpenAIStreamChoice[];
}

/**
 * Embedding vector
 */
export interface OpenAIEmbedding {
  object: 'embedding';
  embedding: number[];
  index: number;
}

/**
 * Embedding response
 */
export interface OpenAIEmbeddingResponse {
  object: 'list';
  data: OpenAIEmbedding[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Model information
 */
export interface OpenAIModel {
  id: string;
  object: 'model';
  created: number;
  ownedBy: string;
}

/**
 * Stream event emitter
 */
export interface OpenAIStream extends EventEmitter {
  on(event: 'data', listener: (chunk: OpenAIStreamChunk) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  cancel(): void;
}

/**
 * OpenAI adapter interface
 */
export interface OpenAIAdapter {
  /**
   * Initialize the adapter
   */
  init(config: OpenAIConfig): Promise<Result<void, Error>>;

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
   * Create a chat completion
   */
  createChatCompletion(
    messages: OpenAIMessage[],
    options?: OpenAIChatOptions
  ): Promise<Result<OpenAIChatCompletion, Error>>;

  /**
   * Create a streaming chat completion
   */
  createChatCompletionStream(
    messages: OpenAIMessage[],
    options?: OpenAIChatOptions
  ): Promise<Result<OpenAIStream, Error>>;

  /**
   * Create embeddings for input text
   */
  createEmbedding(
    input: string | string[],
    model?: string
  ): Promise<Result<OpenAIEmbeddingResponse, Error>>;

  /**
   * List available models
   */
  listModels(): Promise<Result<OpenAIModel[], Error>>;

  /**
   * Get a specific model
   */
  getModel(modelId: string): Promise<Result<OpenAIModel, Error>>;
}

/**
 * Create an OpenAI adapter
 *
 * This is a mock implementation for demo/testing purposes.
 * In production, replace with actual OpenAI API integration.
 */
export const createOpenAIAdapter = (): OpenAIAdapter => {
  let config: OpenAIConfig | null = null;
  let isStarted = false;
  const completions: OpenAIChatCompletion[] = [];
  const embeddings: OpenAIEmbeddingResponse[] = [];

  const adapter: OpenAIAdapter = {
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
        completions.length = 0;
        embeddings.length = 0;
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

    createChatCompletion: async (messages, options = {}) => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock implementation - in production, call OpenAI API
        const model = options.model || config.defaultModel || 'gpt-4';
        const lastMessage = messages[messages.length - 1];

        const completion: OpenAIChatCompletion = {
          id: `chatcmpl-${crypto.randomUUID()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Mock response to: ${lastMessage.content.substring(0, 50)}...`,
              },
              finishReason: 'stop',
            },
          ],
          usage: {
            promptTokens: messages.reduce((sum, msg) => sum + msg.content.length / 4, 0),
            completionTokens: 20,
            totalTokens: messages.reduce((sum, msg) => sum + msg.content.length / 4, 0) + 20,
          },
        };

        completions.push(completion);
        return ok(completion);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createChatCompletionStream: async (messages, options = {}) => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock streaming implementation
        const model = options.model || config.defaultModel || 'gpt-4';
        const lastMessage = messages[messages.length - 1];
        const responseText = `Mock streaming response to: ${lastMessage.content.substring(0, 50)}...`;

        const emitter = new EventEmitter() as OpenAIStream;
        let cancelled = false;

        emitter.cancel = () => {
          cancelled = true;
        };

        // Simulate streaming chunks
        setTimeout(() => {
          const words = responseText.split(' ');
          let index = 0;

          const sendChunk = () => {
            if (cancelled || index >= words.length) {
              emitter.emit('end');
              return;
            }

            const chunk: OpenAIStreamChunk = {
              id: `chatcmpl-${crypto.randomUUID()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [
                {
                  index: 0,
                  delta: {
                    content: words[index] + ' ',
                  },
                  finishReason: index === words.length - 1 ? 'stop' : null,
                },
              ],
            };

            emitter.emit('data', chunk);
            index++;

            if (index < words.length) {
              setTimeout(sendChunk, 50);
            } else {
              emitter.emit('end');
            }
          };

          sendChunk();
        }, 100);

        return ok(emitter);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createEmbedding: async (input, model = 'text-embedding-ada-002') => {
      try {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        // Mock embedding implementation
        const inputs = Array.isArray(input) ? input : [input];

        const response: OpenAIEmbeddingResponse = {
          object: 'list',
          data: inputs.map((text, index) => ({
            object: 'embedding',
            // Mock 1536-dimensional embedding (actual ada-002 size)
            embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1),
            index,
          })),
          model,
          usage: {
            promptTokens: inputs.reduce((sum, text) => sum + text.length / 4, 0),
            totalTokens: inputs.reduce((sum, text) => sum + text.length / 4, 0),
          },
        };

        embeddings.push(response);
        return ok(response);
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
        const models: OpenAIModel[] = [
          {
            id: 'gpt-4',
            object: 'model',
            created: 1687882411,
            ownedBy: 'openai',
          },
          {
            id: 'gpt-4-turbo-preview',
            object: 'model',
            created: 1706037612,
            ownedBy: 'openai',
          },
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: 1677610602,
            ownedBy: 'openai',
          },
          {
            id: 'text-embedding-ada-002',
            object: 'model',
            created: 1671217299,
            ownedBy: 'openai',
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
