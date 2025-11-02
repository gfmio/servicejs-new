/**
 * REST API client example
 *
 * This example demonstrates:
 * - Creating a type-safe API client class
 * - CRUD operations (Create, Read, Update, Delete)
 * - Query parameters
 */

import { createHTTPAdapter, type HTTPAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

interface User {
  id: number;
  name: string;
  email: string;
  username?: string;
}

class APIClient {
  private adapter: HTTPAdapter;

  constructor() {
    this.adapter = createHTTPAdapter();
  }

  async init(baseURL: string, apiKey?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    await this.adapter.init({
      baseURL,
      headers,
      timeout: 10000,
      retries: 2
    });
  }

  async getUser(id: number): Promise<User> {
    const result = await this.adapter.get<User>(`/users/${id}`);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const result = await this.adapter.post<User>('/users', user);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const result = await this.adapter.patch<User>(`/users/${id}`, updates);
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }

  async deleteUser(id: number): Promise<void> {
    const result = await this.adapter.delete(`/users/${id}`);
    if (!isOk(result)) throw result.error;
  }

  async listUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const result = await this.adapter.get<User[]>('/users', {
      params: {
        _page: page.toString(),
        _limit: limit.toString()
      }
    });
    if (!isOk(result)) throw result.error;
    return result.value.data;
  }
}

async function main() {
  const client = new APIClient();
  await client.init('https://jsonplaceholder.typicode.com');

  try {
    // Get a user
    console.log('Fetching user 1...');
    const user = await client.getUser(1);
    console.log('User:', user);

    // List users
    console.log('\nListing users (page 1, limit 5)...');
    const users = await client.listUsers(1, 5);
    console.log(`Found ${users.length} users`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email})`));

    // Create a user
    console.log('\nCreating new user...');
    const newUser = await client.createUser({
      name: 'Alice Smith',
      email: 'alice@example.com',
      username: 'alice'
    });
    console.log('Created user:', newUser);

    // Update a user
    console.log('\nUpdating user...');
    const updated = await client.updateUser(1, {
      name: 'Updated Name'
    });
    console.log('Updated user:', updated);

  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
