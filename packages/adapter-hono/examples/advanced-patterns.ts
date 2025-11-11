/**
 * Example: Advanced patterns with Hono adapter
 *
 * This example demonstrates advanced ServiceJS patterns including:
 * - Validation with Result types
 * - Custom middleware
 * - Error handling strategies
 * - Response formatting
 * - Authentication
 */

import { createHonoAdapter, parsers } from '../src';
import { ok, err, Result } from '@servicejs/result';
import type { MiddlewareHandler } from 'hono';

// ============================================================================
// Types
// ============================================================================

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface CreateProductInput {
  name: string;
  price: number;
  stock: number;
  category: string;
}

interface SearchQuery {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  limit?: string;
}

// ============================================================================
// Validation
// ============================================================================

function validateProduct(input: CreateProductInput): Result<CreateProductInput, Error> {
  if (!input.name || input.name.trim().length === 0) {
    return err(new Error('Product name is required'));
  }

  if (input.price <= 0) {
    return err(new Error('Price must be greater than 0'));
  }

  if (input.stock < 0) {
    return err(new Error('Stock cannot be negative'));
  }

  if (!input.category || input.category.trim().length === 0) {
    return err(new Error('Category is required'));
  }

  return ok(input);
}

// ============================================================================
// Database
// ============================================================================

const products = new Map<string, Product>();

// Seed data
const seedProducts: Product[] = [
  { id: '1', name: 'Laptop', price: 999, stock: 10, category: 'Electronics' },
  { id: '2', name: 'Mouse', price: 29, stock: 50, category: 'Electronics' },
  { id: '3', name: 'Desk', price: 299, stock: 5, category: 'Furniture' },
  { id: '4', name: 'Chair', price: 199, stock: 15, category: 'Furniture' },
  { id: '5', name: 'Monitor', price: 399, stock: 8, category: 'Electronics' },
];

seedProducts.forEach((p) => products.set(p.id, p));

// ============================================================================
// Custom Middleware
// ============================================================================

// API Key Authentication
const apiKeyAuth = (requiredKey: string): MiddlewareHandler => {
  return async (c, next) => {
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey || apiKey !== requiredKey) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  };
};

// Rate limiting (simple in-memory)
const rateLimit = (maxRequests: number, windowMs: number): MiddlewareHandler => {
  const requests = new Map<string, number[]>();

  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const now = Date.now();

    const userRequests = requests.get(ip) || [];
    const windowStart = now - windowMs;

    // Filter out old requests
    const recentRequests = userRequests.filter((time) => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      return c.json(
        {
          error: 'Too many requests',
          retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000),
        },
        429
      );
    }

    recentRequests.push(now);
    requests.set(ip, recentRequests);

    await next();
  };
};

// Request logging
const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`[${new Date().toISOString()}] ${method} ${path} ${status} - ${duration}ms`);
};

// ============================================================================
// App Setup
// ============================================================================

const app = createHonoAdapter({
  autoErrorResponse: true,
  errorStatusCode: 400,
  errorFormatter: (error) => ({
    error: error.message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
  }),
});

// Global middleware
app.useGlobal(requestLogger);
app.useGlobal(rateLimit(100, 60000)); // 100 requests per minute

// ============================================================================
// Public Routes
// ============================================================================

