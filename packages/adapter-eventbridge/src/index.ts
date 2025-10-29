/**
 * AWS EventBridge Adapter
 *
 * Serverless event bus for building event-driven applications
 */

export {
  createEventBridgeAdapter,
  type EventBridgeConfig,
  type EventBridgeAdapter,
  type EventEntry,
  type EventRule,
  type EventTarget,
} from './eventbridge.js';
