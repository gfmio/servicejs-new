# @servicejs/adapter-supabase

Supabase adapter providing PostgreSQL database operations, authentication, real-time subscriptions, and file storage.

## Status

✅ **Implemented** - Production ready

## Features

- **PostgreSQL Database**: Full CRUD operations via Supabase's REST API
- **Authentication**: User signup, signin, session management
- **Real-time Subscriptions**: Listen to database changes in real-time
- **File Storage**: Upload, download, and manage files in Supabase Storage
- **RPC Support**: Call PostgreSQL functions directly
- **Lifecycle Management**: Standard init/start/stop/destroy pattern
- **Result Types**: All operations return Result<T, Error> for predictable error handling

## Installation

```bash
npm install @servicejs/adapter-supabase @supabase/supabase-js
```

## Quick Start

```typescript
import { createSupabaseAdapter } from '@servicejs/adapter-supabase';
import { isOk } from '@servicejs/result';

// Create and initialize adapter
const adapter = createSupabaseAdapter();

await adapter.init({
  url: 'https://your-project.supabase.co',
  key: 'your-anon-key',
});

await adapter.start();

// Query data
const result = await adapter.query({
  table: 'users',
  select: '*',
  filter: { active: true },
  limit: 10,
});

if (isOk(result)) {
  console.log('Users:', result.value);
}

// Cleanup
await adapter.stop();
```

## Database Operations

### Query (SELECT)

```typescript
const result = await adapter.query({
  table: 'posts',
  select: 'id, title, content, author:users(name)',
  filter: { published: true },
  order: { column: 'created_at', ascending: false },
  limit: 20,
  offset: 0,
});
```

### Insert

```typescript
const result = await adapter.insert({
  table: 'posts',
  data: {
    title: 'Hello World',
    content: 'My first post',
    author_id: 1,
  },
  returning: true, // Return inserted row
});
```

### Update

```typescript
const result = await adapter.update({
  table: 'posts',
  data: { published: true },
  filter: { id: 1 },
  returning: true,
});
```

### Delete

```typescript
const result = await adapter.delete({
  table: 'posts',
  filter: { id: 1 },
  returning: true,
});
```

### RPC (Stored Procedures)

```typescript
// Call a PostgreSQL function
const result = await adapter.rpc('get_popular_posts', {
  min_likes: 10,
  limit: 5,
});
```

## Authentication

### Sign Up

```typescript
const result = await adapter.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      name: 'John Doe',
      age: 30,
    },
  },
});

if (isOk(result)) {
  console.log('User:', result.value.user);
  console.log('Session:', result.value.session);
}
```

### Sign In

```typescript
const result = await adapter.signIn({
  email: 'user@example.com',
  password: 'securepassword',
});

if (isOk(result)) {
  console.log('Access token:', result.value.session?.access_token);
}
```

### Sign Out

```typescript
const result = await adapter.signOut();
```

### Get Current Session

```typescript
const result = await adapter.getSession();

if (isOk(result) && result.value) {
  console.log('Session expires:', result.value.expires_at);
}
```

### Get Current User

```typescript
const result = await adapter.getUser();

if (isOk(result) && result.value) {
  console.log('User email:', result.value.email);
  console.log('User metadata:', result.value.user_metadata);
}
```

### Listen to Auth State Changes

```typescript
const unsubscribe = adapter.onAuthStateChange((event, session) => {
  console.log('Auth event:', event); // SIGNED_IN, SIGNED_OUT, etc.
  console.log('Session:', session);
});

// Later, stop listening
unsubscribe();
```

## Real-time Subscriptions

### Subscribe to Table Changes

```typescript
// Subscribe to all changes
const channelResult = adapter.subscribe({
  channel: 'my-channel',
  table: 'messages',
  event: '*', // or 'INSERT', 'UPDATE', 'DELETE'
  callback: (payload) => {
    console.log('Event:', payload.eventType);
    console.log('New:', payload.new);
    console.log('Old:', payload.old);
  },
});

if (isOk(channelResult)) {
  const channel = channelResult.value;

  // Later, unsubscribe
  await adapter.unsubscribe(channel);
}
```

