/**
 * OpenAI embeddings and similarity search example
 *
 * This example demonstrates:
 * - Generating embeddings for text
 * - Computing cosine similarity between embeddings
 * - Finding similar documents
 * - Semantic search
 */

import { createOpenAIAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

// Helper function to compute cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  const adapter = createOpenAIAdapter();

  await adapter.init({
    apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
  });

  await adapter.start();

  console.log('=== Embeddings and Similarity Search ===\n');

  // Document corpus
  const documents = [
    'The cat sat on the mat',
    'The dog played in the garden',
    'Machine learning models process data',
    'Neural networks learn patterns from examples',
    'The weather is sunny today',
    'TypeScript is a typed superset of JavaScript',
    'Python is popular for data science',
    'The quick brown fox jumps over the lazy dog',
  ];

  console.log('Generating embeddings for documents...\n');

  // Generate embeddings for all documents
  const embeddingResult = await adapter.createEmbedding(documents);

  if (!isOk(embeddingResult)) {
    console.error('Failed to generate embeddings');
    return;
  }

  const embeddings = embeddingResult.value.data.map((e) => e.embedding);

  console.log(`Generated ${embeddings.length} embeddings`);
  console.log(`Embedding dimensions: ${embeddings[0].length}`);
  console.log(`Tokens used: ${embeddingResult.value.usage.totalTokens}\n`);

  // Query document
  const query = 'artificial intelligence and deep learning';

  console.log(`Query: "${query}"\n`);

  // Generate embedding for query
  const queryEmbeddingResult = await adapter.createEmbedding(query);

  if (!isOk(queryEmbeddingResult)) {
    console.error('Failed to generate query embedding');
    return;
  }

  const queryEmbedding = queryEmbeddingResult.value.data[0].embedding;

  // Compute similarities
  const similarities = embeddings.map((embedding, index) => ({
    document: documents[index],
    similarity: cosineSimilarity(queryEmbedding, embedding),
  }));

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Display results
  console.log('Most similar documents:\n');
  similarities.slice(0, 5).forEach((result, index) => {
    console.log(`${index + 1}. [Similarity: ${result.similarity.toFixed(4)}]`);
    console.log(`   "${result.document}"\n`);
  });

  // Find documents above similarity threshold
  console.log('=== Documents Above Threshold (0.7) ===\n');

  const threshold = 0.7;
  const relevantDocuments = similarities.filter((s) => s.similarity > threshold);

  if (relevantDocuments.length === 0) {
    console.log('No documents found above threshold\n');
  } else {
    relevantDocuments.forEach((result) => {
      console.log(`[${result.similarity.toFixed(4)}] ${result.document}`);
    });
    console.log();
  }

  // Compare document similarity matrix
  console.log('=== Document Similarity Matrix ===\n');

  console.log('Computing pairwise similarities...\n');

  const topics = [
    'Programming languages',
    'Machine learning',
    'Animals and pets',
  ];

  const topicDocs = [
    ['TypeScript is a typed superset of JavaScript', 'Python is popular for data science'],
    ['Machine learning models process data', 'Neural networks learn patterns from examples'],
    ['The cat sat on the mat', 'The dog played in the garden'],
  ];

  for (const [topicIndex, topic] of topics.entries()) {
    console.log(`Topic: ${topic}`);

    const docs = topicDocs[topicIndex];
    const topicEmbeddingResult = await adapter.createEmbedding(docs);

    if (isOk(topicEmbeddingResult)) {
      const topicEmbeddings = topicEmbeddingResult.value.data.map((e) => e.embedding);
      const similarity = cosineSimilarity(topicEmbeddings[0], topicEmbeddings[1]);

      console.log(`  Doc 1: "${docs[0]}"`);
      console.log(`  Doc 2: "${docs[1]}"`);
      console.log(`  Similarity: ${similarity.toFixed(4)}\n`);
    }
  }

  // Clustering example
  console.log('=== Document Clustering ===\n');

  const categories = {
    tech: [] as string[],
    animals: [] as string[],
    other: [] as string[],
  };

  const techKeywords = ['TypeScript', 'Python', 'Machine learning', 'Neural networks'];
  const animalKeywords = ['cat', 'dog'];

  for (const doc of documents) {
    if (techKeywords.some((kw) => doc.includes(kw))) {
      categories.tech.push(doc);
    } else if (animalKeywords.some((kw) => doc.includes(kw))) {
      categories.animals.push(doc);
    } else {
      categories.other.push(doc);
    }
  }

  console.log('Technology documents:');
  categories.tech.forEach((doc) => console.log(`  - ${doc}`));

  console.log('\nAnimal documents:');
  categories.animals.forEach((doc) => console.log(`  - ${doc}`));

  console.log('\nOther documents:');
  categories.other.forEach((doc) => console.log(`  - ${doc}`));

  console.log();

  // Cleanup
  await adapter.stop();
  await adapter.destroy();
}

main().catch(console.error);
