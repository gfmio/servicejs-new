/**
 * @servicejs/capability-time
 *
 * Time and scheduling capability for ServiceJS.
 *
 * @packageDocumentation
 */

export type { TimeCapability, TimeError, CancelFn, TimerId, FakeTimeCapability } from './types.js';
export { createFakeTime, createNoOpTime } from './fake.js';
