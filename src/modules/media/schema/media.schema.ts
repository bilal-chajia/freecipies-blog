/**
 * Media Module - Database Schema
 * ===============================
 * Drizzle ORM schema for the media table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // 1. SEARCHABLE METADATA
  name: text('name').notNull(),
  alt_text: text('alt_text').notNull(),
  caption: text('caption').notNull(),
  credit: text('credit').notNull(),
  mime_type: text('mime_type').notNull().default('image/webp'),
  aspect_ratio: text('aspect_ratio'),

  // 2. TECHNICAL PAYLOAD
  variants_json: text('variants_json').notNull(),

  // 3. SMART DISPLAY
  focal_point_json: text('focal_point_json').default('{"x": 50, "y": 50}'),

  // 4. SYSTEM METADATA
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'),
}, (table) => [
  index('idx_media_search').on(table.name, table.alt_text, table.credit),
  index('idx_media_date').on(table.created_at),
  index('idx_media_active').on(table.deleted_at),
]);

// Type exports
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
