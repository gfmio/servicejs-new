/**
 * @servicejs/transport - Location-Transparent Transports
 *
 * Provides transport abstractions for local, worker, and network communication.
 */

// Transport abstraction
export type {
  Transport,
  MessageEnvelope,
  TransportError,
  TransportFactory,
} from './transport.js';

// Serialization
export type { Serializer } from './serialization.js';
export {
  createSerializer,
  createJsonSerializer,
  createStructuredCloneSerializer,
} from './serialization.js';

// Local transport
export type { LocalTransportConfig } from './localTransport.js';
export { createLocalTransport, getLocalTransportRegistry } from './localTransport.js';

// Worker transport
export type { WorkerLike, WorkerTransportConfig } from './workerTransport.js';
export { createWorkerTransport } from './workerTransport.js';

// Network transport
export type { NetworkTransportConfig } from './networkTransport.js';
export { createNetworkTransport } from './networkTransport.js';

// TCP transport
export type { TCPTransportConfig } from './tcpTransport.js';
export { createTCPTransport } from './tcpTransport.js';

// Shared memory transport
export type {
  RingBufferConfig,
  SharedMemoryTransportConfig,
} from './sharedMemoryTransport.js';
export {
  RingBuffer,
  createSharedBuffer,
  createSharedMemoryTransport,
} from './sharedMemoryTransport.js';

// Transport utilities
export type {
  TransportRouter,
  TransportRouterConfig,
  RetryPolicy,
  TimeoutConfig,
} from './utilities.js';
export {
  createTransportRouter,
  createPrefixRouter,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  defaultRetryPolicy,
} from './utilities.js';
