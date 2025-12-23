/**
 * Categories Module - Database Schema
 * =====================================
 * Drizzle ORM schema for the categories table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Navigation & Hierarchy
  slug: text('slug').unique().notNull(),
  label: text('label').notNull(),
  parentId: integer('parent_id'),
  depth: integer('depth').default(0),
  
  // Display Text (Landing Page Content)
  headline: text('headline'),
  collectionTitle: text('collection_title'),
  shortDescription: text('short_description'),
  
  // Visuals (Display-Ready Image Data)
  imagesJson: text('images_json').default('{}'),
  
  // Logic & Theme
  color: text('color').default('#ff6600ff'),
  iconSvg: text('icon_svg'),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  
  // JSON Config Containers
  seoJson: text('seo_json').default('{}'),
  configJson: text('config_json').default('{}'),
  i18nJson: text('i18n_json').default('{}'),
  
  // System & Metrics
  sortOrder: integer('sort_order').default(0),
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  cachedPostCount: integer('cached_post_count').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_categories_slug').on(table.slug),
  index('idx_categories_parent').on(table.parentId),
  index('idx_categories_display').on(table.isOnline, table.sortOrder),
  index('idx_categories_featured').on(table.isFeatured),
  index('idx_categories_active').on(table.deletedAt),
]);

// Type exports
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
