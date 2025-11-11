/**
 * Example: Basic REST API with Hono adapter
 *
 * This example shows how to build a simple REST API using the Hono adapter
 * with ServiceJS patterns and Result types.
 */

import { createHonoAdapter, createServiceHandler, parsers, middleware } from '../src';
import { ok, err } from '@servicejs/result';

// ============================================================================
// Types
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface CreateUserInput {
  name: string;
  email: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
}

// ============================================================================
// In-memory database
// ============================================================================

const users = new Map<string, User>();

// Seed data
users.set('1', {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date('2024-01-01'),
});

users.set('2', {
  id: '2',
  name: 'Bob',
  email: 'bob@example.com',
  createdAt: new Date('2024-01-02'),
});

// ============================================================================
// Service Handlers
// ============================================================================

const listUsers = createServiceHandler(async () => {
  return Array.from(users.values());
});

const getUser = createServiceHandler(async (input: { id: string }) => {
  const user = users.get(input.id);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
});

const createUser = createServiceHandler(async (input: CreateUserInput) => {
  const id = crypto.randomUUID();
  const user: User = {
    id,
    name: input.name,
    email: input.email,
    createdAt: new Date(),
  };

  users.set(id, user);
  return user;
});

const updateUser = createServiceHandler(async (input: { id: string } & UpdateUserInput) => {
  const user = users.get(input.id);
  if (!user) {
    throw new Error('User not found');
  }

  const updated: User = {
    ...user,
    name: input.name ?? user.name,
    email: input.email ?? user.email,
  };

  users.set(input.id, updated);
  return updated;
});

const deleteUser = createServiceHandler(async (input: { id: string }) => {
  const deleted = users.delete(input.id);
  if (!deleted) {
    throw new Error('User not found');
  }
  return { id: input.id, deleted: true };
});

// ============================================================================
// App Setup
// ============================================================================

const app = createHonoAdapter({
  autoErrorResponse: true,
  errorStatusCode: 400,
  logging: true,
  errorFormatter: (error) => ({
    error: error.message,
    timestamp: new Date().toISOString(),
  }),
});

// Add global middleware
app.useGlobal(middleware.cors({
  origin: '*',
  credentials: false,
}));

app.useGlobal(middleware.requestId());
app.useGlobal(middleware.timing());

// ============================================================================
// Routes
// ============================================================================

// GET /users - List all users
app.addRoute({
  method: 'GET',
  path: '/users',
  handler: listUsers,
});

// GET /users/:id - Get user by ID
app.addRoute({
  method: 'GET',
  path: '/users/:id',
  handler: getUser,
  parseInput: parsers.params,
});

// POST /users - Create new user
app.addRoute({
  method: 'POST',
  path: '/users',
  handler: createUser,
  parseInput: parsers.json,
});

// PUT /users/:id - Update user
app.addRoute({
  method: 'PUT',
  path: '/users/:id',
  handler: updateUser,
  parseInput: parsers.bodyAndParams,
});

// DELETE /users/:id - Delete user
app.addRoute({
  method: 'DELETE',
  path: '/users/:id',
  handler: deleteUser,
  parseInput: parsers.params,
});

// Health check endpoint
app.addRoute({
  method: 'GET',
  path: '/health',
  handler: async () => ok({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime?.() || 0,
  }),
});

// ============================================================================
// Export
// ============================================================================

export default app.getApp();

// For Bun: bun run examples/basic-api.ts
if (import.meta.main) {
  await app.listen(3000);
}
