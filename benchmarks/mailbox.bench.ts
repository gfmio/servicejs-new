/**
 * Mailbox Performance Benchmarks
 *
 * Measures throughput and latency of mailbox operations.
 */

import { bench, run, group } from 'mitata';
import { createSyncMailbox, createAsyncMailbox, createPriorityMailbox } from '@servicejs/mailbox';

type TestMessage = { type: 'test'; value: number };

console.log('=== Mailbox Benchmarks ===\n');

// Sync Mailbox Benchmarks
group('Sync Mailbox', () => {
  bench('send (no processing)', () => {
    const mailbox = createSyncMailbox<TestMessage>();
    mailbox.send({ type: 'test', value: 42 });
  });

  bench('send + process (single message)', () => {
    const mailbox = createSyncMailbox<TestMessage>();
    let processed = 0;

    mailbox.onMessage((msg) => {
      processed = msg.value;
    });

    mailbox.send({ type: 'test', value: 42 });
  });

  bench('send + process (10 messages)', () => {
    const mailbox = createSyncMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage((msg) => {
      count++;
    });

    for (let i = 0; i < 10; i++) {
      mailbox.send({ type: 'test', value: i });
    }
  });

  bench('send + process (100 messages)', () => {
    const mailbox = createSyncMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage((msg) => {
      count++;
    });

    for (let i = 0; i < 100; i++) {
      mailbox.send({ type: 'test', value: i });
    }
  });
});

// Async Mailbox Benchmarks
group('Async Mailbox', () => {
  bench('send (no processing)', () => {
    const mailbox = createAsyncMailbox<TestMessage>();
    mailbox.send({ type: 'test', value: 42 });
  });

  bench('send + process (single message)', async () => {
    const mailbox = createAsyncMailbox<TestMessage>();
    let processed = 0;

    mailbox.onMessage(async (msg) => {
      processed = msg.value;
    });

    mailbox.send({ type: 'test', value: 42 });
    await mailbox.flush();
  });

  bench('send + process (10 messages)', async () => {
    const mailbox = createAsyncMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage(async (msg) => {
      count++;
    });

    for (let i = 0; i < 10; i++) {
      mailbox.send({ type: 'test', value: i });
    }

    await mailbox.flush();
  });

  bench('send + process (100 messages)', async () => {
    const mailbox = createAsyncMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage(async (msg) => {
      count++;
    });

    for (let i = 0; i < 100; i++) {
      mailbox.send({ type: 'test', value: i });
    }

    await mailbox.flush();
  });
});

// Priority Mailbox Benchmarks
group('Priority Mailbox', () => {
  bench('send with priority', () => {
    const mailbox = createPriorityMailbox<TestMessage>();
    mailbox.send({ type: 'test', value: 42 }, 1);
  });

  bench('send + process (mixed priorities)', () => {
    const mailbox = createPriorityMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage((msg) => {
      count++;
    });

    // Send messages with different priorities
    mailbox.send({ type: 'test', value: 1 }, 3); // Low priority
    mailbox.send({ type: 'test', value: 2 }, 1); // High priority
    mailbox.send({ type: 'test', value: 3 }, 2); // Medium priority
  });

  bench('send + process (100 mixed priorities)', () => {
    const mailbox = createPriorityMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage((msg) => {
      count++;
    });

    for (let i = 0; i < 100; i++) {
      const priority = (i % 3) + 1; // Priorities 1, 2, 3
      mailbox.send({ type: 'test', value: i }, priority);
    }
  });
});

// Throughput Test
group('Throughput', () => {
  bench('sync mailbox (1000 msgs)', () => {
    const mailbox = createSyncMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage((msg) => {
      count++;
    });

    for (let i = 0; i < 1000; i++) {
      mailbox.send({ type: 'test', value: i });
    }
  });

  bench('async mailbox (1000 msgs)', async () => {
    const mailbox = createAsyncMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage(async (msg) => {
      count++;
    });

    for (let i = 0; i < 1000; i++) {
      mailbox.send({ type: 'test', value: i });
    }

    await mailbox.flush();
  });

  bench('priority mailbox (1000 msgs)', () => {
    const mailbox = createPriorityMailbox<TestMessage>();
    let count = 0;

    mailbox.onMessage((msg) => {
      count++;
    });

    for (let i = 0; i < 1000; i++) {
      mailbox.send({ type: 'test', value: i }, (i % 3) + 1);
    }
  });
});

await run();
