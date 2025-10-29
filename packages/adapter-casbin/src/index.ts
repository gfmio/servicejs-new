/**
 * Casbin Adapter for ServiceJS
 *
 * Provides authorization and access control with support for ACL, RBAC, and ABAC models.
 */

import { ok, err, type Result } from '@servicejs/result';

export interface CasbinAdapterConfig {
  /** Model definition (ACL, RBAC, ABAC, etc.) */
  model: string;

  /** Initial policy rules (optional) */
  policy?: string[][];

  /** Enable auto-save (default: false) */
  autoSave?: boolean;
}

export interface Policy {
  ptype: string;
  v0?: string;
  v1?: string;
  v2?: string;
  v3?: string;
  v4?: string;
  v5?: string;
}

export interface CasbinAdapter {
  init(config: CasbinAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  /**
   * Check if a subject can perform an action on an object
   */
  enforce(sub: string, obj: string, act: string): Promise<Result<boolean, Error>>;

  /**
   * Batch enforce multiple requests
   */
  batchEnforce(requests: Array<[string, string, string]>): Promise<Result<boolean[], Error>>;

  /**
   * Add a policy rule
   */
  addPolicy(...params: string[]): Promise<Result<boolean, Error>>;

  /**
   * Remove a policy rule
   */
  removePolicy(...params: string[]): Promise<Result<boolean, Error>>;

  /**
   * Get all policies
   */
  getPolicy(): Promise<Result<string[][], Error>>;

  /**
   * Add a role for a user (for RBAC)
   */
  addRoleForUser(user: string, role: string, domain?: string): Promise<Result<boolean, Error>>;

  /**
   * Delete a role for a user
   */
  deleteRoleForUser(user: string, role: string, domain?: string): Promise<Result<boolean, Error>>;

  /**
   * Get roles for a user
   */
  getRolesForUser(user: string, domain?: string): Promise<Result<string[], Error>>;

  /**
   * Get users for a role
   */
  getUsersForRole(role: string, domain?: string): Promise<Result<string[], Error>>;

  /**
   * Check if a user has a role
   */
  hasRoleForUser(user: string, role: string, domain?: string): Promise<Result<boolean, Error>>;

  /**
   * Delete all roles for a user
   */
  deleteRolesForUser(user: string, domain?: string): Promise<Result<boolean, Error>>;

  /**
   * Delete a user (remove all policies)
   */
  deleteUser(user: string): Promise<Result<boolean, Error>>;

  /**
   * Delete a role (remove all policies)
   */
  deleteRole(role: string): Promise<Result<boolean, Error>>;

  /**
   * Get all subjects
   */
  getAllSubjects(): Promise<Result<string[], Error>>;

  /**
   * Get all objects
   */
  getAllObjects(): Promise<Result<string[], Error>>;

  /**
   * Get all actions
   */
  getAllActions(): Promise<Result<string[], Error>>;
}

export const createCasbinAdapter = (): CasbinAdapter => {
  let config: CasbinAdapterConfig | null = null;

  // In-memory policy storage
  const policies = new Map<string, Policy>();
  const roleInheritance = new Map<string, Set<string>>(); // user -> roles

  const generatePolicyKey = (policy: string[]): string => {
    return policy.join('::');
  };

  const parsePolicyKey = (key: string): string[] => {
    return key.split('::');
  };

  const matchPolicy = (sub: string, obj: string, act: string): boolean => {
    // Direct policy match
    const directKey = generatePolicyKey(['p', sub, obj, act]);
    if (policies.has(directKey)) {
      return true;
    }

    // Check role-based policies
    const roles = roleInheritance.get(sub) || new Set();
    for (const role of roles) {
      const roleKey = generatePolicyKey(['p', role, obj, act]);
      if (policies.has(roleKey)) {
        return true;
      }
    }

    // Check wildcard policies
    const wildcardObjKey = generatePolicyKey(['p', sub, '*', act]);
    if (policies.has(wildcardObjKey)) {
      return true;
    }

    const wildcardActKey = generatePolicyKey(['p', sub, obj, '*']);
    if (policies.has(wildcardActKey)) {
      return true;
    }

    const wildcardBothKey = generatePolicyKey(['p', sub, '*', '*']);
    if (policies.has(wildcardBothKey)) {
      return true;
    }

    return false;
  };

  return {
    init: async (cfg: CasbinAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = {
          ...cfg,
          autoSave: cfg.autoSave ?? false,
        };

        // Load initial policies
        if (cfg.policy) {
          for (const policyRule of cfg.policy) {
            const key = generatePolicyKey(policyRule);
            policies.set(key, {
              ptype: policyRule[0],
              v0: policyRule[1],
              v1: policyRule[2],
              v2: policyRule[3],
              v3: policyRule[4],
              v4: policyRule[5],
              v5: policyRule[6],
            });

            // If it's a role inheritance rule (g, user, role)
            if (policyRule[0] === 'g' && policyRule[1] && policyRule[2]) {
              if (!roleInheritance.has(policyRule[1])) {
                roleInheritance.set(policyRule[1], new Set());
              }
              roleInheritance.get(policyRule[1])!.add(policyRule[2]);
            }
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => ok(undefined),

    destroy: async (): Promise<Result<void, Error>> => {
      config = null;
      policies.clear();
      roleInheritance.clear();
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>> => {
      return ok({ status: config ? 'healthy' : 'unhealthy' });
    },

    enforce: async (sub: string, obj: string, act: string): Promise<Result<boolean, Error>> => {
      try {
        const allowed = matchPolicy(sub, obj, act);
        return ok(allowed);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    batchEnforce: async (requests: Array<[string, string, string]>): Promise<Result<boolean[], Error>> => {
      try {
        const results = requests.map(([sub, obj, act]) => matchPolicy(sub, obj, act));
        return ok(results);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    addPolicy: async (...params: string[]): Promise<Result<boolean, Error>> => {
      try {
        const policyRule = ['p', ...params];
        const key = generatePolicyKey(policyRule);

        if (policies.has(key)) {
          return ok(false); // Already exists
        }

        policies.set(key, {
          ptype: 'p',
          v0: params[0],
          v1: params[1],
          v2: params[2],
          v3: params[3],
          v4: params[4],
          v5: params[5],
        });

        return ok(true);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    removePolicy: async (...params: string[]): Promise<Result<boolean, Error>> => {
      try {
        const policyRule = ['p', ...params];
        const key = generatePolicyKey(policyRule);
        const deleted = policies.delete(key);
        return ok(deleted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getPolicy: async (): Promise<Result<string[][], Error>> => {
      try {
        const result: string[][] = [];
        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'p') {
            result.push(parts.slice(1)); // Remove 'p' prefix
          }
        }
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    addRoleForUser: async (user: string, role: string, domain?: string): Promise<Result<boolean, Error>> => {
      try {
        const policyRule = domain ? ['g', user, role, domain] : ['g', user, role];
        const key = generatePolicyKey(policyRule);

        if (policies.has(key)) {
          return ok(false); // Already exists
        }

        policies.set(key, {
          ptype: 'g',
          v0: user,
          v1: role,
          v2: domain,
        });

        if (!roleInheritance.has(user)) {
          roleInheritance.set(user, new Set());
        }
        roleInheritance.get(user)!.add(role);

        return ok(true);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteRoleForUser: async (user: string, role: string, domain?: string): Promise<Result<boolean, Error>> => {
      try {
        const policyRule = domain ? ['g', user, role, domain] : ['g', user, role];
        const key = generatePolicyKey(policyRule);
        const deleted = policies.delete(key);

        if (deleted && roleInheritance.has(user)) {
          roleInheritance.get(user)!.delete(role);
        }

        return ok(deleted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getRolesForUser: async (user: string, domain?: string): Promise<Result<string[], Error>> => {
      try {
        const roles: string[] = [];
        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'g' && parts[1] === user) {
            if (!domain || parts[3] === domain) {
              roles.push(parts[2]);
            }
          }
        }
        return ok(roles);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getUsersForRole: async (role: string, domain?: string): Promise<Result<string[], Error>> => {
      try {
        const users: string[] = [];
        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'g' && parts[2] === role) {
            if (!domain || parts[3] === domain) {
              users.push(parts[1]);
            }
          }
        }
        return ok(users);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    hasRoleForUser: async (user: string, role: string, domain?: string): Promise<Result<boolean, Error>> => {
      try {
        const policyRule = domain ? ['g', user, role, domain] : ['g', user, role];
        const key = generatePolicyKey(policyRule);
        return ok(policies.has(key));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteRolesForUser: async (user: string, domain?: string): Promise<Result<boolean, Error>> => {
      try {
        let deleted = false;
        const keysToDelete: string[] = [];

        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'g' && parts[1] === user) {
            if (!domain || parts[3] === domain) {
              keysToDelete.push(key);
            }
          }
        }

        for (const key of keysToDelete) {
          policies.delete(key);
          deleted = true;
        }

        if (deleted) {
          roleInheritance.delete(user);
        }

        return ok(deleted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteUser: async (user: string): Promise<Result<boolean, Error>> => {
      try {
        let deleted = false;
        const keysToDelete: string[] = [];

        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[1] === user) {
            keysToDelete.push(key);
          }
        }

        for (const key of keysToDelete) {
          policies.delete(key);
          deleted = true;
        }

        roleInheritance.delete(user);

        return ok(deleted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteRole: async (role: string): Promise<Result<boolean, Error>> => {
      try {
        let deleted = false;
        const keysToDelete: string[] = [];

        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          // Delete policies where role is the subject
          if (parts[0] === 'p' && parts[1] === role) {
            keysToDelete.push(key);
          }
          // Delete role inheritance rules
          if (parts[0] === 'g' && parts[2] === role) {
            keysToDelete.push(key);
          }
        }

        for (const key of keysToDelete) {
          policies.delete(key);
          deleted = true;
        }

        // Clean up role inheritance
        for (const [user, roles] of roleInheritance.entries()) {
          roles.delete(role);
        }

        return ok(deleted);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getAllSubjects: async (): Promise<Result<string[], Error>> => {
      try {
        const subjects = new Set<string>();
        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'p' && parts[1]) {
            subjects.add(parts[1]);
          }
        }
        return ok(Array.from(subjects));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getAllObjects: async (): Promise<Result<string[], Error>> => {
      try {
        const objects = new Set<string>();
        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'p' && parts[2]) {
            objects.add(parts[2]);
          }
        }
        return ok(Array.from(objects));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getAllActions: async (): Promise<Result<string[], Error>> => {
      try {
        const actions = new Set<string>();
        for (const [key] of policies) {
          const parts = parsePolicyKey(key);
          if (parts[0] === 'p' && parts[3]) {
            actions.add(parts[3]);
          }
        }
        return ok(Array.from(actions));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
