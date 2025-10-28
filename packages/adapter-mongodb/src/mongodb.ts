/**
 * MongoDB Database Adapter
 *
 * Document database with rich query capabilities, aggregation pipeline, and change streams
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import {
  MongoClient,
  type Db,
  type Collection,
  type Document,
  type Filter,
  type UpdateFilter,
  type ChangeStream,
  type ChangeStreamDocument,
} from 'mongodb';

export interface MongoDBConfig {
  /**
   * Connection URL
   * @example 'mongodb://localhost:27017'
   */
  url: string;

  /**
   * Database name
   */
  database: string;

  /**
   * Additional connection options
   */
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    connectTimeoutMS?: number;
  };
}

export interface DatabaseQuery {
  collection: string;
  filter?: Filter<Document>;
  projection?: Document;
  sort?: Document;
  limit?: number;
  skip?: number;
}

export interface DatabaseResult<TRow = unknown> {
  rows: TRow[];
  rowCount: number;
}

export interface DatabaseTransaction {
  id: string;
  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  commit(): Promise<Result<void, Error>>;
  rollback(): Promise<Result<void, Error>>;
}

export interface AggregationQuery {
  collection: string;
  pipeline: Document[];
}

export interface WatchOptions {
  fullDocument?: 'default' | 'updateLookup' | 'whenAvailable' | 'required';
  pipeline?: Document[];
}

export interface DatabaseAdapter {
  init(config: MongoDBConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  query<TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>>;
  begin(): Promise<Result<DatabaseTransaction, Error>>;

  // MongoDB-specific operations
  insertOne(collection: string, document: Document): Promise<Result<{ id: string }, Error>>;
  insertMany(collection: string, documents: Document[]): Promise<Result<{ ids: string[] }, Error>>;
  findOne<T = Document>(collection: string, filter: Filter<Document>): Promise<Result<T | null, Error>>;
  updateOne(
    collection: string,
    filter: Filter<Document>,
    update: UpdateFilter<Document>
  ): Promise<Result<{ modifiedCount: number }, Error>>;
  updateMany(
    collection: string,
    filter: Filter<Document>,
    update: UpdateFilter<Document>
  ): Promise<Result<{ modifiedCount: number }, Error>>;
  deleteOne(collection: string, filter: Filter<Document>): Promise<Result<{ deletedCount: number }, Error>>;
  deleteMany(collection: string, filter: Filter<Document>): Promise<Result<{ deletedCount: number }, Error>>;
  countDocuments(collection: string, filter?: Filter<Document>): Promise<Result<number, Error>>;

  // Aggregation
  aggregate<T = Document>(query: AggregationQuery): Promise<Result<T[], Error>>;

  // Change streams
  watch(
    collection: string,
    options?: WatchOptions
  ): Promise<Result<ChangeStream<Document, ChangeStreamDocument<Document>>, Error>>;
}

/**
 * Create a MongoDB database adapter
 *
 * @example
 * ```typescript
 * const db = createMongoDBAdapter();
 *
 * await db.init({
 *   url: 'mongodb://localhost:27017',
 *   database: 'mydb'
 * });
 * await db.start();
 *
 * // Insert document
 * await db.insertOne('users', { name: 'Alice', age: 30 });
 *
 * // Query documents
 * const result = await db.query({
 *   collection: 'users',
 *   filter: { age: { $gt: 25 } }
 * });
 *
 * // Aggregation pipeline
 * const stats = await db.aggregate({
 *   collection: 'users',
 *   pipeline: [
 *     { $match: { age: { $gt: 25 } } },
 *     { $group: { _id: null, avgAge: { $avg: '$age' } } }
 *   ]
 * });
 *
 * await db.stop();
 * await db.destroy();
 * ```
 */
export const createMongoDBAdapter = (): DatabaseAdapter => {
  let client: MongoClient | null = null;
  let db: Db | null = null;
  let transactionCounter = 0;

  const getCollection = (name: string): Collection<Document> => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    return db.collection(name);
  };

