/**
 * CQRS Pattern Implementation
 *
 * Command Query Responsibility Segregation (CQRS) separates read and write operations.
 * Commands modify state, queries read state. This separation allows for:
 * - Independent scaling of reads and writes
 * - Optimized read models
 * - Event sourcing integration
 * - Clear separation of concerns
 */

import { type Result, err } from '@servicejs/result';

// ============================================================================
// Types
// ============================================================================

/**
 * A command that modifies state
 *
 * Commands represent intent to change state. They should:
 * - Have clear, action-oriented names (CreateUser, UpdateOrder, etc.)
 * - Contain all data needed for the operation
 * - Be validated before execution
 * - Return Result indicating success/failure
 */
export interface Command<TName extends string = string, TData = unknown> {
  readonly type: 'command';
  readonly name: TName;
  readonly data: TData;
  readonly metadata?: CommandMetadata;
}

/**
 * Command metadata for tracing and auditing
 */
export interface CommandMetadata {
  /** When the command was created */
  timestamp?: number;
  /** Who issued the command */
  userId?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * A query that reads state
 *
 * Queries should:
 * - Have clear, question-oriented names (GetUser, ListOrders, etc.)
 * - Not modify state
 * - Be optimized for read performance
 * - Return Result with data or error
 */
export interface Query<TName extends string = string, TParams = unknown> {
  readonly type: 'query';
  readonly name: TName;
  readonly params: TParams;
  readonly metadata?: QueryMetadata;
}

/**
 * Query metadata for tracing and caching
 */
export interface QueryMetadata {
  /** When the query was created */
  timestamp?: number;
  /** Who issued the query */
  userId?: string;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Cache key for query results */
  cacheKey?: string;
  /** Additional context */
  [key: string]: unknown;
}

/**
 * Command handler that executes commands
 */
export interface CommandHandler<TCommand extends Command, TResult = void> {
  /**
   * Handle a command
   * @param command - The command to handle
   * @returns Result indicating success/failure
   */
  handle(command: TCommand): Promise<Result<TResult, Error>>;
}

/**
 * Query handler that executes queries
 */
export interface QueryHandler<TQuery extends Query, TResult> {
  /**
   * Handle a query
   * @param query - The query to handle
   * @returns Result with query result or error
   */
  handle(query: TQuery): Promise<Result<TResult, Error>>;
}

/**
 * Command bus for dispatching commands to handlers
 */
export interface CommandBus {
  /**
   * Register a command handler
   */
  register<TCommand extends Command, TResult>(
    commandName: string,
    handler: CommandHandler<TCommand, TResult>
  ): void;

  /**
   * Dispatch a command to its handler
   */
  dispatch<TResult>(command: Command): Promise<Result<TResult, Error>>;
}

/**
 * Query bus for dispatching queries to handlers
 */
export interface QueryBus {
  /**
   * Register a query handler
   */
  register<TQuery extends Query, TResult>(
    queryName: string,
    handler: QueryHandler<TQuery, TResult>
  ): void;

  /**
   * Dispatch a query to its handler
   */
  dispatch<TResult>(query: Query): Promise<Result<TResult, Error>>;
}

// ============================================================================
// Command Bus Implementation
// ============================================================================

/**
 * Create a command bus
 *
 * @example
 * ```typescript
 * const commandBus = createCommandBus();
 *
 * // Register handler
 * commandBus.register('CreateUser', {
 *   handle: async (cmd) => {
 *     // Validate and execute command
 *     return ok(undefined);
 *   }
 * });
 *
 * // Dispatch command
 * const result = await commandBus.dispatch({
 *   type: 'command',
 *   name: 'CreateUser',
 *   data: { name: 'Alice', email: 'alice@example.com' }
 * });
 * ```
 */
export const createCommandBus = (): CommandBus => {
  const handlers = new Map<string, CommandHandler<Command, unknown>>();

  return {
    register<TCommand extends Command, TResult>(
      commandName: string,
      handler: CommandHandler<TCommand, TResult>
    ): void {
      if (handlers.has(commandName)) {
        throw new Error(`Command handler already registered for: ${commandName}`);
      }
      handlers.set(commandName, handler as CommandHandler<Command, unknown>);
    },

    async dispatch<TResult>(command: Command): Promise<Result<TResult, Error>> {
      const handler = handlers.get(command.name);

      if (!handler) {
        return err(new Error(`No handler registered for command: ${command.name}`));
      }

      try {
        const result = await handler.handle(command);
        return result as Result<TResult, Error>;
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};

// ============================================================================
// Query Bus Implementation
// ============================================================================

/**
 * Create a query bus
 *
 * @example
 * ```typescript
 * const queryBus = createQueryBus();
 *
 * // Register handler
 * queryBus.register('GetUser', {
 *   handle: async (query) => {
 *     const user = await database.findUser(query.params.id);
 *     return user ? ok(user) : err(new Error('User not found'));
 *   }
 * });
 *
 * // Dispatch query
 * const result = await queryBus.dispatch({
 *   type: 'query',
 *   name: 'GetUser',
 *   params: { id: '123' }
 * });
 * ```
 */
export const createQueryBus = (): QueryBus => {
  const handlers = new Map<string, QueryHandler<Query, unknown>>();

  return {
    register<TQuery extends Query, TResult>(
      queryName: string,
      handler: QueryHandler<TQuery, TResult>
    ): void {
      if (handlers.has(queryName)) {
        throw new Error(`Query handler already registered for: ${queryName}`);
      }
      handlers.set(queryName, handler as QueryHandler<Query, unknown>);
    },

    async dispatch<TResult>(query: Query): Promise<Result<TResult, Error>> {
      const handler = handlers.get(query.name);

      if (!handler) {
        return err(new Error(`No handler registered for query: ${query.name}`));
      }

      try {
        const result = await handler.handle(query);
        return result as Result<TResult, Error>;
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a command
 */
export const createCommand = <TName extends string, TData>(
  name: TName,
  data: TData,
  metadata?: CommandMetadata
): Command<TName, TData> => ({
  type: 'command',
  name,
  data,
  ...(metadata !== undefined ? { metadata } : {}),
});

/**
 * Create a query
 */
export const createQuery = <TName extends string, TParams>(
  name: TName,
  params: TParams,
  metadata?: QueryMetadata
): Query<TName, TParams> => ({
  type: 'query',
  name,
  params,
  ...(metadata !== undefined ? { metadata } : {}),
});

/**
 * Type guard to check if a message is a command
 */
export const isCommand = (msg: unknown): msg is Command => {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === 'command' &&
    'name' in msg
  );
};

/**
 * Type guard to check if a message is a query
 */
export const isQuery = (msg: unknown): msg is Query => {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === 'query' &&
    'name' in msg
  );
};
