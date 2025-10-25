/**
 * @servicejs/capability-time
 *
 * Time and scheduling capability for ServiceJS.
 *
 * @packageDocumentation
 */

export type { TimeCapability, TimeError, CancelFn, FakeTimeCapability } from './types.js';
export { createFakeTime, createNoOpTime } from './fake.js';
