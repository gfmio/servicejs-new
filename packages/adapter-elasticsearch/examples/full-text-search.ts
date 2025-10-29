/**
 * Elasticsearch Full-Text Search Example
 */

import { createElasticsearchAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createElasticsearchAdapter();

  await adapter.init({
    node: 'http://localhost:9200',
  });

  await adapter.start();

  // Create index with text analysis
  await adapter.createIndex({
    index: 'articles',
    mappings: {
      properties: {
        title: {
          type: 'text',
          analyzer: 'english',
        },
        content: {
          type: 'text',
          analyzer: 'english',
        },
        author: {
          type: 'keyword',
        },
        tags: {
          type: 'keyword',
        },
        published_date: {
          type: 'date',
        },
      },
    },
  });

  // Index sample articles
  const articles = [
    {
      title: 'Introduction to Elasticsearch',
      content: 'Elasticsearch is a distributed search and analytics engine built on Apache Lucene.',
      author: 'John Doe',
      tags: ['elasticsearch', 'search', 'tutorial'],
      published_date: '2024-01-15',
    },
    {
      title: 'Building Scalable Applications',
      content: 'Learn how to build scalable applications using microservices architecture.',
      author: 'Jane Smith',
      tags: ['architecture', 'microservices', 'scalability'],
      published_date: '2024-01-20',
    },
    {
      title: 'Full-Text Search Best Practices',
      content: 'Best practices for implementing full-text search in your applications.',
      author: 'Bob Johnson',
      tags: ['search', 'best-practices', 'performance'],
      published_date: '2024-01-25',
    },
  ];

  for (const [index, article] of articles.entries()) {
    await adapter.index({
      index: 'articles',
      id: String(index + 1),
      document: article,
      refresh: 'wait_for',
    });
  }

  // Match query
  console.log('\n--- Match Query ---');
  const matchResult = await adapter.search({
    index: 'articles',
    query: {
      match: {
        content: 'search applications',
      },
    },
  });

  if (isOk(matchResult)) {
    console.log('Match results:', matchResult.value.hits.hits.map((hit: any) => hit._source.title));
  }

  // Multi-match query
  console.log('\n--- Multi-Match Query ---');
  const multiMatchResult = await adapter.search({
    index: 'articles',
    query: {
      multi_match: {
        query: 'elasticsearch scalable',
        fields: ['title', 'content'],
      },
    },
  });

  if (isOk(multiMatchResult)) {
    console.log('Multi-match results:', multiMatchResult.value.hits.hits.map((hit: any) => hit._source.title));
  }

  // Boolean query
  console.log('\n--- Boolean Query ---');
  const boolResult = await adapter.search({
    index: 'articles',
    query: {
      bool: {
        must: [
          { match: { content: 'search' } },
        ],
        filter: [
          { term: { author: 'John Doe' } },
        ],
      },
    },
  });

  if (isOk(boolResult)) {
    console.log('Boolean query results:', boolResult.value.hits.hits.map((hit: any) => hit._source.title));
  }

  // Phrase query
  console.log('\n--- Phrase Query ---');
  const phraseResult = await adapter.search({
    index: 'articles',
    query: {
      match_phrase: {
        content: 'full-text search',
      },
    },
  });

  if (isOk(phraseResult)) {
    console.log('Phrase query results:', phraseResult.value.hits.hits.map((hit: any) => hit._source.title));
  }

  // Range query with sorting
  console.log('\n--- Range Query with Sorting ---');
  const rangeResult = await adapter.search({
    index: 'articles',
    query: {
      range: {
        published_date: {
          gte: '2024-01-01',
          lte: '2024-01-31',
        },
      },
    },
    sort: [
      { published_date: 'desc' },
    ],
  });

  if (isOk(rangeResult)) {
    console.log('Range query results:', rangeResult.value.hits.hits.map((hit: any) => ({
      title: hit._source.title,
      date: hit._source.published_date,
    })));
  }

  // Cleanup
  await adapter.deleteIndex('articles');
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
