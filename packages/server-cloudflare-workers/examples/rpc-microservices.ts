/**
 * Example: RPC Microservices
 *
 * This example shows how to build type-safe microservices
 * using Workers RPC with service bindings.
 */

import { createRPCService, createRPCClient, createFetchHandler } from '../src';
import { isOk } from '@servicejs/result';

// ============================================================================
// User Service (Microservice 1)
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserService {
  getUser(id: string): Promise<User | null>;
  createUser(name: string, email: string): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  listUsers(): Promise<User[]>;
}

// In-memory store (in production, use D1/KV)
const users = new Map<string, User>();

const userService: UserService = {
  async getUser(id: string) {
    return users.get(id) || null;
  },

  async createUser(name: string, email: string) {
    const user: User = {
      id: crypto.randomUUID(),
      name,
      email,
    };
    users.set(user.id, user);
    return user;
  },

  async updateUser(id: string, updates: Partial<User>) {
    const user = users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates };
    users.set(id, updated);
    return updated;
  },

  async deleteUser(id: string) {
    return users.delete(id);
  },

  async listUsers() {
    return Array.from(users.values());
  },
};

const userRPC = createRPCService(userService);

// Export User Service Worker
export const UserServiceWorker = {
  fetch: (request: Request, env: unknown, ctx: ExecutionContext) =>
    userRPC.handleRPC(request, env, ctx),
};

// ============================================================================
// Order Service (Microservice 2)
// ============================================================================

interface Order {
  id: string;
  userId: string;
  items: string[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

interface OrderService {
  createOrder(userId: string, items: string[], total: number): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  updateOrderStatus(id: string, status: Order['status']): Promise<Order | null>;
  getUserOrders(userId: string): Promise<Order[]>;
}

const orders = new Map<string, Order>();

const orderService: OrderService = {
  async createOrder(userId: string, items: string[], total: number) {
    const order: Order = {
      id: crypto.randomUUID(),
      userId,
      items,
      total,
      status: 'pending',
    };
    orders.set(order.id, order);
    return order;
  },

  async getOrder(id: string) {
    return orders.get(id) || null;
  },

  async updateOrderStatus(id: string, status: Order['status']) {
    const order = orders.get(id);
    if (!order) return null;

    order.status = status;
    orders.set(id, order);
    return order;
  },

  async getUserOrders(userId: string) {
    return Array.from(orders.values()).filter((o) => o.userId === userId);
  },
};

const orderRPC = createRPCService(orderService);

export const OrderServiceWorker = {
  fetch: (request: Request, env: unknown, ctx: ExecutionContext) =>
    orderRPC.handleRPC(request, env, ctx),
};

// ============================================================================
// API Gateway (Main Worker)
// ============================================================================

interface Env {
  USER_SERVICE: Fetcher;
  ORDER_SERVICE: Fetcher;
}

const gateway = createFetchHandler<Env>();

gateway.onFetch(async (request, env, ctx) => {
  const url = new URL(request.url);

  // Initialize RPC clients
  const userClient = createRPCClient<UserService>(env.USER_SERVICE);
  const orderClient = createRPCClient<OrderService>(env.ORDER_SERVICE);

  // ========== User Endpoints ==========

  // GET /api/users - List all users
  if (url.pathname === '/api/users' && request.method === 'GET') {
    const result = await userClient.call('listUsers');

    if (isOk(result)) {
      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: result.error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // GET /api/users/:id - Get user
  if (url.pathname.match(/^\/api\/users\/[^/]+$/) && request.method === 'GET') {
    const userId = url.pathname.split('/').pop()!;
    const result = await userClient.call('getUser', userId);

    if (isOk(result)) {
      if (!result.value) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: result.error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // POST /api/users - Create user
  if (url.pathname === '/api/users' && request.method === 'POST') {
    const body = JSON.parse(request.body as string);
    const { name, email } = body;

    const result = await userClient.call('createUser', name, email);

    if (isOk(result)) {
      return {
        statusCode: 201,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: result.error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // ========== Order Endpoints ==========

  // POST /api/orders - Create order
  if (url.pathname === '/api/orders' && request.method === 'POST') {
    const body = JSON.parse(request.body as string);
    const { userId, items, total } = body;

    // Verify user exists
    const userResult = await userClient.call('getUser', userId);
    if (isOk(userResult) && !userResult.value) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Create order
    const orderResult = await orderClient.call('createOrder', userId, items, total);

    if (isOk(orderResult)) {
      return {
        statusCode: 201,
        body: JSON.stringify(orderResult.value),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: orderResult.error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  // GET /api/users/:id/orders - Get user's orders
  if (url.pathname.match(/^\/api\/users\/[^/]+\/orders$/) && request.method === 'GET') {
    const userId = url.pathname.split('/')[3];

    const result = await orderClient.call('getUserOrders', userId);

    if (isOk(result)) {
      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: result.error.message }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
    headers: { 'Content-Type': 'application/json' },
  };
});

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
    gateway.handleFetch(request, env, ctx),
};

/* wrangler.toml configuration:

name = "api-gateway"

[[services]]
binding = "USER_SERVICE"
service = "user-service"

[[services]]
binding = "ORDER_SERVICE"
service = "order-service"

*/
