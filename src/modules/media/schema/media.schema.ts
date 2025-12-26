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
  altText: text('alt_text').notNull(),
  caption: text('caption'),
  credit: text('credit'),
  mimeType: text('mime_type').notNull().default('image/webp'),
  aspectRatio: text('aspect_ratio'),
  
  // 2. TECHNICAL PAYLOAD
  variantsJson: text('variants_json').notNull(),
  
  // 3. SMART DISPLAY
  focalPointJson: text('focal_point_json').default('{"x": 50, "y": 50}'),
  
  // 4. SYSTEM METADATA
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_media_search').on(table.name, table.altText, table.credit),
  index('idx_media_date').on(table.createdAt),
  index('idx_media_active').on(table.deletedAt),
]);

// Type exports
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
