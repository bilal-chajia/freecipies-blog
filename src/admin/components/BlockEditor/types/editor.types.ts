/**
 * BlockNote Editor Types
 *
 * Strongly typed schema and editor types for the application.
 */
import type { AppSchema } from '../schema';

export type { AppSchema } from '../schema';

/**
 * Strongly typed BlockNote editor for the application schema.
 */
export type AppEditor = AppSchema['BlockNoteEditor'];

/**
 * Strongly typed Block for the application schema.
 */
export type AppBlock = AppEditor['document'][number];
