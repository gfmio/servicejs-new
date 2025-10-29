/**
 * Kysely Adapter Complex Queries Example
 */

import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { createKyselyAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

interface Database {
  user: {
    id: number;
    name: string;
    email: string;
    age: number | null;
  };
  post: {
    id: number;
    title: string;
    content: string | null;
    author_id: number;
    published: boolean;
  };
}

async function main() {
  const kysely = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        host: 'localhost',
        port: 5432,
        user: 'user',
        password: 'password',
        database: 'mydb',
      }),
    }),
  });

  const adapter = createKyselyAdapter<Database>();
  await adapter.init({ kysely });
  await adapter.start();

  const kyselyResult = adapter.getKysely();
  if (isOk(kyselyResult)) {
    const db = kyselyResult.value;

    // Complex query with JOIN
    const joinQuery = db
      .selectFrom('user')
      .innerJoin('post', 'post.author_id', 'user.id')
      .select([
        'user.name',
        'user.email',
        'post.title',
        'post.published',
      ])
      .where('post.published', '=', true)
      .orderBy('post.id', 'desc');

    const joinResult = await adapter.execute(joinQuery);
    if (isOk(joinResult)) {
      console.log('Users with published posts:', joinResult.value);
    }

    // Aggregation query
    const aggregateQuery = db
      .selectFrom('user')
      .leftJoin('post', 'post.author_id', 'user.id')
      .select([
        'user.name',
        sql<number>`count(post.id)`.as('post_count'),
        sql<number>`coalesce(avg(length(post.content)), 0)`.as('avg_post_length'),
      ])
      .groupBy('user.id')
      .groupBy('user.name')
      .having(sql`count(post.id)`, '>', 0)
      .orderBy('post_count', 'desc');

    const aggregateResult = await adapter.execute(aggregateQuery);
    if (isOk(aggregateResult)) {
      console.log('User statistics:', aggregateResult.value);
    }

    // Subquery
    const subqueryQuery = db
      .selectFrom('user')
      .selectAll('user')
      .where(
        'user.id',
        'in',
        db
          .selectFrom('post')
          .select('author_id')
          .where('published', '=', true)
          .distinct()
      );

    const subqueryResult = await adapter.execute(subqueryQuery);
    if (isOk(subqueryResult)) {
      console.log('Users with published posts:', subqueryResult.value);
    }

    // CTE (Common Table Expression)
    const cteQuery = db
      .with('published_authors', (qb) =>
        qb
          .selectFrom('post')
          .select('author_id')
          .where('published', '=', true)
          .distinct()
      )
      .selectFrom('user')
      .innerJoin('published_authors', 'published_authors.author_id', 'user.id')
      .selectAll('user');

    const cteResult = await adapter.execute(cteQuery);
    if (isOk(cteResult)) {
      console.log('Authors with CTE:', cteResult.value);
    }
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
