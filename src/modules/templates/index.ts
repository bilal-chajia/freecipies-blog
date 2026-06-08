/**
 * Template Module - Main Barrel Export
 * =====================================
 * Self-contained module for Pinterest pin template management.
 * 
 * Server-safe exports (schema, types, services, API handlers, utils).
 * 
 * @example
 * ```typescript
 * // Server-safe imports
 * import { getTemplates, type Template } from '@modules/templates';
 * ```
 */

// Schema
export * from './schema/templates.schema';

// Types
export * from './types';

// Services
export * from './services/templates.service';

// Utils
export * from './utils';

// React editor UI and client stores live in the admin template feature.
// This module barrel stays domain-only and server-safe.
