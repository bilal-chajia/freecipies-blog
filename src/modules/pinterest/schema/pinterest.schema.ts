/**
 * Pinterest Module - Database Schema
 * ====================================
 * Drizzle ORM schema for pinterest_boards and pinterest_pins tables.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { articles } from '../../articles/schema/articles.schema';

// ============================================================================
// PINTEREST BOARDS
// ============================================================================
export const pinterestBoards = sqliteTable('pinterest_boards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  boardUrl: text('board_url'),
  coverImageUrl: text('cover_image_url'),
  locale: text('locale').default('en'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_pinterest_boards_active').on(table.isActive),
]);

// ============================================================================
// PINTEREST PINS
// ============================================================================
export const pinterestPins = sqliteTable('pinterest_pins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }),
  boardId: integer('board_id').references(() => pinterestBoards.id, { onDelete: 'set null' }),
  sectionName: text('section_name'),
  imageUrl: text('image_url').notNull(),
  destinationUrl: text('destination_url').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  tagsJson: text('tags_json').default('[]'),
  status: text('status').default('draft'),
  pinterestPinId: text('pinterest_pin_id'),
  exportedAt: text('exported_at'),
  exportBatchId: text('export_batch_id'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_pinterest_pins_board').on(table.boardId),
  index('idx_pinterest_pins_article').on(table.articleId),
  index('idx_pinterest_pins_status').on(table.status),
  index('idx_pinterest_pins_batch').on(table.exportBatchId),
]);

// Type exports
export type PinterestBoard = typeof pinterestBoards.$inferSelect;
export type NewPinterestBoard = typeof pinterestBoards.$inferInsert;
export type PinterestPin = typeof pinterestPins.$inferSelect;
export type NewPinterestPin = typeof pinterestPins.$inferInsert;
