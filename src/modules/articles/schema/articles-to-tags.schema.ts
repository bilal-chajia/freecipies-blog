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
  article_id: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tag_id: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.article_id, table.tag_id] }),
  index('idx_tag_to_article').on(table.tag_id),
]);

export type ArticleToTag = typeof articlesToTags.$inferSelect;
export type NewArticleToTag = typeof articlesToTags.$inferInsert;