  return {
    init: async (config: MongoDBConfig): Promise<Result<void, Error>> => {
      try {
        client = new MongoClient(config.url, config.options);
        await client.connect();
        db = client.db(config.database);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client || !db) {
        return err(new Error('Database not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // MongoDB doesn't require explicit stop
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        await client.close();
        client = null;
        db = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client || !db) {
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }

      try {
        // Try a simple command to check health
        await db.admin().ping();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const collection = getCollection(query.collection);
        let cursor = collection.find(query.filter || {});

        if (query.projection) {
          cursor = cursor.project(query.projection);
        }
        if (query.sort) {
          cursor = cursor.sort(query.sort);
        }
        if (query.skip) {
          cursor = cursor.skip(query.skip);
        }
        if (query.limit) {
          cursor = cursor.limit(query.limit);
        }

        const rows = (await cursor.toArray()) as TRow[];
        const rowCount = rows.length;

        return ok({ rows, rowCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    begin: async (): Promise<Result<DatabaseTransaction, Error>> => {
      if (!client || !db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const session = client.startSession();
        const txId = `tx-${++transactionCounter}`;
        let committed = false;
        let rolledBack = false;

        // Start transaction
        session.startTransaction();

        const transaction: DatabaseTransaction = {
          id: txId,

          query: async <TRow = unknown>(query: DatabaseQuery): Promise<Result<DatabaseResult<TRow>, Error>> => {
            if (committed || rolledBack) {
              return err(new Error('Transaction already completed'));
            }

            try {
              const collection = getCollection(query.collection);
              let cursor = collection.find(query.filter || {}, { session });

              if (query.projection) {
                cursor = cursor.project(query.projection);
              }
              if (query.sort) {
                cursor = cursor.sort(query.sort);
              }
              if (query.skip) {
                cursor = cursor.skip(query.skip);
              }
              if (query.limit) {
                cursor = cursor.limit(query.limit);
              }

              const rows = (await cursor.toArray()) as TRow[];
              const rowCount = rows.length;

              return ok({ rows, rowCount });
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },

          commit: async (): Promise<Result<void, Error>> => {
            if (committed) {
              return err(new Error('Transaction already committed'));
            }
            if (rolledBack) {
              return err(new Error('Transaction already rolled back'));
            }

            try {
              await session.commitTransaction();
              session.endSession();
              committed = true;
              return ok(undefined);
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },

          rollback: async (): Promise<Result<void, Error>> => {
            if (committed) {
              return err(new Error('Transaction already committed'));
            }
            if (rolledBack) {
              return err(new Error('Transaction already rolled back'));
            }

            try {
              await session.abortTransaction();
              session.endSession();
              rolledBack = true;
              return ok(undefined);
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },
        };

        return ok(transaction);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    // MongoDB-specific methods

    insertOne: async (
      collection: string,
      document: Document
    ): Promise<Result<{ id: string }, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const result = await coll.insertOne(document);
        return ok({ id: result.insertedId.toString() });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    insertMany: async (
      collection: string,
      documents: Document[]
    ): Promise<Result<{ ids: string[] }, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const result = await coll.insertMany(documents);
        const ids = Object.values(result.insertedIds).map((id) => id.toString());
        return ok({ ids });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    findOne: async <T = Document>(
      collection: string,
      filter: Filter<Document>
    ): Promise<Result<T | null, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const document = (await coll.findOne(filter)) as T | null;
        return ok(document);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    updateOne: async (
      collection: string,
      filter: Filter<Document>,
      update: UpdateFilter<Document>
    ): Promise<Result<{ modifiedCount: number }, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const result = await coll.updateOne(filter, update);
        return ok({ modifiedCount: result.modifiedCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    updateMany: async (
      collection: string,
      filter: Filter<Document>,
      update: UpdateFilter<Document>
    ): Promise<Result<{ modifiedCount: number }, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const result = await coll.updateMany(filter, update);
        return ok({ modifiedCount: result.modifiedCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteOne: async (
      collection: string,
      filter: Filter<Document>
    ): Promise<Result<{ deletedCount: number }, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const result = await coll.deleteOne(filter);
        return ok({ deletedCount: result.deletedCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteMany: async (
      collection: string,
      filter: Filter<Document>
    ): Promise<Result<{ deletedCount: number }, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const result = await coll.deleteMany(filter);
        return ok({ deletedCount: result.deletedCount });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    countDocuments: async (
      collection: string,
      filter?: Filter<Document>
    ): Promise<Result<number, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const count = await coll.countDocuments(filter || {});
        return ok(count);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    aggregate: async <T = Document>(query: AggregationQuery): Promise<Result<T[], Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(query.collection);
        const cursor = coll.aggregate(query.pipeline);
        const results = (await cursor.toArray()) as T[];
        return ok(results);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    watch: async (
      collection: string,
      options?: WatchOptions
    ): Promise<Result<ChangeStream<Document, ChangeStreamDocument<Document>>, Error>> => {
      if (!db) {
        return err(new Error('Database not initialized'));
      }

      try {
        const coll = getCollection(collection);
        const watchOptions = options?.fullDocument !== undefined
          ? { fullDocument: options.fullDocument }
          : undefined;
        const changeStream = coll.watch(options?.pipeline, watchOptions);
        return ok(changeStream);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
