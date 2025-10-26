/**
 * Lifecycle Example
 *
 * Demonstrates component lifecycle with initialization and shutdown hooks.
 */

import { createComponent } from '@servicejs/core';
import { withLifecycle } from '../src/lifecycle.js';

// Simulate a database connection
interface Database {
  connected: boolean;
  queries: number;
}

const db: Database = {
  connected: false,
  queries: 0,
};

async function connectDatabase(): Promise<void> {
  console.log('Connecting to database...');
  await new Promise((resolve) => setTimeout(resolve, 100));
  db.connected = true;
  console.log('Database connected!');
}

async function disconnectDatabase(): Promise<void> {
  console.log('Disconnecting from database...');
  await new Promise((resolve) => setTimeout(resolve, 50));
  db.connected = false;
  console.log('Database disconnected!');
}

// Messages
type DatabaseMessage =
  | { readonly type: 'query'; readonly sql: string }
  | { readonly type: 'status' };

// State
interface DatabaseState {
  readonly queryCount: number;
}

// Create database component
const { component, capability } = createComponent<DatabaseState, DatabaseMessage>(
  'urn:example:database',
  { queryCount: 0 },
  (state, message) => {
    switch (message.type) {
      case 'query':
        if (db.connected) {
          console.log(`Executing query: ${message.sql}`);
          db.queries++;
          return {
            state: { queryCount: state.queryCount + 1 },
            reducer: (s, m) => ({ state: s, effects: [] }),
            effects: [],
          };
        } else {
          console.log('Cannot execute query: database not connected');
          return {
            state,
            reducer: (s, m) => ({ state: s, effects: [] }),
            effects: [],
          };
        }

      case 'status':
        console.log(`Database status: connected=${db.connected}, queries=${state.queryCount}`);
        return {
          state,
          reducer: (s, m) => ({ state: s, effects: [] }),
          effects: [],
        };
    }
  }
);

// Wrap with lifecycle hooks
const managed = withLifecycle(component, capability, {
  onInit: async () => {
    await connectDatabase();
  },
  onShutdown: async () => {
    await disconnectDatabase();
  },
});

// Example 1: Basic lifecycle
console.log('\n=== Example 1: Basic Lifecycle ===\n');

const initResult = await managed.init();
if (initResult.isOk()) {
  console.log('Component initialized successfully');
  console.log(`Initialized: ${managed.isInitialized()}`);
}

// Use the component
capability.send({ type: 'query', sql: 'SELECT * FROM users' });
capability.send({ type: 'query', sql: 'SELECT * FROM posts' });
capability.send({ type: 'status' });

await new Promise((resolve) => setTimeout(resolve, 50));

const shutdownResult = await managed.shutdown();
if (shutdownResult.isOk()) {
  console.log('Component shutdown successfully');
  console.log(`Shutdown: ${managed.isShutdown()}`);
}

// Example 2: Error handling
console.log('\n=== Example 2: Error Handling ===\n');

const { component: c2, capability: cap2 } = createComponent<DatabaseState, DatabaseMessage>(
  'urn:example:database-error',
  { queryCount: 0 },
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const managedWithError = withLifecycle(c2, cap2, {
  onInit: async () => {
    console.log('Attempting to connect...');
    throw new Error('Connection refused');
  },
});

const errorResult = await managedWithError.init();
if (errorResult.isErr()) {
  console.log(`Init failed: ${errorResult.error.type}`);
  console.log(`Still initialized: ${managedWithError.isInitialized()}`);
}

// Example 3: Double initialization prevention
console.log('\n=== Example 3: Double Initialization Prevention ===\n');

const { component: c3, capability: cap3 } = createComponent<DatabaseState, DatabaseMessage>(
  'urn:example:database-double',
  { queryCount: 0 },
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const managed3 = withLifecycle(c3, cap3);

await managed3.init();
console.log('First init succeeded');

const doubleInitResult = await managed3.init();
if (doubleInitResult.isErr()) {
  console.log(`Second init failed: ${doubleInitResult.error.type}`);
}

await managed3.shutdown();

// Example 4: Shutdown without initialization
console.log('\n=== Example 4: Shutdown Without Init (no hooks) ===\n');

const { component: c4, capability: cap4 } = createComponent<DatabaseState, DatabaseMessage>(
  'urn:example:database-no-init',
  { queryCount: 0 },
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

const managed4 = withLifecycle(c4, cap4);
const shutdownWithoutInit = await managed4.shutdown();

if (shutdownWithoutInit.isOk()) {
  console.log('Shutdown without init succeeded (no hooks present)');
}

// Example 5: Complete lifecycle with both hooks
console.log('\n=== Example 5: Complete Lifecycle ===\n');

const { component: c5, capability: cap5 } = createComponent<DatabaseState, DatabaseMessage>(
  'urn:example:database-complete',
  { queryCount: 0 },
  (state) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

let initTime: number = 0;
let shutdownTime: number = 0;

const managed5 = withLifecycle(c5, cap5, {
  onInit: async () => {
    initTime = Date.now();
    console.log('Component initializing...');
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log('Component initialized');
  },
  onShutdown: async () => {
    shutdownTime = Date.now();
    console.log('Component shutting down...');
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log('Component shutdown complete');
  },
});

await managed5.init();
console.log(`Uptime: 0ms`);

await new Promise((resolve) => setTimeout(resolve, 100));

await managed5.shutdown();
console.log(`Total uptime: ${shutdownTime - initTime}ms`);
