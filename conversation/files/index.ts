// Result type for error handling
export type { Result, Ok, Err } from './result.js';
export { Ok, Err, isOk, isErr, unwrap, unwrapOr, map, mapErr, andThen } from './result.js';

// URN for component identification
export type { URN } from './urn.js';
export { createURN, parseURN, generateURN } from './urn.js';

// Message and channel types
export type { Message, Channel, ReplyChannel } from './channel.js';
export { createChannel, createReplyChannel, createPromiseReplyChannel } from './channel.js';

// Component types
export type {
  Component,
  ComponentConfig,
  Reducer,
  ReducerResult,
  EmitMessage,
} from './component.js';
export { reducerResult, emitTo, stay, transition } from './component.js';

// Capability types
export type { Capability, CapabilityConfig } from './capability.js';
export {
  createCapability,
  capabilityAsChannel,
  composeCapabilities,
  restrictCapability,
} from './capability.js';

// Simple component implementation
export { SimpleComponent, createSimpleComponent } from './simple-component.js';
