# @servicejs/adapter-typeorm

TypeORM adapter providing entity-based ORM capabilities with decorators, migrations, and rich relationship handling.

## Status

✅ **Implemented** - Production ready

## Features

- **Entity-based ORM**: Define database models using TypeScript classes and decorators
- **Lifecycle Management**: Standard init/start/stop/destroy pattern
- **Transaction Support**: ACID transactions with automatic rollback on errors
- **Repository Pattern**: Type-safe repository access for all entities
- **Entity Manager**: Direct access to TypeORM's EntityManager
- **Raw Queries**: Execute custom SQL when needed
- **Migrations**: Schema versioning and evolution
- **Relations**: One-to-Many, Many-to-One, Many-to-Many relationships
- **Result Types**: All operations return Result<T, Error> for predictable error handling

## Installation

```bash
npm install @servicejs/adapter-typeorm typeorm reflect-metadata
```

You'll also need a database driver:

```bash
# PostgreSQL
npm install pg

# MySQL
npm install mysql2

# SQLite
npm install better-sqlite3

# Microsoft SQL Server
npm install mssql
```

## Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Import `reflect-metadata` at the top of your entry file:

```typescript
import 'reflect-metadata';
```

## Quick Start

```typescript
import 'reflect-metadata';
import { DataSource, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { createTypeORMAdapter } from '@servicejs/adapter-typeorm';
import { isOk } from '@servicejs/result';

// Define entities
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;
}

// Create DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'mydb',
  entities: [User],
  synchronize: true, // Don't use in production!
});

// Create and initialize adapter
const adapter = createTypeORMAdapter();
await adapter.init({ dataSource });
await adapter.start();

// Use repository pattern
const repoResult = adapter.getRepository(User);
if (isOk(repoResult)) {
  const userRepo = repoResult.value;

  const user = userRepo.create({ name: 'John', email: 'john@example.com' });
  await userRepo.save(user);

  const users = await userRepo.find();
  console.log(users);
}

// Cleanup
await adapter.stop();
```

## API

### Adapter Creation

```typescript
const adapter = createTypeORMAdapter();
```

### Lifecycle Methods

```typescript
// Initialize with DataSource
await adapter.init({ dataSource });

// Start the adapter (initializes the connection)
await adapter.start();

// Check health
const health = await adapter.health();
console.log(health.value.status); // 'healthy' | 'degraded' | 'unhealthy'

// Stop and cleanup
await adapter.stop();
await adapter.destroy();
```

### Access TypeORM Objects

```typescript
// Get the DataSource
const dsResult = adapter.getDataSource();
if (isOk(dsResult)) {
  const dataSource = dsResult.value;
}

// Get the EntityManager
const managerResult = adapter.getManager();
if (isOk(managerResult)) {
  const manager = managerResult.value;
}

// Get a Repository for an entity
const repoResult = adapter.getRepository(User);
if (isOk(repoResult)) {
  const repository = repoResult.value;

  // Repository methods
  await repository.find();
  await repository.findOne({ where: { id: 1 } });
  await repository.save(user);
  await repository.remove(user);
}
```

### Transactions

```typescript
const result = await adapter.transaction(async (manager) => {
  const userRepo = manager.getRepository(User);
  const postRepo = manager.getRepository(Post);

  const user = userRepo.create({ name: 'Alice', email: 'alice@example.com' });
  await userRepo.save(user);

  const post = postRepo.create({ title: 'Hello', authorId: user.id });
  await postRepo.save(post);

  return user.id;
});

if (isOk(result)) {
  console.log('Transaction successful:', result.value);
} else {
  console.error('Transaction failed:', result.error);
}
```

### Raw Queries

```typescript
// Using queryRaw
const result = await adapter.queryRaw<User[]>('SELECT * FROM user WHERE age > ?', [18]);

if (isOk(result)) {
  console.log(result.value);
}

// Using executeRaw for non-query operations
const execResult = await adapter.executeRaw('UPDATE user SET active = ? WHERE age < ?', [false, 18]);
```

## Entities and Relations

```typescript
@Entity()
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @OneToMany(() => Post, post => post.author)
  posts!: Post[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity()
class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @ManyToOne(() => User, user => user.posts, { onDelete: 'CASCADE' })
  author!: User;

  @Column()
  authorId!: number;
}
```

## Best Practices

1. **Don't use synchronize in production**: Use migrations instead
2. **Use transactions for multi-step operations**: Ensures data consistency
3. **Handle Result types**: Always check `isOk()` before accessing values
4. **Define proper indices**: Add `@Index()` decorators for frequently queried columns
5. **Use query builders for complex queries**: TypeORM's QueryBuilder is type-safe
6. **Validate input data**: Use class-validator with entities
7. **Connection pooling**: Configure pool size based on your needs

## Examples

See the [examples](./examples) directory for:
- Basic CRUD operations
- Transaction handling
- Complex queries with relations
- Migration workflows

## Error Handling

All operations return `Result<T, Error>`:

```typescript
import { isOk, isErr, unwrap } from '@servicejs/result';

const result = await adapter.getRepository(User);

if (isOk(result)) {
  const repo = result.value;
  // Use repository
} else {
  console.error('Error:', result.error.message);
}

// Or use unwrap (throws if error)
const repo = unwrap(result);
```

## TypeScript

Full TypeScript support with strict typing:

```typescript
import { TypeORMAdapter } from '@servicejs/adapter-typeorm';

const adapter: TypeORMAdapter = createTypeORMAdapter();
```

## License

MIT
