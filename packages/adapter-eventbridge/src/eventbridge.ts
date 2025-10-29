/**
 * AWS EventBridge Event Bus Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import {
  EventBridgeClient,
  PutEventsCommand,
  PutRuleCommand,
  PutTargetsCommand,
  DeleteRuleCommand,
  RemoveTargetsCommand,
  ListRulesCommand,
  DescribeEventBusCommand,
  type PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';

export interface EventBridgeConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  eventBusName?: string; // Default: 'default'
}

export interface EventEntry {
  source: string;
  detailType: string;
  detail: Record<string, any>;
  resources?: string[];
}

export interface EventRule {
  name: string;
  eventPattern: Record<string, any>;
  description?: string;
  state?: 'ENABLED' | 'DISABLED';
}

export interface EventTarget {
  id: string;
  arn: string;
  roleArn?: string;
}

export interface EventBridgeAdapter {
  init(config: EventBridgeConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Event operations
  putEvents(events: EventEntry[]): Promise<Result<{ failedEntryCount: number; entries: Array<{ eventId?: string; errorCode?: string; errorMessage?: string }> }, Error>>;

  // Rule management
  putRule(rule: EventRule): Promise<Result<{ ruleArn: string }, Error>>;
  deleteRule(ruleName: string): Promise<Result<void, Error>>;
  listRules(): Promise<Result<Array<{ name: string; arn: string; state: string; description?: string }>, Error>>;

  // Target management
  putTargets(ruleName: string, targets: EventTarget[]): Promise<Result<{ failedEntryCount: number }, Error>>;
  removeTargets(ruleName: string, targetIds: string[]): Promise<Result<{ failedEntryCount: number }, Error>>;

  // Event bus info
  describeEventBus(): Promise<Result<{ name: string; arn: string; policy?: string }, Error>>;
}

export const createEventBridgeAdapter = (): EventBridgeAdapter => {
  let client: EventBridgeClient | null = null;
  let eventBusName = 'default';

  return {
    init: async (config: EventBridgeConfig): Promise<Result<void, Error>> => {
      try {
        client = new EventBridgeClient({
          region: config.region,
          credentials: config.credentials,
          endpoint: config.endpoint,
        });

        if (config.eventBusName) {
          eventBusName = config.eventBusName;
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        client.destroy();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('EventBridge not initialized') });
      }

      try {
        // Test connection by describing the event bus
        await client.send(new DescribeEventBusCommand({ Name: eventBusName }));
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    putEvents: async (events: EventEntry[]): Promise<Result<{ failedEntryCount: number; entries: Array<{ eventId?: string; errorCode?: string; errorMessage?: string }> }, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        const entries: PutEventsRequestEntry[] = events.map(event => ({
          Source: event.source,
          DetailType: event.detailType,
          Detail: JSON.stringify(event.detail),
          Resources: event.resources,
          EventBusName: eventBusName,
        }));

        const response = await client.send(
          new PutEventsCommand({
            Entries: entries,
          })
        );

        return ok({
          failedEntryCount: response.FailedEntryCount || 0,
          entries: (response.Entries || []).map(entry => ({
            eventId: entry.EventId,
            errorCode: entry.ErrorCode,
            errorMessage: entry.ErrorMessage,
          })),
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    putRule: async (rule: EventRule): Promise<Result<{ ruleArn: string }, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        const response = await client.send(
          new PutRuleCommand({
            Name: rule.name,
            EventPattern: JSON.stringify(rule.eventPattern),
            Description: rule.description,
            State: rule.state || 'ENABLED',
            EventBusName: eventBusName,
          })
        );

        return ok({ ruleArn: response.RuleArn || '' });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteRule: async (ruleName: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        // Must remove all targets before deleting rule
        await client.send(
          new DeleteRuleCommand({
            Name: ruleName,
            EventBusName: eventBusName,
          })
        );

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listRules: async (): Promise<Result<Array<{ name: string; arn: string; state: string; description?: string }>, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        const response = await client.send(
          new ListRulesCommand({
            EventBusName: eventBusName,
          })
        );

        const rules = (response.Rules || []).map(rule => ({
          name: rule.Name || '',
          arn: rule.Arn || '',
          state: rule.State || 'UNKNOWN',
          description: rule.Description,
        }));

        return ok(rules);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    putTargets: async (ruleName: string, targets: EventTarget[]): Promise<Result<{ failedEntryCount: number }, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        const response = await client.send(
          new PutTargetsCommand({
            Rule: ruleName,
            EventBusName: eventBusName,
            Targets: targets.map(target => ({
              Id: target.id,
              Arn: target.arn,
              RoleArn: target.roleArn,
            })),
          })
        );

        return ok({ failedEntryCount: response.FailedEntryCount || 0 });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    removeTargets: async (ruleName: string, targetIds: string[]): Promise<Result<{ failedEntryCount: number }, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        const response = await client.send(
          new RemoveTargetsCommand({
            Rule: ruleName,
            EventBusName: eventBusName,
            Ids: targetIds,
          })
        );

        return ok({ failedEntryCount: response.FailedEntryCount || 0 });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    describeEventBus: async (): Promise<Result<{ name: string; arn: string; policy?: string }, Error>> => {
      if (!client) {
        return err(new Error('EventBridge not initialized'));
      }

      try {
        const response = await client.send(
          new DescribeEventBusCommand({
            Name: eventBusName,
          })
        );

        return ok({
          name: response.Name || '',
          arn: response.Arn || '',
          policy: response.Policy,
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
