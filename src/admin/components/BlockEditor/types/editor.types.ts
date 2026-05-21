/**
 * BlockNote Editor Types
 *
 * Strongly typed schema and editor types for the application.
 */

export type { AppSchema, AppEditor } from '../schema';

/**
 * Runtime editor block shape used by adapter/normalization code.
 *
 * BlockNote's generic schema types are stricter than this adapter boundary
 * needs. The conversion layer only requires the stable runtime fields below.
 */
export interface AppBlock {
    id?: string;
    type: string;
    props?: Record<string, unknown>;
    content?: unknown;
    children?: AppBlock[];
}
