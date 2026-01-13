/**
 * Templates Module - Database Schema
 * ====================================
 * Drizzle ORM schema for pin_templates table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const pinTemplates = sqliteTable('pin_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('general'),
  backgroundColor: text('background_color').default('#ffffff'),
  thumbnailUrl: text('thumbnail_url'),
  width: integer('width').default(1000),
  height: integer('height').default(1500),
  elementsJson: text('elements_json').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_pin_templates_slug').on(table.slug),
  index('idx_pin_templates_category').on(table.category),
  index('idx_pin_templates_active').on(table.isActive),
]);

// Type exports
export type PinTemplate = typeof pinTemplates.$inferSelect;
export type NewPinTemplate = typeof pinTemplates.$inferInsert;
