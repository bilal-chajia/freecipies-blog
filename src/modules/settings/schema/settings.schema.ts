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
  sortOrder: integer('sort_order').default(0),
  type: text('type').default('json'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_site_settings_category').on(table.category, table.sortOrder),
]);

// Type exports
export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;
