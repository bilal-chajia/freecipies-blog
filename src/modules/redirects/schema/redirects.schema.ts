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
  fromPath: text('from_path').unique().notNull(),
  toPath: text('to_path').notNull(),
  statusCode: integer('status_code').default(301).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  notes: text('notes'),

  // Stats
  hitCount: integer('hit_count').default(0).notNull(),
  lastHitAt: text('last_hit_at'),

  // Timestamps
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_redirects_from_path').on(table.fromPath),
  index('idx_redirects_active').on(table.isActive),
]);

export type Redirect = typeof redirects.$inferSelect;
export type NewRedirect = typeof redirects.$inferInsert;
