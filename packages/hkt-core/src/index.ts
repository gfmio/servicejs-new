/**
 * @servicejs/hkt-core
 *
 * Core Higher-Kinded Types infrastructure for ServiceJS.
 * Provides the foundational types and utilities for type-level programming.
 */

// Core type infrastructure (types and runtime)
export * as HKTF from "./hktf.js";
export * as HKTO from "./hkto.js";
export * as Method from "./method.js";

export * as FunctionHKTF from "./function.js";
export * as Protocol from "./protocol.js";

// Utilities (types and runtime)
export * as Util from "./util/index.js";

// Errors (types and runtime)
export * from "./errors.js";
