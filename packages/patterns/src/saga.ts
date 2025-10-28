/**
 * Saga Pattern Implementation
 *
 * A saga is a sequence of local transactions where each transaction updates data within a
 * single service. If a step fails, the saga executes compensating transactions to undo
 * the changes made by preceding steps.
 *
 * This implementation provides:
 * - Sequential step execution
 * - Automatic compensation on failure
 * - State tracking throughout the saga
 * - Type-safe step definitions
 */

import { type Result, ok, err, isOk, isErr } from '@servicejs/result';
import { type Option, some, none } from '@servicejs/option';

// ============================================================================
// Types
// ============================================================================

/**
 * A saga step that can be executed and compensated
 *
 * @template TContext - The context shared across all steps
 * @template TResult - The result type of this step
 */
export interface SagaStep<TContext, TResult> {
  /** Name of the step for debugging/logging */
  name: string;

  /**
   * Execute the step
   * @param context - The current saga context
   * @returns Result with step output or error
   */
  execute: (context: TContext) => Promise<Result<TResult, Error>>;

  /**
   * Compensate for this step (undo its effects)
   * @param context - The current saga context
   * @param result - The result from the execute call (if successful)
   * @returns Result indicating compensation success/failure
   */
  compensate: (context: TContext, result: Option<TResult>) => Promise<Result<void, Error>>;
}

/**
 * The outcome of executing a saga
 */
export type SagaOutcome<T> =
  | { type: 'success'; result: T }
  | { type: 'failed'; error: Error; failedStep: string }
  | { type: 'compensated'; originalError: Error; failedStep: string }
  | { type: 'compensation_failed'; originalError: Error; compensationError: Error; failedStep: string };

/**
 * Status of a saga execution
 */
export type SagaStatus =
  | 'pending'
  | 'executing'
  | 'compensating'
  | 'success'
  | 'failed'
  | 'compensated'
  | 'compensation_failed';

/**
 * Saga execution state
 */
export interface SagaState<TContext> {
  /** Current status */
  status: SagaStatus;

  /** The saga context */
  context: TContext;

  /** Steps that have been completed (in order) */
  completedSteps: Array<{ name: string; result: unknown }>;

  /** Current step being executed */
  currentStep: Option<string>;

  /** Error that occurred (if any) */
  error: Option<Error>;
}

/**
 * A saga definition
 */
export interface Saga<TContext, TResult> {
  /** Name of the saga */
  name: string;

  /** Initial context */
  initialContext: TContext;

  /** Steps to execute */
  steps: Array<SagaStep<TContext, unknown>>;

  /** Final transformation of context to result */
  finalizer: (context: TContext) => TResult;
}

// ============================================================================
// Saga Execution
// ============================================================================

/**
 * Execute a saga
 *
 * Executes steps sequentially. If any step fails, compensates all completed steps
 * in reverse order.
 *
 * @example
 * ```typescript
 * const bookingSaga: Saga<BookingContext, Booking> = {
 *   name: 'book-trip',
 *   initialContext: { userId: '123' },
 *   steps: [
 *     reserveFlightStep,
 *     reserveHotelStep,
 *     chargePaymentStep,
 *   ],
 *   finalizer: (ctx) => ({ bookingId: ctx.bookingId }),
 * };
 *
 * const outcome = await executeSaga(bookingSaga);
 * ```
 */
export const executeSaga = async <TContext, TResult>(
  saga: Saga<TContext, TResult>
): Promise<SagaOutcome<TResult>> => {
  const state: SagaState<TContext> = {
    status: 'executing',
    context: saga.initialContext,
    completedSteps: [],
    currentStep: none(),
    error: none(),
  };

  // Execute steps sequentially
  for (const step of saga.steps) {
    state.currentStep = some(step.name);

    const result = await step.execute(state.context);

    if (isErr(result)) {
      // Step failed - compensate all completed steps
      state.status = 'compensating';
      state.error = some(result.error);

      const compensationResult = await compensateSteps(saga.steps, state.completedSteps, state.context);

      if (isOk(compensationResult)) {
        return {
          type: 'compensated',
          originalError: result.error,
          failedStep: step.name,
        };
      }

      // compensationResult must be Err at this point
      if (!isErr(compensationResult)) {
        throw new Error('Unexpected: compensationResult should be Err');
      }

      return {
        type: 'compensation_failed',
        originalError: result.error,
        compensationError: compensationResult.error,
        failedStep: step.name,
      };
    }

    // Step succeeded - result must be Ok at this point
    if (!isOk(result)) {
      // This should never happen due to the early return above
      throw new Error('Unexpected: result should be Ok');
    }

    state.completedSteps.push({
      name: step.name,
      result: result.value,
    });
  }

  // All steps succeeded
  state.status = 'success';
  const finalResult = saga.finalizer(state.context);

  return {
    type: 'success',
    result: finalResult,
  };
};

