/**
 * Authors Module - Database Schema
 * ==================================
 * Drizzle ORM schema for the authors table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const authors = sqliteTable('authors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  email: text('email').unique(),
  jobTitle: text('job_title'),
  role: text('role').default('writer'),
  headline: text('headline'),
  shortDescription: text('short_description'),
  introduction: text('introduction'),
  imagesJson: text('images_json'),
  bioJson: text('bio_json'),
  seoJson: text('seo_json'),
  cachedPostCount: integer('cached_post_count').default(0),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  isOnline: integer('is_online', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_authors_slug').on(table.slug),
  index('idx_authors_online').on(table.isOnline),
  index('idx_authors_active').on(table.deletedAt),
  index('idx_authors_featured').on(table.isFeatured, table.sortOrder),
]);

// Type exports
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
