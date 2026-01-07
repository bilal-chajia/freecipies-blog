/**
 * Articles ↔ Tags (Many-to-Many) - Database Schema
 * ================================================
 * Drizzle ORM schema for the articles_to_tags join table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { articles } from './articles.schema';
import { tags } from '../../tags/schema/tags.schema';

export const articlesToTags = sqliteTable('articles_to_tags', {
  articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.articleId, table.tagId] }),
  index('idx_tag_to_article').on(table.tagId),
]);

export type ArticleToTag = typeof articlesToTags.$inferSelect;
export type NewArticleToTag = typeof articlesToTags.$inferInsert;

