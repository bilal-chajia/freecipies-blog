/**
 * Media Module - Database Schema
 * ===============================
 * Drizzle ORM schema for the media table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  altText: text('alt_text'),
  caption: text('caption'),
  credit: text('credit'),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size'),
  width: integer('width'),
  height: integer('height'),
  blurhash: text('blurhash'),
  dominantColor: text('dominant_color'),
  variantsJson: text('variants_json').notNull(), // { xs, sm, md, lg, original? }
  folder: text('folder'),
  tagsJson: text('tags_json').default('[]'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_media_folder').on(table.folder),
  index('idx_media_active').on(table.deletedAt),
]);

// Type exports
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
