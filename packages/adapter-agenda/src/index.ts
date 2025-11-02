/**
 * Agenda Adapter for ServiceJS
 *
 * Provides MongoDB-based job scheduling functionality with:
 * - Recurring jobs with cron-like syntax
 * - Job priorities
 * - Human-readable intervals
 * - Job concurrency control
 * - Job status tracking
 */

import { Result, ok, err } from '@servicejs/result';

/**
 * Job definition
 */
export interface JobDefinition {
  name: string;
  schedule?: string; // Cron syntax or human-readable interval
  data?: any;
  priority?: 'highest' | 'high' | 'normal' | 'low' | 'lowest';
  concurrency?: number;
  nextRunAt?: Date;
}

/**
 * Job instance with runtime info
 */
export interface JobInstance extends JobDefinition {
  id: string;
  lastRunAt?: Date;
  lastFinishedAt?: Date;
  nextRunAt?: Date;
  failCount: number;
  failReason?: string;
  lockedAt?: Date;
}

/**
 * Job processor function
 */
export type JobProcessor<T = any> = (job: JobInstance) => Promise<void | Result<void, Error>>;

/**
 * Configuration for Agenda adapter
 */
export interface AgendaConfig {
  mongodb: {
    url: string;
    collection?: string;
    options?: {
      useUnifiedTopology?: boolean;
      useNewUrlParser?: boolean;
    };
  };
  defaultConcurrency?: number;
  maxConcurrency?: number;
  lockLimit?: number;
  defaultLockLifetime?: number; // milliseconds
  processEvery?: string; // How often to check for jobs (e.g., '5 seconds')
}

/**
 * Agenda adapter interface
 */
