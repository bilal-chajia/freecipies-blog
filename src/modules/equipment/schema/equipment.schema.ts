/**
 * Equipment Module - Database Schema
 * ====================================
 * Drizzle ORM schema for the equipment table.
 * Matches db/schema.sql definition.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const equipment = sqliteTable('equipment', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // 1. IDENTITY
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    brand: text('brand'),
    description: text('description'),
    keywords: text('keywords').default('[]'),
    category: text('category').default('other'),

    // 2. VISUALS
    image_json: text('image_json').default('{}'),

    // 3. AFFILIATE LINKS
    affiliate_url: text('affiliate_url'),
    affiliate_provider: text('affiliate_provider'),
    affiliate_note: text('affiliate_note'),

    // 4. SYSTEM
    is_active: integer('is_active', { mode: 'boolean' }).default(true),
    sort_order: integer('sort_order').default(0),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deleted_at: text('deleted_at'),
}, (table) => [
    index('idx_equipment_slug').on(table.slug),
    index('idx_equipment_category').on(table.category),
    index('idx_equipment_active').on(table.is_active),
]);

// Type exports
export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;