// GET /products - Search/filter products
app.addRoute({
  method: 'GET',
  path: '/products',
  handler: async (query: SearchQuery) => {
    let filtered = Array.from(products.values());

    // Filter by search query
    if (query.q) {
      const searchLower = query.q.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (query.category) {
      filtered = filtered.filter((p) => p.category === query.category);
    }

    // Filter by price range
    if (query.minPrice) {
      const min = parseFloat(query.minPrice);
      filtered = filtered.filter((p) => p.price >= min);
    }

    if (query.maxPrice) {
      const max = parseFloat(query.maxPrice);
      filtered = filtered.filter((p) => p.price <= max);
    }

    // Limit results
    const limit = query.limit ? parseInt(query.limit) : 50;
    filtered = filtered.slice(0, limit);

    return ok({
      products: filtered,
      total: filtered.length,
      query,
    });
  },
  parseInput: parsers.query,
});

// GET /products/:id - Get product by ID
app.addRoute({
  method: 'GET',
  path: '/products/:id',
  handler: async (input: { id: string }) => {
    const product = products.get(input.id);
    if (!product) {
      return err(new Error('Product not found'));
    }
    return ok(product);
  },
  parseInput: parsers.params,
});

// ============================================================================
// Protected Routes (require API key)
// ============================================================================

// POST /products - Create new product (protected)
app.use('/products', apiKeyAuth('secret-api-key-12345'));

app.addRoute({
  method: 'POST',
  path: '/products',
  handler: async (input: CreateProductInput) => {
    // Validate input
    const validation = validateProduct(input);
    if (!validation.ok) {
      return err(validation.error);
    }

    const id = crypto.randomUUID();
    const product: Product = { id, ...input };

    products.set(id, product);

    return ok(product);
  },
  parseInput: parsers.json,
});

// PUT /products/:id - Update product (protected)
app.addRoute({
  method: 'PUT',
  path: '/products/:id',
  handler: async (input: { id: string } & Partial<CreateProductInput>) => {
    const product = products.get(input.id);
    if (!product) {
      return err(new Error('Product not found'));
    }

    const updated: Product = {
      ...product,
      name: input.name ?? product.name,
      price: input.price ?? product.price,
      stock: input.stock ?? product.stock,
      category: input.category ?? product.category,
    };

    // Validate updated product
    const validation = validateProduct({
      name: updated.name,
      price: updated.price,
      stock: updated.stock,
      category: updated.category,
    });

    if (!validation.ok) {
      return err(validation.error);
    }

    products.set(input.id, updated);

    return ok(updated);
  },
  parseInput: parsers.bodyAndParams,
});

// DELETE /products/:id - Delete product (protected)
app.addRoute({
  method: 'DELETE',
  path: '/products/:id',
  handler: async (input: { id: string }) => {
    const deleted = products.delete(input.id);
    if (!deleted) {
      return err(new Error('Product not found'));
    }
    return ok({ id: input.id, deleted: true });
  },
  parseInput: parsers.params,
});

// ============================================================================
// Analytics Routes (protected)
// ============================================================================

app.addRoute({
  method: 'GET',
  path: '/analytics/summary',
  handler: async () => {
    const allProducts = Array.from(products.values());

    const summary = {
      totalProducts: allProducts.length,
      totalValue: allProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
      averagePrice: allProducts.reduce((sum, p) => sum + p.price, 0) / allProducts.length,
      totalStock: allProducts.reduce((sum, p) => sum + p.stock, 0),
      categories: Array.from(
        new Set(allProducts.map((p) => p.category))
      ).map((category) => {
        const categoryProducts = allProducts.filter((p) => p.category === category);
        return {
          name: category,
          products: categoryProducts.length,
          totalValue: categoryProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
        };
      }),
    };

    return ok(summary);
  },
});

// ============================================================================
// Health & Status
// ============================================================================

app.addRoute({
  method: 'GET',
  path: '/health',
  handler: async () =>
    ok({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      products: products.size,
    }),
});

// ============================================================================
// Export
// ============================================================================

export default app.getApp();

// For Bun: bun run examples/advanced-patterns.ts
if (import.meta.main) {
  console.log('Starting server with API key authentication...');
  console.log('API Key: secret-api-key-12345');
  console.log('');
  console.log('Public endpoints:');
  console.log('  GET  /products');
  console.log('  GET  /products/:id');
  console.log('  GET  /health');
  console.log('');
  console.log('Protected endpoints (require X-API-Key header):');
  console.log('  POST   /products');
  console.log('  PUT    /products/:id');
  console.log('  DELETE /products/:id');
  console.log('  GET    /analytics/summary');
  console.log('');

  await app.listen(3000);
}