/**
 * Compensate completed steps in reverse order
 */
const compensateSteps = async <TContext>(
  steps: Array<SagaStep<TContext, unknown>>,
  completedSteps: Array<{ name: string; result: unknown }>,
  context: TContext
): Promise<Result<void, Error>> => {
  // Find steps to compensate (in reverse order)
  const stepsToCompensate = completedSteps.slice().reverse();

  for (const completed of stepsToCompensate) {
    const step = steps.find((s) => s.name === completed.name);
    if (!step) {
      return err(new Error(`Cannot find step "${completed.name}" for compensation`));
    }

    const result = await step.compensate(context, some(completed.result));

    if (isErr(result)) {
      return err(new Error(`Compensation failed for step "${step.name}": ${result.error.message}`));
    }
  }

  return ok(undefined);
};

// ============================================================================
// Saga Builder
// ============================================================================

/**
 * Builder for creating sagas with a fluent API
 *
 * @example
 * ```typescript
 * const saga = createSagaBuilder<BookingContext>('book-trip')
 *   .withInitialContext({ userId: '123' })
 *   .addStep(reserveFlightStep)
 *   .addStep(reserveHotelStep)
 *   .addStep(chargePaymentStep)
 *   .finalize((ctx) => ({ bookingId: ctx.bookingId }))
 *   .build();
 * ```
 */
export interface SagaBuilder<TContext> {
  /**
   * Set the initial context
   */
  withInitialContext(context: TContext): SagaBuilder<TContext>;

  /**
   * Add a step to the saga
   */
  addStep<TResult>(step: SagaStep<TContext, TResult>): SagaBuilder<TContext>;

  /**
   * Set the finalizer function
   */
  finalize<TResult>(finalizer: (context: TContext) => TResult): CompleteSagaBuilder<TContext, TResult>;
}

/**
 * Builder with finalize method called
 */
export interface CompleteSagaBuilder<TContext, TResult> {
  /**
   * Build the saga
   */
  build(): Saga<TContext, TResult>;
}

/**
 * Create a saga builder
 *
 * @param name - Name of the saga
 */
export const createSagaBuilder = <TContext>(name: string): SagaBuilder<TContext> => {
  let initialContext: TContext | undefined;
  const steps: Array<SagaStep<TContext, unknown>> = [];

  const builder: SagaBuilder<TContext> = {
    withInitialContext(context: TContext) {
      initialContext = context;
      return builder;
    },

    addStep<TResult>(step: SagaStep<TContext, TResult>) {
      steps.push(step as SagaStep<TContext, unknown>);
      return builder;
    },

    finalize<TResult>(finalizer: (context: TContext) => TResult): CompleteSagaBuilder<TContext, TResult> {
      return {
        build(): Saga<TContext, TResult> {
          if (initialContext === undefined) {
            throw new Error('Initial context must be set before building saga');
          }

          return {
            name,
            initialContext,
            steps,
            finalizer,
          };
        },
      };
    },
  };

  return builder;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple saga step
 *
 * @param name - Step name
 * @param execute - Execution function
 * @param compensate - Compensation function
 */
export const createStep = <TContext, TResult>(
  name: string,
  execute: (context: TContext) => Promise<Result<TResult, Error>>,
  compensate: (context: TContext, result: Option<TResult>) => Promise<Result<void, Error>>
): SagaStep<TContext, TResult> => ({
  name,
  execute,
  compensate,
});

/**
 * Create a step with no compensation (idempotent or read-only operation)
 */
export const createIdempotentStep = <TContext, TResult>(
  name: string,
  execute: (context: TContext) => Promise<Result<TResult, Error>>
): SagaStep<TContext, TResult> => ({
  name,
  execute,
  compensate: async () => ok(undefined),
});
