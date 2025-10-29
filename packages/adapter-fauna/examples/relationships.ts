/**
 * FaunaDB Relationships Example
 *
 * Demonstrates document relationships and nested queries
 */

import { createFaunaAdapter, fql } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createFaunaAdapter();

  await adapter.init({
    secret: process.env.FAUNA_SECRET!,
  });

  await adapter.start();

  // Create collections
  console.log('\n--- Create Collections ---');

  await adapter.query(fql`
    if (!Collection.byName("Authors").exists()) {
      Collection.create({ name: "Authors" })
    }
  `);

  await adapter.query(fql`
    if (!Collection.byName("Posts").exists()) {
      Collection.create({ name: "Posts" })
    }
  `);

  // Create an author
  console.log('\n--- Create Author ---');
  const authorResult = await adapter.query(fql`
    Authors.create({
      name: "Alice Smith",
      email: "alice@example.com"
    })
  `);

  if (isOk(authorResult)) {
    console.log('Author created:', authorResult.value);
    const authorId = authorResult.value.id;

    // Create posts for the author
    console.log('\n--- Create Posts ---');

    await adapter.query(fql`
      Posts.create({
        title: "Introduction to FaunaDB",
        content: "FaunaDB is a distributed document-relational database...",
        authorId: ${authorId},
        published: true
      })
    `);

    await adapter.query(fql`
      Posts.create({
        title: "Advanced FQL Queries",
        content: "Learn how to write complex queries in FQL...",
        authorId: ${authorId},
        published: false
      })
    `);

    // Query posts with author information
    console.log('\n--- Query Posts with Author ---');

    const postsResult = await adapter.query(fql`
      Posts.where(.authorId == ${authorId}).map(post => {
        author: Authors.byId(post.authorId),
        post: post
      })
    `);

    if (isOk(postsResult)) {
      console.log('Posts with authors:', JSON.stringify(postsResult.value, null, 2));
    }

    // Count posts by author
    console.log('\n--- Count Posts ---');

    const countResult = await adapter.query(fql`
      Posts.where(.authorId == ${authorId}).count()
    `);

    if (isOk(countResult)) {
      console.log('Post count:', countResult.value);
    }

    // Query published posts
    console.log('\n--- Published Posts ---');

    const publishedResult = await adapter.query(fql`
      Posts.where(.authorId == ${authorId} && .published == true)
    `);

    if (isOk(publishedResult)) {
      console.log('Published posts:', publishedResult.value);
    }
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
