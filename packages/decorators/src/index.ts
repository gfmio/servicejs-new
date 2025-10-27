/**
 * @servicejs/decorators - Class-based Decorators and Fluent Builders
 *
 * Provides ergonomic component creation through decorators and builders.
 */

// Re-export reflect-metadata for convenience
import 'reflect-metadata';

// Metadata
export { METADATA_KEYS, type HandlerMetadata, type InjectionMetadata } from './metadata.js';

// Decorators
export {
  Component,
  Handler,
  Inject,
  OnInit,
  OnShutdown,
  type ComponentConfig,
} from './decorators.js';

// Factory
export {
  createComponentFromClass,
  type FactoryError,
  type ComponentFactoryConfig,
  type ComponentFactoryResult,
} from './factory.js';

// Builder
export { ComponentBuilder, createComponentBuilder } from './builder.js';
