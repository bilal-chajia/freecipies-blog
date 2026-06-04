/**
 * Articles Module - Database Schema
 * ===================================
 * Drizzle ORM schema for the articles table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { categories } from '../../categories/schema/categories.schema';
import { authors } from '../../authors/schema/authors.schema';

export const articles = sqliteTable('articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  type: text('type').notNull().default('article'),
  locale: text('locale').default('en'),

  // Relations
  category_id: integer('category_id').notNull().references(() => categories.id),
  author_id: integer('author_id').notNull().references(() => authors.id),
  parent_article_id: integer('parent_article_id'),

  // Display Metadata
  headline: text('headline').notNull(),
  subtitle: text('subtitle'),
  short_description: text('short_description').notNull(),
  excerpt: text('excerpt'),
  introduction: text('introduction'),

  // Content Fields
  images_json: text('images_json'),
  content_json: text('content_json'),
  recipe_json: text('recipe_json'),
  roundup_json: text('roundup_json'),
  faqs_json: text('faqs_json'),

  // Cached Fields (Zero-Join)
  cached_tags_json: text('cached_tags_json'),
  cached_category_json: text('cached_category_json'),
  cached_author_json: text('cached_author_json'),
  cached_rating_json: text('cached_rating_json'),
  cached_toc_json: text('cached_toc_json'),
  cached_recipe_json: text('cached_recipe_json'),
  cached_card_json: text('cached_card_json'),
  reading_time_minutes: integer('reading_time_minutes'),

  // SEO & Config
  seo_json: text('seo_json'),
  jsonld_json: text('jsonld_json'),
  config_json: text('config_json'),

  // Workflow
  workflow_status: text('workflow_status').default('draft'),
  scheduled_at: text('scheduled_at'),

  // System
  is_favorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  access_level: integer('access_level').default(0),
  view_count: integer('view_count').default(0),
  published_at: text('published_at'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'),
}, (table) => [
  index('idx_articles_slug').on(table.slug),
  index('idx_articles_type').on(table.type),
  index('idx_articles_category').on(table.category_id),
  index('idx_articles_author').on(table.author_id),
  index('idx_articles_favorite').on(table.is_favorite),
  index('idx_articles_published').on(table.published_at),
  index('idx_articles_views').on(table.view_count),
  index('idx_articles_workflow').on(table.workflow_status),
  index('idx_articles_active').on(table.deleted_at),
]);

// Type exports
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
