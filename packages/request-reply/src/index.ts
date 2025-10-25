/**
 * @servicejs/request-reply
 *
 * Request/Reply pattern for type-safe RPC-style communication.
 *
 * This package provides:
 * - Type-safe request/response messaging
 * - Correlation IDs for matching replies
 * - Timeout handling
 * - Cancellation support
 *
 * @example
 * ```typescript
 * import { createRequestReply, createReply, waitForResponse } from '@servicejs/request-reply';
 *
 * // Client side: Create request
 * const { requestMessage, pendingRequest } = createRequestReply(
 *   { userId: '123' },
 *   responseCapability
 * );
 *
 * // Send request
 * serverCapability.send(requestMessage);
 *
 * // Wait for response
 * const result = await waitForResponse(pendingRequest, 5000);
 * if (result.isOk()) {
 *   console.log('Response:', result.value);
 * }
 *
 * // Server side: Handle request and reply
 * const reply = createReply(requestMessage, responseData);
 * requestMessage.replyTo.send(reply);
 * ```
 */

export {
  createRequestReply,
  createReply,
  waitForResponse,
  type RequestMessage,
  type ResponseMessage,
  type PendingRequest,
  type RequestReplyError,
} from './requestReply.js';