### Subscribe to Specific Events

```typescript
// Only listen to INSERTs
const channelResult = adapter.subscribe({
  channel: 'inserts-only',
  table: 'posts',
  event: 'INSERT',
  filter: 'author_id=eq.1', // Optional filter
  callback: (payload) => {
    console.log('New post:', payload.new);
  },
});
```

## File Storage

### Upload File

```typescript
const fileBlob = new Blob(['Hello, world!'], { type: 'text/plain' });

const result = await adapter.uploadFile({
  bucket: 'avatars',
  path: 'user/avatar.jpg',
  file: fileBlob,
  options: {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: true, // Overwrite if exists
  },
});

if (isOk(result)) {
  console.log('Uploaded to:', result.value.path);
}
```

### Download File

```typescript
const result = await adapter.downloadFile({
  bucket: 'avatars',
  path: 'user/avatar.jpg',
});

if (isOk(result)) {
  const blob = result.value;
  const url = URL.createObjectURL(blob);
  // Use the URL in an <img> tag or save to disk
}
```

### List Files

```typescript
const result = await adapter.listFiles({
  bucket: 'documents',
  path: 'folder',
  options: {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  },
});

if (isOk(result)) {
  for (const file of result.value) {
    console.log(file.name, file.metadata?.size);
  }
}
```

### Delete Files

```typescript
const result = await adapter.deleteFile('avatars', [
  'user/old-avatar.jpg',
  'user/temp.jpg',
]);
```

### Get Public URL

```typescript
const result = adapter.getPublicUrl('avatars', 'user/avatar.jpg');

if (isOk(result)) {
  console.log('Public URL:', result.value);
}
```

## Advanced Usage

### Access Raw Supabase Client

```typescript
const clientResult = adapter.getClient();

if (isOk(clientResult)) {
  const supabase = clientResult.value;

  // Use Supabase client directly for advanced features
  const { data, error } = await supabase
    .from('posts')
    .select('*, comments(count)')
    .gte('likes', 10);
}
```

### Complex Queries

```typescript
const clientResult = adapter.getClient();

if (isOk(clientResult)) {
  const supabase = clientResult.value;

  // Query with joins and aggregations
  const { data } = await supabase
    .from('posts')
    .select(`
      *,
      author:users!author_id(name, email),
      comments(count),
      likes(count)
    `)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(0, 9);
}
```

## Configuration

```typescript
await adapter.init({
  url: 'https://your-project.supabase.co',
  key: 'your-anon-or-service-key',

  // Optional auth configuration
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },

  // Optional realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

## Environment Variables

```bash
# .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## Best Practices

1. **Use Service Key for Server-Side**: Use the service role key for admin operations
2. **Handle Result Types**: Always check `isOk()` before accessing values
3. **Implement Row Level Security**: Configure RLS policies in Supabase Dashboard
4. **Use Real-time Sparingly**: Real-time subscriptions use server resources
5. **Optimize Queries**: Use `select` to fetch only needed columns
6. **Storage Permissions**: Configure bucket policies for file access
7. **Authentication**: Always validate sessions on the server side

## Database Setup

Create tables in your Supabase project:

```sql
-- Users table (managed by Supabase Auth)
-- auth.users is automatically created

-- Posts table
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id),
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read published posts"
  ON posts FOR SELECT
  USING (published = true);

CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);
```

## Examples

See the [examples](./examples) directory for:
- Database CRUD operations
- Authentication flows
- Real-time subscriptions
- File storage operations

## Error Handling

All operations return `Result<T, Error>`:

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await adapter.query({ table: 'posts', select: '*' });

if (isOk(result)) {
  console.log('Data:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

## TypeScript

Full TypeScript support with strict typing:

```typescript
import { SupabaseAdapter } from '@servicejs/adapter-supabase';

const adapter: SupabaseAdapter = createSupabaseAdapter();
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## License

MIT
