/**
 * HTTP Requests Example - Worker Thread
 */
import { bootstrap } from '@servicejs/runtime-bun-worker';
import { isOk } from '@servicejs/result';

const runtime = bootstrap();
let successCount = 0, errorCount = 0;

const log = (msg: string) => runtime.self.postMessage({ type: 'log', message: msg });

runtime.self.onMessage(async (message: any) => {
  if (message.action !== 'start') return;
  const apiUrl = message.url;

  // 1. Fetch posts
  log('Fetching posts...');
  const postsResult = await runtime.http.get(`${apiUrl}/posts?_limit=3`);
  if (isOk(postsResult)) {
    const jsonResult = await postsResult.value.json();
    if (isOk(jsonResult)) {
      log(`✓ Received ${(jsonResult.value as any[]).length} posts`);
      successCount++;
    }
  } else errorCount++;

  // 2. Fetch user
  log('Fetching user...');
  const userResult = await runtime.http.get(`${apiUrl}/users/1`);
  if (isOk(userResult)) {
    const jsonResult = await userResult.value.json();
    if (isOk(jsonResult)) {
      log(`✓ User: ${(jsonResult.value as any).name}`);
      successCount++;
    }
  } else errorCount++;

  // 3. POST request
  log('Creating post...');
  const createResult = await runtime.http.post(`${apiUrl}/posts`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test', body: 'From Bun Worker', userId: 1 }),
  });
  if (isOk(createResult)) {
    log(`✓ Status: ${createResult.value.status}`);
    successCount++;
  } else errorCount++;

  runtime.self.postMessage({ type: 'result', successCount, errorCount });
});

log('Worker ready!');
