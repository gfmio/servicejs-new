/**
 * Temporal Adapter for ServiceJS
 *
 * Provides workflow orchestration with:
 * - Durable execution
 * - Workflow and activity definitions
 * - Compensation logic (Saga pattern)
 * - Long-running workflows
 * - Workflow state persistence
 */

import { Result, ok, err } from '@servicejs/result';

/**
 * Workflow status
 */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'compensating' | 'compensated';

/**
 * Activity definition
 */
export interface Activity<TInput = any, TOutput = any> {
  name: string;
  execute: (input: TInput) => Promise<TOutput>;
  compensate?: (input: TInput, output?: TOutput) => Promise<void>;
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  activity: string;
  input: any;
  output?: any;
  status: 'pending' | 'completed' | 'failed' | 'compensated';
  error?: string;
  completedAt?: Date;
}

/**
 * Workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  input: any;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult<T = any> {
  workflowId: string;
  status: WorkflowStatus;
  result?: T;
  error?: string;
}

/**
 * Configuration for Temporal adapter
 */
export interface TemporalConfig {
  namespace?: string;
  taskQueue?: string;
  serverUrl?: string;
  workflowTimeout?: number; // milliseconds
  activityTimeout?: number; // milliseconds
}

/**
 * Temporal adapter interface
 */
export interface TemporalAdapter {
  init(config: TemporalConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  // Activity management
  registerActivity<TInput, TOutput>(activity: Activity<TInput, TOutput>): Promise<Result<void, Error>>;

  // Workflow execution
  startWorkflow(name: string, input: any): Promise<Result<string, Error>>;
  getWorkflow(workflowId: string): Promise<Result<Workflow | null, Error>>;
  cancelWorkflow(workflowId: string): Promise<Result<void, Error>>;

  // Workflow definition (simplified)
  executeWorkflow<T>(name: string, input: any, steps: Array<{
    activity: string;
    input: any | ((prevResult: any) => any);
  }>): Promise<Result<WorkflowResult<T>, Error>>;
}

/**
 * Create a Temporal adapter
 *
 * Note: This is a mock implementation for demonstration.
 * In production, this would integrate with the actual Temporal.io platform.
 */
export function createTemporalAdapter(): TemporalAdapter {
  let config: TemporalConfig | null = null;
  let isRunning = false;

  // Mock in-memory storage
  const activities = new Map<string, Activity>();
  const workflows = new Map<string, Workflow>();
  let workflowIdCounter = 0;

  async function executeActivity<TInput, TOutput>(
    name: string,
    input: TInput
  ): Promise<Result<TOutput, Error>> {
    const activity = activities.get(name);
    if (!activity) {
      return err(new Error(`Activity '${name}' not registered`));
    }

    try {
      const result = await activity.execute(input);
      return ok(result as TOutput);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async function compensateActivity(name: string, input: any, output?: any): Promise<void> {
    const activity = activities.get(name);
    if (activity?.compensate) {
      await activity.compensate(input, output);
    }
  }

  async function runWorkflow(workflow: Workflow, steps: Array<{
    activity: string;
    input: any | ((prevResult: any) => any);
  }>): Promise<void> {
    workflow.status = 'running';
    workflow.updatedAt = new Date();

    let prevResult: any = workflow.input;

    try {
      for (const stepDef of steps) {
        const input = typeof stepDef.input === 'function'
          ? stepDef.input(prevResult)
          : stepDef.input;

        const step: WorkflowStep = {
          activity: stepDef.activity,
          input,
          status: 'pending',
        };

        workflow.steps.push(step);

        // Execute activity
        const result = await executeActivity(stepDef.activity, input);

        if (!result.ok) {
          // Activity failed - compensate previous steps
          step.status = 'failed';
          step.error = result.error.message;
          workflow.status = 'compensating';
          workflow.error = result.error.message;
          workflow.updatedAt = new Date();

          // Compensate in reverse order
          for (let i = workflow.steps.length - 2; i >= 0; i--) {
            const prevStep = workflow.steps[i];
            if (prevStep.status === 'completed') {
              await compensateActivity(prevStep.activity, prevStep.input, prevStep.output);
              prevStep.status = 'compensated';
            }
          }

          workflow.status = 'failed';
          workflow.completedAt = new Date();
          workflow.updatedAt = new Date();
          return;
        }

        // Activity succeeded
        step.output = result.value;
        step.status = 'completed';
        step.completedAt = new Date();
        prevResult = result.value;
      }

      // All steps completed successfully
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      workflow.updatedAt = new Date();
    } catch (error) {
      workflow.status = 'failed';
      workflow.error = error instanceof Error ? error.message : String(error);
      workflow.completedAt = new Date();
      workflow.updatedAt = new Date();
    }
  }

  return {
    async init(cfg: TemporalConfig): Promise<Result<void, Error>> {
      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      isRunning = true;
      return ok(undefined);
    },

    async stop(): Promise<Result<void, Error>> {
      isRunning = false;
      return ok(undefined);
    },

    async destroy(): Promise<Result<void, Error>> {
      isRunning = false;
      config = null;
      activities.clear();
      workflows.clear();
      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(config !== null && isRunning);
    },

    async registerActivity<TInput, TOutput>(
      activity: Activity<TInput, TOutput>
    ): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      activities.set(activity.name, activity);
      return ok(undefined);
    },

    async startWorkflow(name: string, input: any): Promise<Result<string, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const workflowId = `wf_${++workflowIdCounter}`;
      const workflow: Workflow = {
        id: workflowId,
        name,
        input,
        steps: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      workflows.set(workflowId, workflow);
      return ok(workflowId);
    },

    async getWorkflow(workflowId: string): Promise<Result<Workflow | null, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const workflow = workflows.get(workflowId);
      return ok(workflow || null);
    },

    async cancelWorkflow(workflowId: string): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const workflow = workflows.get(workflowId);
      if (!workflow) {
        return err(new Error(`Workflow '${workflowId}' not found`));
      }

      if (workflow.status === 'running') {
        workflow.status = 'cancelled';
        workflow.updatedAt = new Date();
        workflow.completedAt = new Date();
      }

      return ok(undefined);
    },

    async executeWorkflow<T>(
      name: string,
      input: any,
      steps: Array<{ activity: string; input: any | ((prevResult: any) => any) }>
    ): Promise<Result<WorkflowResult<T>, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const workflowId = `wf_${++workflowIdCounter}`;
      const workflow: Workflow = {
        id: workflowId,
        name,
        input,
        steps: [],
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      workflows.set(workflowId, workflow);

      // Execute workflow asynchronously
      setImmediate(() => {
        runWorkflow(workflow, steps).catch((error) => {
          workflow.status = 'failed';
          workflow.error = error instanceof Error ? error.message : String(error);
          workflow.updatedAt = new Date();
        });
      });

      // Wait for workflow to complete (mock)
      await new Promise(resolve => setTimeout(resolve, 100));

      const result: WorkflowResult<T> = {
        workflowId,
        status: workflow.status,
        result: workflow.steps[workflow.steps.length - 1]?.output as T,
        error: workflow.error,
      };

      return ok(result);
    },
  };
}
