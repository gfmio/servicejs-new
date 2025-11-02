/**
 * Ollama Adapter - Local LLM server
 */

import { Result, ok, err } from '@servicejs/result';

export interface OllamaConfig {
  baseURL?: string;
  timeout?: number;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
}

export interface OllamaAdapter {
  init(config: OllamaConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  generate(model: string, prompt: string): Promise<Result<string, Error>>;
  chat(model: string, messages: OllamaMessage[]): Promise<Result<string, Error>>;
  embeddings(model: string, prompt: string): Promise<Result<number[], Error>>;

  listModels(): Promise<Result<OllamaModel[], Error>>;
  pullModel(name: string): Promise<Result<void, Error>>;
  showModel(name: string): Promise<Result<OllamaModel, Error>>;
}

export const createOllamaAdapter = (): OllamaAdapter => {
  let config: OllamaConfig | null = null;
  let isStarted = false;

  const adapter: OllamaAdapter = {
    init: async (cfg) => {
      try {
        config = { baseURL: 'http://localhost:11434', ...cfg };
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async () => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
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

    generate: async (model, prompt) => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
        return ok(`Mock ${model} response`);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    chat: async (model, messages) => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
        return ok(`Mock ${model} chat response`);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    embeddings: async (model, prompt) => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
        return ok(Array.from({ length: 384 }, () => Math.random() * 2 - 1));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listModels: async () => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
        return ok([
          { name: 'llama2', size: 3825819519, digest: 'sha256:mock' },
          { name: 'mistral', size: 4109865159, digest: 'sha256:mock2' },
        ]);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    pullModel: async (name) => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    showModel: async (name) => {
      try {
        if (!config) return err(new Error('Adapter not initialized'));
        return ok({ name, size: 3825819519, digest: 'sha256:mock' });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };

  return adapter;
};
