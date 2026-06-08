/**
 * Tags Module - Database Schema
 * ===============================
 * Drizzle ORM schema for the tags table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // 1. IDENTITY & ROUTING
  slug: text('slug').unique().notNull(),
  label: text('label').notNull(),
  description: text('description'),
  
  // 2. VISUAL STYLING
  style_json: text('style_json').default('{}'),
  
  // 3. SYSTEM & METRICS
  cached_post_count: integer('cached_post_count').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'),
}, (table) => [
  index('idx_tags_slug').on(table.slug),
  index('idx_tags_popular').on(table.cached_post_count),
  index('idx_tags_label').on(table.label),
  index('idx_tags_active').on(table.deleted_at),
]);

// Type exports
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
