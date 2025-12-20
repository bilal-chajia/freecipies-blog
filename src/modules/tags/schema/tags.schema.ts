/**
 * Tags Module - Database Schema
 * ===============================
 * Drizzle ORM schema for the tags table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  label: text('label').notNull(),
  description: text('description'),
  filterGroupsJson: text('filter_groups_json'),
  styleJson: text('style_json'),
  cachedPostCount: integer('cached_post_count').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_tags_slug').on(table.slug),
  index('idx_tags_active').on(table.deletedAt),
]);

// Type exports
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
