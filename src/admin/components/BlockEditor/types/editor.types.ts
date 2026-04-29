/**
 * BlockNote Editor Types
 *
 * Strongly typed schema and editor types for the application.
 */

export type { AppSchema, AppEditor } from '../schema';

/**
 * Strongly typed Block for the application schema.
 */
export type AppBlock = import('@blocknote/core').Block<import('../schema').AppSchema>;
