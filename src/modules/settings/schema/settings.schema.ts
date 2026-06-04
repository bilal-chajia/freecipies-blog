/**
 * Settings Module - Database Schema
 * ===================================
 * Drizzle ORM schema for site_settings table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  category: text('category').default('general'),
  sort_order: integer('sort_order').default(0),
  type: text('type').default('json'),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_site_settings_category').on(table.category, table.sort_order),
]);

// Type exports
export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