export interface AgendaAdapter {
  init(config: AgendaConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  // Job definition
  define(name: string, processor: JobProcessor, options?: {
    priority?: JobDefinition['priority'];
    concurrency?: number;
  }): Promise<Result<void, Error>>;

  // Schedule jobs
  schedule(when: string | Date, name: string, data?: any): Promise<Result<JobInstance, Error>>;
  scheduleEvery(interval: string, name: string, data?: any): Promise<Result<JobInstance, Error>>;
  now(name: string, data?: any): Promise<Result<JobInstance, Error>>;

  // Job management
  cancel(query: { name?: string; [key: string]: any }): Promise<Result<number, Error>>;
  getJobs(query: { name?: string; [key: string]: any }): Promise<Result<JobInstance[], Error>>;

  // Control
  pause(): Promise<Result<void, Error>>;
  resume(): Promise<Result<void, Error>>;
}

/**
 * Create an Agenda adapter
 *
 * Note: This is a mock implementation for demonstration.
 * In production, this would integrate with the actual Agenda library.
 */
export function createAgendaAdapter(): AgendaAdapter {
  let config: AgendaConfig | null = null;
  let isRunning = false;
  let isPaused = false;

  // Mock in-memory storage
  const jobDefinitions = new Map<string, { processor: JobProcessor; options?: any }>();
  const scheduledJobs = new Map<string, JobInstance>();
  let jobIdCounter = 0;
  let processInterval: Timer | null = null;

  async function processJobs() {
    if (isPaused || !isRunning) return;

    const now = new Date();

    for (const [jobId, job] of scheduledJobs.entries()) {
      if (job.nextRunAt && job.nextRunAt <= now && !job.lockedAt) {
        const definition = jobDefinitions.get(job.name);
        if (definition) {
          // Lock job
          job.lockedAt = now;
          job.lastRunAt = now;

          try {
            await definition.processor(job);
            job.lastFinishedAt = new Date();
            job.lockedAt = undefined;

            // Reschedule if recurring
            if (job.schedule) {
              job.nextRunAt = calculateNextRunTime(job.schedule, new Date());
            } else {
              // One-time job, remove after completion
              scheduledJobs.delete(jobId);
            }
          } catch (error) {
            job.failCount++;
            job.failReason = error instanceof Error ? error.message : String(error);
            job.lockedAt = undefined;

            // Retry after some time
            job.nextRunAt = new Date(Date.now() + 60000); // Retry after 1 minute
          }
        }
      }
    }
  }

  function calculateNextRunTime(schedule: string, from: Date): Date {
    // Mock: Simple interval parsing
    const intervalMap: Record<string, number> = {
      'every minute': 60000,
      'every 5 minutes': 300000,
      'every hour': 3600000,
      'every day': 86400000,
    };

    const interval = intervalMap[schedule.toLowerCase()] || 60000;
    return new Date(from.getTime() + interval);
  }

  function parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)\s+(\w+)$/);
    if (!match) return 60000; // Default to 1 minute

    const [, amount, unit] = match;
    const multipliers: Record<string, number> = {
      second: 1000,
      seconds: 1000,
      minute: 60000,
      minutes: 60000,
      hour: 3600000,
      hours: 3600000,
      day: 86400000,
      days: 86400000,
    };

    return parseInt(amount) * (multipliers[unit] || 60000);
  }

  return {
    async init(cfg: AgendaConfig): Promise<Result<void, Error>> {
      if (!cfg.mongodb.url) {
        return err(new Error('MongoDB URL is required'));
      }

      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      isRunning = true;

      // Start processing jobs
      const processEvery = parseInterval(config.processEvery || '5 seconds');
      processInterval = setInterval(() => {
        processJobs().catch(console.error);
      }, processEvery);

      return ok(undefined);
    },

    async stop(): Promise<Result<void, Error>> {
      isRunning = false;

      if (processInterval) {
        clearInterval(processInterval);
        processInterval = null;
      }

      return ok(undefined);
    },

    async destroy(): Promise<Result<void, Error>> {
      isRunning = false;

      if (processInterval) {
        clearInterval(processInterval);
        processInterval = null;
      }

      config = null;
      jobDefinitions.clear();
      scheduledJobs.clear();

      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(config !== null && isRunning);
    },

    async define(
      name: string,
      processor: JobProcessor,
      options?: { priority?: JobDefinition['priority']; concurrency?: number }
    ): Promise<Result<void, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      jobDefinitions.set(name, { processor, options });
      return ok(undefined);
    },

    async schedule(when: string | Date, name: string, data?: any): Promise<Result<JobInstance, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      if (!jobDefinitions.has(name)) {
        return err(new Error(`Job '${name}' not defined`));
      }

      const jobId = `job_${++jobIdCounter}`;
      const nextRunAt = typeof when === 'string' ? calculateNextRunTime(when, new Date()) : when;

      const job: JobInstance = {
        id: jobId,
        name,
        data,
        nextRunAt,
        failCount: 0,
      };

      scheduledJobs.set(jobId, job);
      return ok(job);
    },

    async scheduleEvery(interval: string, name: string, data?: any): Promise<Result<JobInstance, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      if (!jobDefinitions.has(name)) {
        return err(new Error(`Job '${name}' not defined`));
      }

      const jobId = `job_${++jobIdCounter}`;
      const nextRunAt = calculateNextRunTime(interval, new Date());

      const job: JobInstance = {
        id: jobId,
        name,
        data,
        schedule: interval,
        nextRunAt,
        failCount: 0,
      };

      scheduledJobs.set(jobId, job);
      return ok(job);
    },

    async now(name: string, data?: any): Promise<Result<JobInstance, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      if (!jobDefinitions.has(name)) {
        return err(new Error(`Job '${name}' not defined`));
      }

      const jobId = `job_${++jobIdCounter}`;

      const job: JobInstance = {
        id: jobId,
        name,
        data,
        nextRunAt: new Date(),
        failCount: 0,
      };

      scheduledJobs.set(jobId, job);
      return ok(job);
    },

    async cancel(query: { name?: string; [key: string]: any }): Promise<Result<number, Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      let cancelled = 0;

      for (const [jobId, job] of scheduledJobs.entries()) {
        let matches = true;

        if (query.name && job.name !== query.name) {
          matches = false;
        }

        if (matches) {
          scheduledJobs.delete(jobId);
          cancelled++;
        }
      }

      return ok(cancelled);
    },

    async getJobs(query: { name?: string; [key: string]: any }): Promise<Result<JobInstance[], Error>> {
      if (!config || !isRunning) {
        return err(new Error('Adapter not initialized or not running'));
      }

      const jobs: JobInstance[] = [];

      for (const job of scheduledJobs.values()) {
        let matches = true;

        if (query.name && job.name !== query.name) {
          matches = false;
        }

        if (matches) {
          jobs.push(job);
        }
      }

      return ok(jobs);
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
  };
}
