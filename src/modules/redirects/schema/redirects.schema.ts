/**
 * Redirects Module - Database Schema
 * =====================================
 * Drizzle ORM schema for the redirects table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const redirects = sqliteTable('redirects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  from_path: text('from_path').unique().notNull(),
  to_path: text('to_path').notNull(),
  status_code: integer('status_code').default(301).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  notes: text('notes'),

  // Stats
  hit_count: integer('hit_count').default(0).notNull(),
  last_hit_at: text('last_hit_at'),

  // Timestamps
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_redirects_from_path').on(table.from_path),
  index('idx_redirects_active').on(table.is_active),
]);

export type Redirect = typeof redirects.$inferSelect;
export type NewRedirect = typeof redirects.$inferInsert;
