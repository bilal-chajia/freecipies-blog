/**
 * Authors Module - Database Schema
 * ==================================
 * Drizzle ORM schema for the authors table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const authors = sqliteTable('authors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // 1. IDENTITY & ROUTING
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  
  // 2. DISPLAY METADATA
  jobTitle: text('job_title'),
  role: text('role').default('guest'),
  headline: text('headline'),
  subtitle: text('subtitle'),
  shortDescription: text('short_description').notNull(),
  excerpt: text('excerpt'),
  introduction: text('introduction'),
  
  // 3. VISUALS
  imagesJson: text('images_json').default('{}'),
  
  // 4. BIOGRAPHY & SOCIALS
  bioJson: text('bio_json').default('{}'),
  
  // 5. SEO CONFIGURATION
  seoJson: text('seo_json').default('{}'),
  
  // 6. SYSTEM & METRICS
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  cachedPostCount: integer('cached_post_count').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_authors_slug').on(table.slug),
  index('idx_authors_role').on(table.role),
  index('idx_authors_email').on(table.email),
  index('idx_authors_featured').on(table.isFeatured),
  index('idx_authors_display').on(table.isOnline, table.sortOrder),
  index('idx_authors_active').on(table.deletedAt),
]);

// Type exports
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
