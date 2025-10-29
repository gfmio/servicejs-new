/**
 * FaunaDB Indexes Example
 *
 * Demonstrates creating and using indexes for efficient queries
 */

import { createFaunaAdapter, fql } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createFaunaAdapter();

  await adapter.init({
    secret: process.env.FAUNA_SECRET!,
  });

  await adapter.start();

  // Create collection
  await adapter.query(fql`
    if (!Collection.byName("Products").exists()) {
      Collection.create({ name: "Products" })
    }
  `);

  // Create an index on category
  console.log('\n--- Create Index ---');

  const indexResult = await adapter.query(fql`
    if (!Index.byName("products_by_category").exists()) {
      Index.create({
        name: "products_by_category",
        source: Collection.byName("Products"),
        terms: [{ field: "category" }]
      })
    }
  `);

  if (isOk(indexResult)) {
    console.log('Index created');
  }

  // Insert products
  console.log('\n--- Insert Products ---');

  await adapter.query(fql`
    Products.create({
      name: "Laptop",
      category: "Electronics",
      price: 999.99,
      inStock: true
    })
  `);

  await adapter.query(fql`
    Products.create({
      name: "Mouse",
      category: "Electronics",
      price: 29.99,
      inStock: true
    })
  `);

  await adapter.query(fql`
    Products.create({
      name: "Desk",
      category: "Furniture",
      price: 299.99,
      inStock: false
    })
  `);

  // Query using index
  console.log('\n--- Query by Category (using index) ---');

  const electronicsResult = await adapter.query(fql`
    Index.byName("products_by_category").match("Electronics")
  `);

  if (isOk(electronicsResult)) {
    console.log('Electronics:', electronicsResult.value);
  }

  // Complex query with filtering
  console.log('\n--- Complex Query ---');

  const availableResult = await adapter.query(fql`
    Products.where(.category == "Electronics" && .inStock == true)
  `);

  if (isOk(availableResult)) {
    console.log('Available electronics:', availableResult.value);
  }

  // Aggregation query
  console.log('\n--- Aggregation ---');

  const avgPriceResult = await adapter.query(fql`
    Products.where(.category == "Electronics")
           .fold(0, (sum, product) => sum + product.price) /
    Products.where(.category == "Electronics").count()
  `);

  if (isOk(avgPriceResult)) {
    console.log('Average electronics price:', avgPriceResult.value);
  }

  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
