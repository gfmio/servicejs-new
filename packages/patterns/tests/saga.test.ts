import { describe, test, expect } from 'bun:test';
import {
  createSagaBuilder,
  createStep,
  createIdempotentStep,
  executeSaga,
  type Saga,
  type SagaStep,
} from '../src/saga';
import { ok, err } from '@servicejs/result';
import { some, none } from '@servicejs/option';

describe('Saga Pattern', () => {
  describe('Saga Execution', () => {
    test('executes all steps successfully', async () => {
      interface Context {
        values: number[];
      }

      const step1: SagaStep<Context, number> = createStep(
        'step1',
        async (ctx) => {
          ctx.values.push(1);
          return ok(1);
        },
        async () => ok(undefined)
      );

      const step2: SagaStep<Context, number> = createStep(
        'step2',
        async (ctx) => {
          ctx.values.push(2);
          return ok(2);
        },
        async () => ok(undefined)
      );

      const saga: Saga<Context, number[]> = {
        name: 'test-saga',
        initialContext: { values: [] },
        steps: [step1, step2],
        finalizer: (ctx) => ctx.values,
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('success');
      if (outcome.type === 'success') {
        expect(outcome.result).toEqual([1, 2]);
      }
    });

    test('compensates when a step fails', async () => {
      interface Context {
        actions: string[];
      }

      const step1: SagaStep<Context, void> = createStep(
        'step1',
        async (ctx) => {
          ctx.actions.push('step1-execute');
          return ok(undefined);
        },
        async (ctx) => {
          ctx.actions.push('step1-compensate');
          return ok(undefined);
        }
      );

      const step2: SagaStep<Context, void> = createStep(
        'step2',
        async () => {
          return err(new Error('Step 2 failed'));
        },
        async () => ok(undefined)
      );

      const saga: Saga<Context, string[]> = {
        name: 'test-saga',
        initialContext: { actions: [] },
        steps: [step1, step2],
        finalizer: (ctx) => ctx.actions,
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('compensated');
      if (outcome.type === 'compensated') {
        expect(outcome.failedStep).toBe('step2');
        expect(outcome.originalError.message).toBe('Step 2 failed');
      }
    });

    test('compensates in reverse order', async () => {
      interface Context {
        actions: string[];
      }

      const step1: SagaStep<Context, void> = createStep(
        'step1',
        async (ctx) => {
          ctx.actions.push('step1-execute');
          return ok(undefined);
        },
        async (ctx) => {
          ctx.actions.push('step1-compensate');
          return ok(undefined);
        }
      );

      const step2: SagaStep<Context, void> = createStep(
        'step2',
        async (ctx) => {
          ctx.actions.push('step2-execute');
          return ok(undefined);
        },
        async (ctx) => {
          ctx.actions.push('step2-compensate');
          return ok(undefined);
        }
      );

      const step3: SagaStep<Context, void> = createStep(
        'step3',
        async () => {
          return err(new Error('Step 3 failed'));
        },
        async () => ok(undefined)
      );

      const saga: Saga<Context, string[]> = {
        name: 'test-saga',
        initialContext: { actions: [] },
        steps: [step1, step2, step3],
        finalizer: (ctx) => ctx.actions,
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('compensated');

      // Check compensation order (should be reverse)
      const ctx = saga.initialContext;
      expect(ctx.actions).toEqual([
        'step1-execute',
        'step2-execute',
        'step2-compensate', // Reverse order
        'step1-compensate',
      ]);
    });

    test('reports compensation failure', async () => {
      interface Context {
        actions: string[];
      }

      const step1: SagaStep<Context, void> = createStep(
        'step1',
        async (ctx) => {
          ctx.actions.push('step1-execute');
          return ok(undefined);
        },
        async () => {
          return err(new Error('Compensation failed'));
        }
      );

      const step2: SagaStep<Context, void> = createStep(
        'step2',
        async () => {
          return err(new Error('Step 2 failed'));
        },
        async () => ok(undefined)
      );

      const saga: Saga<Context, string[]> = {
        name: 'test-saga',
        initialContext: { actions: [] },
        steps: [step1, step2],
        finalizer: (ctx) => ctx.actions,
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('compensation_failed');
      if (outcome.type === 'compensation_failed') {
        expect(outcome.originalError.message).toBe('Step 2 failed');
        expect(outcome.compensationError.message).toContain('Compensation failed');
        expect(outcome.failedStep).toBe('step2');
      }
    });

    test('passes step result to compensation', async () => {
      interface Context {
        resourceId?: string;
      }

      let compensatedResourceId: string | undefined;

      const step1: SagaStep<Context, string> = createStep(
        'allocate-resource',
        async (ctx) => {
          const id = 'resource-123';
          ctx.resourceId = id;
          return ok(id);
        },
        async (_ctx, result) => {
          if (result.isSome()) {
            compensatedResourceId = result.value;
          }
          return ok(undefined);
        }
      );

      const step2: SagaStep<Context, void> = createStep(
        'fail-step',
        async () => err(new Error('Failed')),
        async () => ok(undefined)
      );

      const saga: Saga<Context, void> = {
        name: 'test-saga',
        initialContext: {},
        steps: [step1, step2],
        finalizer: () => undefined,
      };

      await executeSaga(saga);

      expect(compensatedResourceId).toBe('resource-123');
    });
  });

  describe('Saga Builder', () => {
    test('builds saga with fluent API', () => {
      interface Context {
        value: number;
      }

      const step1 = createIdempotentStep<Context, number>(
        'step1',
        async () => ok(1)
      );

      const saga = createSagaBuilder<Context>('my-saga')
        .withInitialContext({ value: 0 })
        .addStep(step1)
        .finalize((ctx) => ctx.value)
        .build();

      expect(saga.name).toBe('my-saga');
      expect(saga.initialContext.value).toBe(0);
      expect(saga.steps).toHaveLength(1);
    });

    test('throws error if context not set', () => {
      interface Context {
        value: number;
      }

      expect(() => {
        createSagaBuilder<Context>('my-saga')
          .finalize((ctx) => ctx.value)
          .build();
      }).toThrow('Initial context must be set');
    });

    test('allows adding multiple steps', () => {
      interface Context {
        values: number[];
      }

      const step1 = createIdempotentStep<Context, void>(
        'step1',
        async () => ok(undefined)
      );

      const step2 = createIdempotentStep<Context, void>(
        'step2',
        async () => ok(undefined)
      );

      const saga = createSagaBuilder<Context>('my-saga')
        .withInitialContext({ values: [] })
        .addStep(step1)
        .addStep(step2)
        .finalize((ctx) => ctx.values)
        .build();

      expect(saga.steps).toHaveLength(2);
      expect(saga.steps[0]?.name).toBe('step1');
      expect(saga.steps[1]?.name).toBe('step2');
    });
  });

  describe('Step Helpers', () => {
    test('createStep creates a step with compensation', () => {
      interface Context {
        value: number;
      }

      const step = createStep<Context, number>(
        'my-step',
        async (ctx) => ok(ctx.value + 1),
        async () => ok(undefined)
      );

      expect(step.name).toBe('my-step');
      expect(step.execute).toBeFunction();
      expect(step.compensate).toBeFunction();
    });

    test('createIdempotentStep creates step with no-op compensation', async () => {
      interface Context {
        value: number;
      }

      const step = createIdempotentStep<Context, number>(
        'read-step',
        async (ctx) => ok(ctx.value)
      );

      const compensationResult = await step.compensate({ value: 0 }, none());
      expect(compensationResult.isOk()).toBe(true);
    });
  });

  describe('Real-World Example: Travel Booking', () => {
    interface BookingContext {
      userId: string;
      flightId?: string;
      hotelId?: string;
      paymentId?: string;
      bookingId?: string;
    }

    // Simulate external services
    const flightService = {
      reserve: async (userId: string) => {
        return userId === 'user-fail-flight'
          ? err(new Error('No flights available'))
          : ok('flight-123');
      },
      cancel: async (flightId: string) => {
        return ok(undefined);
      },
    };

    const hotelService = {
      reserve: async (userId: string) => {
        return userId === 'user-fail-hotel'
          ? err(new Error('No hotels available'))
          : ok('hotel-456');
      },
      cancel: async (hotelId: string) => {
        return ok(undefined);
      },
    };

    const paymentService = {
      charge: async (userId: string, amount: number) => {
        return userId === 'user-fail-payment'
          ? err(new Error('Payment declined'))
          : ok('payment-789');
      },
      refund: async (paymentId: string) => {
        return ok(undefined);
      },
    };

    const reserveFlightStep: SagaStep<BookingContext, string> = createStep(
      'reserve-flight',
      async (ctx) => {
        const result = await flightService.reserve(ctx.userId);
        if (result.isOk()) {
          ctx.flightId = result.value;
        }
        return result;
      },
      async (ctx, result) => {
        if (result.isSome()) {
          return await flightService.cancel(result.value);
        }
        return ok(undefined);
      }
    );

    const reserveHotelStep: SagaStep<BookingContext, string> = createStep(
      'reserve-hotel',
      async (ctx) => {
        const result = await hotelService.reserve(ctx.userId);
        if (result.isOk()) {
          ctx.hotelId = result.value;
        }
        return result;
      },
      async (ctx, result) => {
        if (result.isSome()) {
          return await hotelService.cancel(result.value);
        }
        return ok(undefined);
      }
    );

    const chargePaymentStep: SagaStep<BookingContext, string> = createStep(
      'charge-payment',
      async (ctx) => {
        const result = await paymentService.charge(ctx.userId, 500);
        if (result.isOk()) {
          ctx.paymentId = result.value;
        }
        return result;
      },
      async (ctx, result) => {
        if (result.isSome()) {
          return await paymentService.refund(result.value);
        }
        return ok(undefined);
      }
    );

    test('successfully books a trip', async () => {
      const saga: Saga<BookingContext, string> = {
        name: 'book-trip',
        initialContext: { userId: 'user-123' },
        steps: [reserveFlightStep, reserveHotelStep, chargePaymentStep],
        finalizer: (ctx) => {
          ctx.bookingId = `booking-${ctx.flightId}-${ctx.hotelId}`;
          return ctx.bookingId;
        },
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('success');
      if (outcome.type === 'success') {
        expect(outcome.result).toBe('booking-flight-123-hotel-456');
      }
    });

    test('compensates when flight reservation fails', async () => {
      const saga: Saga<BookingContext, string> = {
        name: 'book-trip',
        initialContext: { userId: 'user-fail-flight' },
        steps: [reserveFlightStep, reserveHotelStep, chargePaymentStep],
        finalizer: (ctx) => ctx.bookingId || '',
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('compensated');
      if (outcome.type === 'compensated') {
        expect(outcome.failedStep).toBe('reserve-flight');
        expect(outcome.originalError.message).toBe('No flights available');
      }
    });

    test('compensates when hotel reservation fails', async () => {
      const saga: Saga<BookingContext, string> = {
        name: 'book-trip',
        initialContext: { userId: 'user-fail-hotel' },
        steps: [reserveFlightStep, reserveHotelStep, chargePaymentStep],
        finalizer: (ctx) => ctx.bookingId || '',
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('compensated');
      if (outcome.type === 'compensated') {
        expect(outcome.failedStep).toBe('reserve-hotel');
        // Flight should have been cancelled
        expect(saga.initialContext.flightId).toBe('flight-123');
      }
    });

    test('compensates when payment fails', async () => {
      const saga: Saga<BookingContext, string> = {
        name: 'book-trip',
        initialContext: { userId: 'user-fail-payment' },
        steps: [reserveFlightStep, reserveHotelStep, chargePaymentStep],
        finalizer: (ctx) => ctx.bookingId || '',
      };

      const outcome = await executeSaga(saga);

      expect(outcome.type).toBe('compensated');
      if (outcome.type === 'compensated') {
        expect(outcome.failedStep).toBe('charge-payment');
        // Both flight and hotel should have been reserved (and then cancelled)
        expect(saga.initialContext.flightId).toBe('flight-123');
        expect(saga.initialContext.hotelId).toBe('hotel-456');
      }
    });
  });
});
