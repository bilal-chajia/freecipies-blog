/**
 * Template Module - Main Barrel Export
 * =====================================
 * Self-contained module for Pinterest pin template management.
 * 
 * Server-safe exports (schema, types, services, API handlers, utils).
 * For client-side components and store, import directly:
 * 
 * @example
 * ```typescript
 * // Server-safe imports
 * import { getTemplates, type Template } from '@modules/templates';
 * 
 * // Client-only imports (use in React components only)
 * import { TemplateEditor, TemplatesList } from '@admin/features/templates/components';
 * import { useEditorStore } from '@admin/features/templates/store';
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

// NOTE: Store and Components are NOT exported here to prevent SSR issues
// with react-router-dom. Import them directly:
// - '@admin/features/templates/components'
// - '@admin/features/templates/store'
