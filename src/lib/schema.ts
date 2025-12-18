import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ============================================================================
// SITE SETTINGS
// ============================================================================
export const siteSettings = sqliteTable('site_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    description: text('description'),
    category: text('category').default('general'),
    sortOrder: integer('sort_order').default(0),
    type: text('type').default('json'),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// MEDIA
// ============================================================================
export const media = sqliteTable('media', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    altText: text('alt_text'),
    caption: text('caption'),
    credit: text('credit'),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size'),
    width: integer('width'),
    height: integer('height'),
    blurhash: text('blurhash'),
    dominantColor: text('dominant_color'),
    variantsJson: text('variants_json').notNull(), // { xs, sm, md, lg, original? }
    folder: text('folder'),
    tagsJson: text('tags_json').default('[]'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
}, (table) => [
    index('idx_media_folder').on(table.folder),
    index('idx_media_active').on(table.deletedAt),
]);

// ============================================================================
// CATEGORIES
// ============================================================================
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    shortDescription: text('short_description'),
    parentId: integer('parent_id'),
    displayOrder: integer('display_order').default(0),
    colorHex: text('color_hex'),
    iconSvg: text('icon_svg'),
    imagesJson: text('images_json'),
    seoJson: text('seo_json'),
    configJson: text('config_json'),
    cachedPostCount: integer('cached_post_count').default(0),
    isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
    isNav: integer('is_nav', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
}, (table) => [
    index('idx_categories_slug').on(table.slug),
    index('idx_categories_parent').on(table.parentId),
    index('idx_categories_nav').on(table.isNav, table.displayOrder),
    index('idx_categories_active').on(table.deletedAt),
]);

// ============================================================================
// AUTHORS
// ============================================================================
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

// ============================================================================
// TAGS
// ============================================================================
export const tags = sqliteTable('tags', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    label: text('label').notNull(),
    description: text('description'),
    filterGroupsJson: text('filter_groups_json'),
    styleJson: text('style_json'),
    cachedPostCount: integer('cached_post_count').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
}, (table) => [
    index('idx_tags_slug').on(table.slug),
    index('idx_tags_active').on(table.deletedAt),
]);

// ============================================================================
// EQUIPMENT
// ============================================================================
export const equipment = sqliteTable('equipment', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    imageJson: text('image_json'),
    affiliateUrl: text('affiliate_url'),
    affiliateProvider: text('affiliate_provider'),
    affiliateNote: text('affiliate_note'),
    priceDisplay: text('price_display'),
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

// ============================================================================
// ARTICLES
// ============================================================================
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
    relatedArticlesJson: text('related_articles_json'),
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

// ============================================================================
// ARTICLES TO TAGS (Junction)
// ============================================================================
export const articlesToTags = sqliteTable('articles_to_tags', {
    articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
    primaryKey({ columns: [table.articleId, table.tagId] }),
    index('idx_articles_to_tags_tag').on(table.tagId),
]);

// ============================================================================
// PINTEREST BOARDS
// ============================================================================
export const pinterestBoards = sqliteTable('pinterest_boards', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    boardUrl: text('board_url'),
    coverImageUrl: text('cover_image_url'),
    locale: text('locale').default('en'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: text('deleted_at'),
}, (table) => [
    index('idx_pinterest_boards_active').on(table.isActive),
]);

// ============================================================================
// PINTEREST PINS
// ============================================================================
export const pinterestPins = sqliteTable('pinterest_pins', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }),
    boardId: integer('board_id').references(() => pinterestBoards.id, { onDelete: 'set null' }),
    sectionName: text('section_name'),
    imageUrl: text('image_url').notNull(),
    destinationUrl: text('destination_url').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    tagsJson: text('tags_json').default('[]'),
    status: text('status').default('draft'),
    pinterestPinId: text('pinterest_pin_id'),
    exportedAt: text('exported_at'),
    exportBatchId: text('export_batch_id'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    index('idx_pinterest_pins_board').on(table.boardId),
    index('idx_pinterest_pins_article').on(table.articleId),
    index('idx_pinterest_pins_status').on(table.status),
    index('idx_pinterest_pins_batch').on(table.exportBatchId),
]);

// ============================================================================
// PIN TEMPLATES
// ============================================================================
export const pinTemplates = sqliteTable('pin_templates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category').default('general'),
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

// ============================================================================
// REDIRECTS
// ============================================================================
export const redirects = sqliteTable('redirects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fromPath: text('from_path').unique().notNull(),
    toPath: text('to_path').notNull(),
    statusCode: integer('status_code').default(301),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    hitCount: integer('hit_count').default(0),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// RELATIONS
// ============================================================================
export const categoriesRelations = relations(categories, ({ one, many }) => ({
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
        relationName: 'category_hierarchy',
    }),
    children: many(categories, { relationName: 'category_hierarchy' }),
    articles: many(articles),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
    articles: many(articles),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    articlesToTags: many(articlesToTags),
}));

export const equipmentRelations = relations(equipment, ({ }) => ({
    // Equipment is referenced via recipe_json.equipment[].equipment_id
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
    category: one(categories, {
        fields: [articles.categoryId],
        references: [categories.id],
    }),
    author: one(authors, {
        fields: [articles.authorId],
        references: [authors.id],
    }),
    parent: one(articles, {
        fields: [articles.parentArticleId],
        references: [articles.id],
        relationName: 'article_hierarchy',
    }),
    children: many(articles, { relationName: 'article_hierarchy' }),
    articlesToTags: many(articlesToTags),
    pinterestPins: many(pinterestPins),
}));

export const articlesToTagsRelations = relations(articlesToTags, ({ one }) => ({
    article: one(articles, {
        fields: [articlesToTags.articleId],
        references: [articles.id],
    }),
    tag: one(tags, {
        fields: [articlesToTags.tagId],
        references: [tags.id],
    }),
}));

export const pinterestBoardsRelations = relations(pinterestBoards, ({ many }) => ({
    pins: many(pinterestPins),
}));

export const pinterestPinsRelations = relations(pinterestPins, ({ one }) => ({
    article: one(articles, {
        fields: [pinterestPins.articleId],
        references: [articles.id],
    }),
    board: one(pinterestBoards, {
        fields: [pinterestPins.boardId],
        references: [pinterestBoards.id],
    }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Equipment = typeof equipment.$inferSelect;
export type NewEquipment = typeof equipment.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type ArticleToTag = typeof articlesToTags.$inferSelect;
export type NewArticleToTag = typeof articlesToTags.$inferInsert;

export type PinterestBoard = typeof pinterestBoards.$inferSelect;
export type NewPinterestBoard = typeof pinterestBoards.$inferInsert;

export type PinterestPin = typeof pinterestPins.$inferSelect;
export type NewPinterestPin = typeof pinterestPins.$inferInsert;

export type PinTemplate = typeof pinTemplates.$inferSelect;
export type NewPinTemplate = typeof pinTemplates.$inferInsert;

export type Redirect = typeof redirects.$inferSelect;
export type NewRedirect = typeof redirects.$inferInsert;
