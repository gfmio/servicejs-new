/**
 * Elasticsearch Aggregations Example
 */

import { createElasticsearchAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createElasticsearchAdapter();

  await adapter.init({
    node: 'http://localhost:9200',
  });

  await adapter.start();

  // Create index with sample data
  await adapter.createIndex({
    index: 'sales',
    mappings: {
      properties: {
        product: { type: 'keyword' },
        category: { type: 'keyword' },
        price: { type: 'float' },
        quantity: { type: 'integer' },
        date: { type: 'date' },
      },
    },
  });

  // Bulk index sample data
  const bulkOps = [
    { index: { _index: 'sales', _id: '1' } },
    { product: 'Laptop', category: 'Electronics', price: 1299.99, quantity: 2, date: '2024-01-15' },
    { index: { _index: 'sales', _id: '2' } },
    { product: 'Mouse', category: 'Electronics', price: 49.99, quantity: 5, date: '2024-01-16' },
    { index: { _index: 'sales', _id: '3' } },
    { product: 'Desk', category: 'Furniture', price: 599.99, quantity: 1, date: '2024-01-16' },
    { index: { _index: 'sales', _id: '4' } },
    { product: 'Chair', category: 'Furniture', price: 299.99, quantity: 3, date: '2024-01-17' },
  ];

  await adapter.bulk(bulkOps);

  // Wait for indexing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Aggregations
  console.log('\n--- Category Aggregation ---');
  const categoryAgg = await adapter.search({
    index: 'sales',
    size: 0,
    aggregations: {
      by_category: {
        terms: {
          field: 'category',
        },
        aggregations: {
          total_revenue: {
            sum: {
              field: 'price',
            },
          },
        },
      },
    },
  });

  if (isOk(categoryAgg)) {
    console.log('Category aggregation:', JSON.stringify(categoryAgg.value.aggregations, null, 2));
  }

  // Date histogram
  console.log('\n--- Date Histogram ---');
  const dateHist = await adapter.search({
    index: 'sales',
    size: 0,
    aggregations: {
      sales_over_time: {
        date_histogram: {
          field: 'date',
          calendar_interval: 'day',
        },
      },
    },
  });

  if (isOk(dateHist)) {
    console.log('Date histogram:', JSON.stringify(dateHist.value.aggregations, null, 2));
  }

  // Stats aggregation
  console.log('\n--- Price Stats ---');
  const stats = await adapter.search({
    index: 'sales',
    size: 0,
    aggregations: {
      price_stats: {
        stats: {
          field: 'price',
        },
      },
    },
  });

  if (isOk(stats)) {
    console.log('Price stats:', JSON.stringify(stats.value.aggregations, null, 2));
  }

  // Cleanup
  await adapter.deleteIndex('sales');
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
