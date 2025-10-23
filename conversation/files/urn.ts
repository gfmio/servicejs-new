/**
 * Unique Resource Name for identifying components
 * Format: urn:namespace:specific-id
 */
export type URN = string & { readonly __brand: 'URN' };

export const createURN = (namespace: string, id: string): URN => {
  return `urn:${namespace}:${id}` as URN;
};

export const parseURN = (urn: URN): { namespace: string; id: string } | null => {
  const match = urn.match(/^urn:([^:]+):(.+)$/);
  if (!match) {
    return null;
  }
  return {
    namespace: match[1],
    id: match[2],
  };
};

/**
 * Generate a random URN with the given namespace
 */
export const generateURN = (namespace: string): URN => {
  const id = crypto.randomUUID();
  return createURN(namespace, id);
};
