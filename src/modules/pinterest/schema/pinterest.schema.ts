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
  board_url: text('board_url'),
  cover_image_url: text('cover_image_url'),
  locale: text('locale').default('en'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'),
}, (table) => [
  index('idx_pinterest_boards_active').on(table.is_active),
]);

// ============================================================================
// PINTEREST PINS
// ============================================================================
export const pinterestPins = sqliteTable('pinterest_pins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  article_id: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }),
  board_id: integer('board_id').references(() => pinterestBoards.id, { onDelete: 'set null' }),
  section_name: text('section_name'),
  image_url: text('image_url').notNull(),
  destination_url: text('destination_url').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  tags_json: text('tags_json').default('[]'),
  status: text('status').default('draft'),
  pinterest_pin_id: text('pinterest_pin_id'),
  exported_at: text('exported_at'),
  export_batch_id: text('export_batch_id'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_pinterest_pins_board').on(table.board_id),
  index('idx_pinterest_pins_article').on(table.article_id),
  index('idx_pinterest_pins_status').on(table.status),
  index('idx_pinterest_pins_batch').on(table.export_batch_id),
]);

// Type exports
export type PinterestBoard = typeof pinterestBoards.$inferSelect;
export type NewPinterestBoard = typeof pinterestBoards.$inferInsert;
export type PinterestPin = typeof pinterestPins.$inferSelect;
export type NewPinterestPin = typeof pinterestPins.$inferInsert;
