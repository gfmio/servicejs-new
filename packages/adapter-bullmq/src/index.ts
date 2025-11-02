/**
 * BullMQ Adapter for ServiceJS
 *
 * Provides Redis-based job queue functionality with:
 * - Job priorities
 * - Delayed jobs
 * - Job retries
 * - Rate limiting
 * - Job progress tracking
 */

import { Result, ok, err } from '@servicejs/result';

/**
 * Job data structure
 */
export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: number;
}

/**
 * Job result after processing
 */
export interface JobResult<T = any> {
  jobId: string;
  result: T;
  completedAt: Date;
}

/**
 * Job progress information
 */
export interface JobProgress {
  jobId: string;
  progress: number; // 0-100
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  attempts: number;
  failedReason?: string;
}

/**
 * Job processor function
 */
export type JobProcessor<T = any, R = any> = (job: Job<T>) => Promise<R>;

/**
 * Configuration for BullMQ adapter
 */
export interface BullMQConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queueName: string;
  defaultJobOptions?: {
    priority?: number;
    delay?: number;
    attempts?: number;
    backoff?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  };
  rateLimiter?: {
    max: number;
    duration: number; // milliseconds
  };
}

/**
 * BullMQ adapter interface
 */
export interface BullMQAdapter {
  init(config: BullMQConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  // Job operations
  addJob<T>(name: string, data: T, options?: Partial<Job<T>>): Promise<Result<Job<T>, Error>>;
  getJob(jobId: string): Promise<Result<Job | null, Error>>;
  removeJob(jobId: string): Promise<Result<void, Error>>;

  // Job processing
  process<T, R>(name: string, processor: JobProcessor<T, R>): Promise<Result<void, Error>>;

  // Job monitoring
  getJobProgress(jobId: string): Promise<Result<JobProgress, Error>>;
  getJobCounts(): Promise<Result<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }, Error>>;

  // Queue management
  pause(): Promise<Result<void, Error>>;
  resume(): Promise<Result<void, Error>>;
  clean(grace: number, status: 'completed' | 'failed'): Promise<Result<number, Error>>;
}

/**
 * Create a BullMQ adapter
 *
 * Note: This is a mock implementation for demonstration.
 * In production, this would integrate with the actual BullMQ library.
 */
export function createBullMQAdapter(): BullMQAdapter {
  let config: BullMQConfig | null = null;
  let isRunning = false;
  let isPaused = false;

  // Mock in-memory storage
  const jobs = new Map<string, Job & { status: JobProgress['status']; result?: any; error?: string }>();
  const processors = new Map<string, JobProcessor>();
  let jobIdCounter = 0;

  return {
    async init(cfg: BullMQConfig): Promise<Result<void, Error>> {
      if (!cfg.redis.host || !cfg.queueName) {
        return err(new Error('Redis host and queue name are required'));
      }

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
      jobs.clear();
      processors.clear();
      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(config !== null && isRunning);
    },

    async addJob<T>(name: string, data: T, options?: Partial<Job<T>>): Promise<Result<Job<T>, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const jobId = `job_${++jobIdCounter}`;
      const job: Job<T> = {
        id: jobId,
        name,
        data,
        priority: options?.priority ?? config.defaultJobOptions?.priority ?? 0,
        delay: options?.delay ?? config.defaultJobOptions?.delay ?? 0,
        attempts: options?.attempts ?? config.defaultJobOptions?.attempts ?? 3,
        backoff: options?.backoff ?? config.defaultJobOptions?.backoff ?? 1000,
      };

      const status = job.delay && job.delay > 0 ? 'delayed' : 'waiting';
      jobs.set(jobId, { ...job, status });

      // Mock: Simulate job processing after delay
      if (job.delay && job.delay > 0) {
        setTimeout(() => {
          const storedJob = jobs.get(jobId);
          if (storedJob && storedJob.status === 'delayed') {
            storedJob.status = 'waiting';
          }
        }, job.delay);
      }

      return ok(job);
    },

    async getJob(jobId: string): Promise<Result<Job | null, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const job = jobs.get(jobId);
      if (!job) {
        return ok(null);
      }

      const { status, result, error, ...jobData } = job;
      return ok(jobData);
    },

    async removeJob(jobId: string): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      jobs.delete(jobId);
      return ok(undefined);
    },

    async process<T, R>(name: string, processor: JobProcessor<T, R>): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      processors.set(name, processor);

      // Mock: Process waiting jobs
      setImmediate(async () => {
        for (const [jobId, job] of jobs.entries()) {
          if (job.name === name && job.status === 'waiting' && !isPaused) {
            job.status = 'active';

            try {
              const result = await processor(job);
              job.status = 'completed';
              job.result = result;
            } catch (error) {
              job.status = 'failed';
              job.error = error instanceof Error ? error.message : String(error);
            }
          }
        }
      });

      return ok(undefined);
    },

    async getJobProgress(jobId: string): Promise<Result<JobProgress, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const job = jobs.get(jobId);
      if (!job) {
        return err(new Error(`Job ${jobId} not found`));
      }

      const progress: JobProgress = {
        jobId,
        progress: job.status === 'completed' ? 100 : job.status === 'active' ? 50 : 0,
        status: job.status,
        attempts: job.attempts ?? 0,
        failedReason: job.error,
      };

      return ok(progress);
    },

    async getJobCounts(): Promise<Result<{
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const counts = {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };

      for (const job of jobs.values()) {
        counts[job.status]++;
      }

      return ok(counts);
    },

    async pause(): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      isPaused = true;
      return ok(undefined);
    },

    async resume(): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      isPaused = false;
      return ok(undefined);
    },

    async clean(grace: number, status: 'completed' | 'failed'): Promise<Result<number, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      let cleaned = 0;
      const now = Date.now();

      for (const [jobId, job] of jobs.entries()) {
        if (job.status === status) {
          // Mock: Remove jobs older than grace period
          jobs.delete(jobId);
          cleaned++;
        }
      }

      return ok(cleaned);
    },
  };
}
