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
    imageJson: text('image_json').default('{}'),

    // 3. AFFILIATE LINKS
    affiliateUrl: text('affiliate_url'),
    affiliateProvider: text('affiliate_provider'),
    affiliateNote: text('affiliate_note'),

    // 4. SYSTEM
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
}, (table) => [
    index('idx_equipment_slug').on(table.slug),
    index('idx_equipment_category').on(table.category),
    index('idx_equipment_active').on(table.isActive),
]);

// Type exports
export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;
