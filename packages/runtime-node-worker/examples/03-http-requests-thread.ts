/**
 * HTTP Requests Example - Worker Thread
 *
 * This demonstrates making HTTP requests using the runtime's HTTP capability.
 */
import { bootstrap } from '@servicejs/runtime-node-worker';
import { isOk } from '@servicejs/result';

// Bootstrap the worker runtime
const runtime = bootstrap();

let successCount = 0;
let errorCount = 0;

function log(message: string) {
  runtime.parentPort.postMessage({ type: 'log', message });
}

function error(err: string) {
  runtime.parentPort.postMessage({ type: 'error', error: err });
}

// Handle messages from main thread
runtime.parentPort.onMessage(async (message: any) => {
  if (message.action === 'start') {
    await performHttpRequests();
  }
});

async function performHttpRequests() {
  // Get API URL from environment
  const apiUrlOption = runtime.env.get('API_URL');
  if (!apiUrlOption.isSome()) {
    error('API_URL not provided');
    return;
  }

  const apiUrl = apiUrlOption.value;
  log(`Using API URL: ${apiUrl}`);

  // 1. Fetch a list of posts
  log('\n1. Fetching posts...');
  const postsResult = await runtime.http.get(`${apiUrl}/posts?_limit=5`);

  if (isOk(postsResult)) {
    const response = postsResult.value;
    log(`✓ Status: ${response.status}`);

    const jsonResult = await response.json();
    if (isOk(jsonResult)) {
      const posts = jsonResult.value as any[];
      log(`✓ Received ${posts.length} posts`);
      if (posts.length > 0) {
        log(`  First post: "${posts[0].title}"`);
      }
      successCount++;
    } else {
      error(`Failed to parse JSON: ${jsonResult.error.message}`);
      errorCount++;
    }
  } else {
    error(`Failed to fetch posts: ${postsResult.error.message}`);
    errorCount++;
  }

  // 2. Fetch a single user
  log('\n2. Fetching user...');
  const userResult = await runtime.http.get(`${apiUrl}/users/1`);

  if (isOk(userResult)) {
    const response = userResult.value;
    log(`✓ Status: ${response.status}`);

    const jsonResult = await response.json();
    if (isOk(jsonResult)) {
      const user = jsonResult.value as any;
      log(`✓ User: ${user.name} (${user.email})`);
      successCount++;
    } else {
      error(`Failed to parse JSON: ${jsonResult.error.message}`);
      errorCount++;
    }
  } else {
    error(`Failed to fetch user: ${userResult.error.message}`);
    errorCount++;
  }

  // 3. Make a POST request
  log('\n3. Creating a new post...');
  const postData = {
    title: 'Test Post from Worker',
    body: 'This is a test post created by a ServiceJS worker thread',
    userId: 1,
  };

  const createResult = await runtime.http.post(`${apiUrl}/posts`, {
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (isOk(createResult)) {
    const response = createResult.value;
    log(`✓ Status: ${response.status}`);

    const jsonResult = await response.json();
    if (isOk(jsonResult)) {
      const created = jsonResult.value as any;
      log(`✓ Created post with ID: ${created.id}`);
      successCount++;
    } else {
      error(`Failed to parse JSON: ${jsonResult.error.message}`);
      errorCount++;
    }
  } else {
    error(`Failed to create post: ${createResult.error.message}`);
    errorCount++;
  }

  // 4. Test with custom request options
  log('\n4. Making custom request...');
  const customResult = await runtime.http.request(`${apiUrl}/comments?_limit=3`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (isOk(customResult)) {
    const response = customResult.value;
    log(`✓ Status: ${response.status}`);

    const jsonResult = await response.json();
    if (isOk(jsonResult)) {
      const comments = jsonResult.value as any[];
      log(`✓ Received ${comments.length} comments`);
      successCount++;
    } else {
      error(`Failed to parse JSON: ${jsonResult.error.message}`);
      errorCount++;
    }
  } else {
    error(`Failed to fetch comments: ${customResult.error.message}`);
    errorCount++;
  }

  // Send results
  log('\n✅ All HTTP operations complete!');
  runtime.parentPort.postMessage({
    type: 'result',
    successCount,
    errorCount,
  });

  // Signal we're done
  setTimeout(() => {
    runtime.parentPort.postMessage({ type: 'done' });
  }, 100);
}

log('Worker ready!');
