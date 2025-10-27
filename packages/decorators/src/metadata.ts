/**
 * Metadata Keys
 *
 * Constants for storing decorator metadata using reflect-metadata.
 */

import 'reflect-metadata';

/**
 * Metadata keys for component decorators
 */
export const METADATA_KEYS = {
  /** Component URN */
  COMPONENT_URN: 'component:urn',
  /** Message handlers (method name -> message type) */
  COMPONENT_HANDLERS: 'component:handlers',
  /** Capability injections (parameter index -> capability name) */
  COMPONENT_INJECTIONS: 'component:injections',
  /** OnInit lifecycle hook method name */
  COMPONENT_ON_INIT: 'component:onInit',
  /** OnShutdown lifecycle hook method name */
  COMPONENT_ON_SHUTDOWN: 'component:onShutdown',
  /** Initial state factory */
  COMPONENT_STATE: 'component:state',
} as const;

/**
 * Handler metadata
 */
export interface HandlerMetadata {
  /** Method name */
  readonly methodName: string;
  /** Message type to handle (optional, defaults to all) */
  readonly messageType?: string;
}

/**
 * Injection metadata
 */
export interface InjectionMetadata {
  /** Parameter index */
  readonly parameterIndex: number;
  /** Capability name */
  readonly capabilityName: string;
}
