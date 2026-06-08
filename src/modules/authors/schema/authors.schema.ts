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
  job_title: text('job_title'),
  role: text('role').default('guest'),
  headline: text('headline'),
  subtitle: text('subtitle'),
  short_description: text('short_description').notNull(),
  introduction: text('introduction'),
  
  // 3. VISUALS
  images_json: text('images_json').default('{}'),
  
  // 4. BIOGRAPHY & SOCIALS
  bio_json: text('bio_json').default('{}'),

  // 5. AI PERSONA
  persona_json: text('persona_json').default('{}'),
  
  // 6. SEO CONFIGURATION
  seo_json: text('seo_json').default('{}'),
  
  // 7. SYSTEM & METRICS
  workflow_status: text('workflow_status').default('draft'),
  is_featured: integer('is_featured', { mode: 'boolean' }).default(false),
  sort_order: integer('sort_order').default(0),
  cached_post_count: integer('cached_post_count').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'),
}, (table) => [
  index('idx_authors_slug').on(table.slug),
  index('idx_authors_role').on(table.role),
  index('idx_authors_email').on(table.email),
  index('idx_authors_featured').on(table.is_featured),
  index('idx_authors_display').on(table.workflow_status, table.sort_order),
  index('idx_authors_active').on(table.deleted_at),
]);

// Type exports
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
