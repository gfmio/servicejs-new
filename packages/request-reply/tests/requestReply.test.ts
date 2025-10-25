import { describe, test, expect } from 'bun:test';
import { createRequestReply, createReply, waitForResponse } from '../src/requestReply';
import { createCapability, createMessage, type MessageOf } from '@servicejs/core';

type UserRequest = { userId: string };
type UserResponse = MessageOf<'user-response', { name: string; email: string }>;

describe('RequestReply', () => {
  describe('createRequestReply', () => {
    test('creates request message with correlation ID', () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const { requestMessage, pendingRequest } = createRequestReply<UserRequest, unknown, UserResponse>(
        { userId: '123' },
        responseCap
      );

      expect(requestMessage.correlationId).toBeDefined();
      expect(requestMessage.correlationId.length).toBeGreaterThan(0);
      expect(requestMessage.request).toEqual({ userId: '123' });
      expect(requestMessage.replyTo).toBe(responseCap);
      expect(pendingRequest.correlationId).toBe(requestMessage.correlationId);
    });

    test('generates unique correlation IDs', () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const req1 = createRequestReply<UserRequest, unknown, UserResponse>(
        { userId: '1' },
        responseCap
      );
      const req2 = createRequestReply<UserRequest, unknown, UserResponse>(
        { userId: '2' },
        responseCap
      );

      expect(req1.requestMessage.correlationId).not.toBe(req2.requestMessage.correlationId);
    });

    test('pending request starts without response', () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const { pendingRequest } = createRequestReply<UserRequest, unknown, UserResponse>(
        { userId: '123' },
        responseCap
      );

      expect(pendingRequest.hasResponse()).toBe(false);
      expect(pendingRequest.getResponse().isNone()).toBe(true);
      expect(pendingRequest.isCancelled()).toBe(false);
    });
  });

  describe('createReply', () => {
    test('creates reply with matching correlation ID', () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const { requestMessage } = createRequestReply<UserRequest, unknown, UserResponse>(
        { userId: '123' },
        responseCap
      );

      const reply = createReply(requestMessage, { name: 'Alice', email: 'alice@example.com' });

      expect(reply.correlationId).toBe(requestMessage.correlationId);
      expect(reply.response).toEqual({ name: 'Alice', email: 'alice@example.com' });
    });
  });

  describe('PendingRequest', () => {
    test('can be cancelled', () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const { pendingRequest } = createRequestReply<UserRequest, unknown, UserResponse>(
        { userId: '123' },
        responseCap
      );

      expect(pendingRequest.isCancelled()).toBe(false);

      pendingRequest.cancel();

      expect(pendingRequest.isCancelled()).toBe(true);
    });
  });

  describe('waitForResponse', () => {
    test('returns error on timeout', async () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const { pendingRequest } = createRequestReply<UserRequest, { name: string }, UserResponse>(
        { userId: '123' },
        responseCap
      );

      const result = await waitForResponse(pendingRequest, 50); // 50ms timeout

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('TIMEOUT');
        expect(result.error.correlationId).toBe(pendingRequest.correlationId);
      }
    });

    test('returns error when cancelled', async () => {
      const responseCap = createCapability<UserResponse>(() => {});

      const { pendingRequest } = createRequestReply<UserRequest, { name: string }, UserResponse>(
        { userId: '123' },
        responseCap
      );

      // Cancel immediately
      pendingRequest.cancel();

      const result = await waitForResponse(pendingRequest, 1000);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('CANCELLED');
      }
    });
  });

  describe('integration', () => {
    test('full request/reply cycle', () => {
      let receivedRequest: any = null;

      // Server capability that receives requests
      const serverCap = createCapability<any>((msg) => {
        receivedRequest = msg;

        // Server creates reply and sends it back
        const reply = createReply(msg, { name: 'Alice', email: 'alice@example.com' });
        msg.replyTo.send(reply);
      });

      // Client capability that receives responses
      let receivedResponse: any = null;
      const responseCap = createCapability<UserResponse>((msg) => {
        receivedResponse = msg;
      });

      // Client creates request
      const { requestMessage, pendingRequest } = createRequestReply<UserRequest, any, UserResponse>(
        { userId: '123' },
        responseCap
      );

      // Send request to server
      serverCap.send(requestMessage);

      // Verify server received request
      expect(receivedRequest).not.toBeNull();
      expect(receivedRequest.request.userId).toBe('123');

      // Verify client received response
      expect(receivedResponse).not.toBeNull();
      expect(receivedResponse.correlationId).toBe(requestMessage.correlationId);
      expect(receivedResponse.response.name).toBe('Alice');
    });

    test('multiple concurrent requests', () => {
      const responses = new Map<string, any>();

      const serverCap = createCapability<any>((msg) => {
        // Simulate different responses based on userId
        const reply = createReply(msg, {
          name: `User-${msg.request.userId}`,
          email: `user${msg.request.userId}@example.com`,
        });
        msg.replyTo.send(reply);
      });

      const responseCap = createCapability<UserResponse>((msg) => {
        responses.set(msg.correlationId, msg.response);
      });

      // Create multiple requests
      const requests = [
        createRequestReply<UserRequest, any, UserResponse>({ userId: '1' }, responseCap),
        createRequestReply<UserRequest, any, UserResponse>({ userId: '2' }, responseCap),
        createRequestReply<UserRequest, any, UserResponse>({ userId: '3' }, responseCap),
      ];

      // Send all requests
      requests.forEach(({ requestMessage }) => {
        serverCap.send(requestMessage);
      });

      // Verify all responses
      expect(responses.size).toBe(3);
      requests.forEach(({ requestMessage }) => {
        const response = responses.get(requestMessage.correlationId);
        expect(response).toBeDefined();
        expect(response.name).toBe(`User-${requestMessage.request.userId}`);
      });
    });
  });
});
