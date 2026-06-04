/**
 * Categories Module - Database Schema
 * =====================================
 * Drizzle ORM schema for the categories table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // 1. NAVIGATION & HIERARCHY
  slug: text('slug').unique().notNull(),
  label: text('label').notNull(),
  parent_id: integer('parent_id'),
  depth: integer('depth').default(0),
  
  // 2. DISPLAY TEXT (Landing Page Content)
  headline: text('headline'),
  collection_title: text('collection_title'),
  short_description: text('short_description').notNull(),
  
  // 3. VISUALS (Display-Ready Image Data)
  images_json: text('images_json').default('{}'),
  
  // 4. LOGIC & THEME
  color: text('color').default('#ff6600ff'),
  is_featured: integer('is_featured', { mode: 'boolean' }).default(false),
  
  // 5. JSON CONFIG CONTAINERS
  seo_json: text('seo_json').default('{}'),
  
  // 6. SYSTEM & METRICS
  sort_order: integer('sort_order').default(0),
  workflow_status: text('workflow_status').default('draft'),
  cached_post_count: integer('cached_post_count').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'),
}, (table) => [
  index('idx_categories_slug').on(table.slug),
  index('idx_categories_parent').on(table.parent_id),
  index('idx_categories_display').on(table.workflow_status, table.sort_order),
  index('idx_categories_featured').on(table.is_featured),
  index('idx_categories_active').on(table.deleted_at),
]);

// Type exports
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
