import { sqliteTable, text, integer, anyType } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// 1. JSON TYPE DEFINITIONS (Zod Schemas)
// ============================================================================
// These ensure the Agent validates JSON blobs before insertion.

const ImageVariantSchema = z.object({
    url: z.string(),
    alt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
});

export const ImagesJsonSchema = z.object({
    thumbnail: ImageVariantSchema.optional(),
    cover: ImageVariantSchema.optional(),
});

export const SeoJsonSchema = z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    noIndex: z.boolean().default(false),
});

export const ConfigJsonSchema = z.object({
    postsPerPage: z.number().default(12),
    layoutMode: z.enum(['grid', 'list', 'masonry']).default('grid'),
    showSidebar: z.boolean().default(true),
});

// Generic Record for flexible i18n keys
export const I18nJsonSchema = z.record(z.string(), z.any());

// ============================================================================
// 2. TABLE DEFINITION
// ============================================================================

export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Navigation & Identity
    slug: text('slug').notNull().unique(),
    label: text('label').notNull(),
    parentId: integer('parent_id'), // Self-reference for hierarchy

    // Display Text
    headline: text('headline'),
    collectionTitle: text('collection_title'),
    shortDescription: text('short_description'),

    // Visuals & Logic
    color: text('color').default('#ff6600ff'),
    isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),

    // JSON Containers (Stored as text, typed via Zod in app logic)
    imagesJson: text('images_json', { mode: 'json' })
        .$type<z.infer<typeof ImagesJsonSchema>>()
        .default(sql`'{}'`),

    seoJson: text('seo_json', { mode: 'json' })
        .$type<z.infer<typeof SeoJsonSchema>>()
        .default(sql`'{}'`),

    configJson: text('config_json', { mode: 'json' })
        .$type<z.infer<typeof ConfigJsonSchema>>()
        .default(sql`'{}'`),

    i18nJson: text('i18n_json', { mode: 'json' })
        .$type<z.infer<typeof I18nJsonSchema>>()
        .default(sql`'{}'`),

    // System & Metrics
    sortOrder: integer('sort_order').default(0),
    isOnline: integer('is_online', { mode: 'boolean' }).default(false),
    cachedPostCount: integer('cached_post_count').default(0),

    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' })
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .default(sql`CURRENT_TIMESTAMP`), // Note: Drizzle doesn't auto-update on edit; use triggers or app logic
    deletedAt: integer('deleted_at', { mode: 'timestamp' }), // Soft Delete
});

// ============================================================================
// 3. RELATIONS
// ============================================================================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
        relationName: 'category_hierarchy',
    }),
    children: many(categories, {
        relationName: 'category_hierarchy',
    }),
}));

// ============================================================================
// 4. TYPE INFERENCE (For the Agent)
// ============================================================================

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

