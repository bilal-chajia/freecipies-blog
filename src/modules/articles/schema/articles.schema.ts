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
  categoryId: integer('category_id').notNull().references(() => categories.id),
  authorId: integer('author_id').notNull().references(() => authors.id),
  parentArticleId: integer('parent_article_id'),

  // Display Metadata
  headline: text('headline').notNull(),
  subtitle: text('subtitle'),
  shortDescription: text('short_description').notNull(),
  excerpt: text('excerpt'),
  introduction: text('introduction'),

  // Content Fields
  imagesJson: text('images_json'),
  contentJson: text('content_json'),
  recipeJson: text('recipe_json'),
  roundupJson: text('roundup_json'),
  faqsJson: text('faqs_json'),

  // Cached Fields (Zero-Join)
  cachedTagsJson: text('cached_tags_json'),
  cachedCategoryJson: text('cached_category_json'),
  cachedAuthorJson: text('cached_author_json'),
  cachedEquipmentJson: text('cached_equipment_json'),
  cachedCommentCount: integer('cached_comment_count').default(0),
  cachedRatingJson: text('cached_rating_json'),
  cachedTocJson: text('cached_toc_json'),
  cachedRecipeJson: text('cached_recipe_json'),
  cachedCardJson: text('cached_card_json'),
  readingTimeMinutes: integer('reading_time_minutes'),

  // Scalar Indexes
  totalTimeMinutes: integer('total_time_minutes'),
  difficultyLabel: text('difficulty_label'),

  // SEO & Config
  seoJson: text('seo_json'),
  jsonldJson: text('jsonld_json'),
  configJson: text('config_json'),

  // Workflow
  workflowStatus: text('workflow_status').default('draft'),
  scheduledAt: text('scheduled_at'),

  // System
  isOnline: integer('is_online', { mode: 'boolean' }).default(false),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
  accessLevel: integer('access_level').default(0),
  viewCount: integer('view_count').default(0),
  publishedAt: text('published_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
}, (table) => [
  index('idx_articles_slug').on(table.slug),
  index('idx_articles_type').on(table.type),
  index('idx_articles_category').on(table.categoryId),
  index('idx_articles_author').on(table.authorId),
  index('idx_articles_online').on(table.isOnline),
  index('idx_articles_favorite').on(table.isFavorite),
  index('idx_articles_published').on(table.publishedAt),
  index('idx_articles_views').on(table.viewCount),
  index('idx_articles_workflow').on(table.workflowStatus),
  index('idx_articles_time').on(table.totalTimeMinutes),
  index('idx_articles_difficulty').on(table.difficultyLabel),
  index('idx_articles_active').on(table.deletedAt),
]);

// Type exports
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
