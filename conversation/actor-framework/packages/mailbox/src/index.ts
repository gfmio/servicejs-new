// FIFO mailbox
export { FIFOMailboxComponent, createFIFOMailboxComponent } from './fifo.js';

// Async FIFO mailbox
export { AsyncFIFOMailboxComponent, createAsyncFIFOMailboxComponent } from './async-fifo.js';

// Priority mailbox
export type { PriorityMessage } from './priority.js';
export { PriorityMailboxComponent, createPriorityMailboxComponent } from './priority.js';

// Bounded mailbox
export type { BoundedMailboxConfig } from './bounded.js';
export { BoundedMailboxComponent, createBoundedMailboxComponent } from './bounded.js';
