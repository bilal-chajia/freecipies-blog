import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// CATEGORIES TABLE
// ============================================
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    label: text('label').notNull(),
    headline: text('headline').notNull(),
    metaTitle: text('meta_title').notNull(),
    metaDescription: text('meta_description').notNull(),
    shortDescription: text('short_description').notNull(),
    tldr: text('tldr').notNull(),
    imageUrl: text('image_url'),
    imageAlt: text('image_alt'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    collectionTitle: text('collection_title').notNull(),
    numEntriesPerPage: integer('num_entries_per_page').default(12),
    isOnline: integer('is_online', { mode: 'boolean' }).default(false),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
    sortOrder: integer('sort_order').default(0),
    color: text('color').default('#ff6600ff'),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_categories_slug').on(table.slug),
    index('idx_categories_online').on(table.isOnline),
    index('idx_categories_order').on(table.sortOrder),
]);

// ============================================
// AUTHORS TABLE
// ============================================
export const authors = sqliteTable('authors', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    alternateName: text('alternate_name'),
    email: text('email').notNull(),
    job: text('job'),
    metaTitle: text('meta_title').notNull(),
    metaDescription: text('meta_description').notNull(),
    shortDescription: text('short_description').notNull(),
    tldr: text('tldr').notNull(),
    imageUrl: text('image_url'),
    imageAlt: text('image_alt'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    bioJson: text('bio_json'), // JSON: paragraphs, networks, etc.
    isOnline: integer('is_online', { mode: 'boolean' }).default(false),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_authors_slug').on(table.slug),
    index('idx_authors_online').on(table.isOnline),
]);

// ============================================
// TAGS TABLE
// ============================================
export const tags = sqliteTable('tags', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    label: text('label').notNull(),
    color: text('color').default('#ff6600'),
    isOnline: integer('is_online', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_tags_slug').on(table.slug),
    index('idx_tags_online').on(table.isOnline),
]);

// ============================================
// ARTICLES TABLE
// ============================================
export const articles = sqliteTable('articles', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull().default('article'), // 'article' or 'recipe'

    // Relations
    categorySlug: text('category_slug').notNull().references(() => categories.slug, { onDelete: 'cascade' }),
    authorSlug: text('author_slug').notNull().references(() => authors.slug, { onDelete: 'cascade' }),

    // Basic Info
    label: text('label').notNull(),
    headline: text('headline').notNull(),

    // SEO
    metaTitle: text('meta_title').notNull(),
    metaDescription: text('meta_description').notNull(),
    canonicalUrl: text('canonical_url'),

    // Content
    shortDescription: text('short_description').notNull(),
    tldr: text('tldr').notNull(),
    introduction: text('introduction'),
    summary: text('summary'),

    // Images
    imageUrl: text('image_url'),
    imageAlt: text('image_alt'),
    imageWidth: integer('image_width'),
    imageHeight: integer('image_height'),
    coverUrl: text('cover_url'),
    coverAlt: text('cover_alt'),
    coverWidth: integer('cover_width'),
    coverHeight: integer('cover_height'),

    // JSON Data Fields
    contentJson: text('content_json'),
    recipeJson: text('recipe_json'),
    faqsJson: text('faqs_json'),
    keywordsJson: text('keywords_json'),
    referencesJson: text('references_json'),
    mediaJson: text('media_json'),

    // Metadata
    isOnline: integer('is_online', { mode: 'boolean' }).default(false),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).default(false),
    publishedAt: text('published_at'),
    viewCount: integer('view_count').default(0),

    // Timestamps
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_articles_slug').on(table.slug),
    index('idx_articles_type').on(table.type),
    index('idx_articles_category').on(table.categorySlug),
    index('idx_articles_author').on(table.authorSlug),
    index('idx_articles_online').on(table.isOnline),
    index('idx_articles_favorite').on(table.isFavorite),
    index('idx_articles_published').on(table.publishedAt),
    index('idx_articles_views').on(table.viewCount),
]);

// ============================================
// ARTICLE TAGS JUNCTION TABLE
// ============================================
export const articleTags = sqliteTable('article_tags', {
    articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    primaryKey({ columns: [table.articleId, table.tagId] }),
]);

// ============================================
// PINTEREST BOARDS TABLE
// ============================================
export const pinterestBoards = sqliteTable('pinterest_boards', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    boardUrl: text('board_url'),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_boards_slug').on(table.slug),
    index('idx_boards_active').on(table.isActive),
]);

// ============================================
// PINTEREST PINS TABLE
// ============================================
export const pinterestPins = sqliteTable('pinterest_pins', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
    boardId: integer('board_id').references(() => pinterestBoards.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url').notNull(),
    imageAlt: text('image_alt'),
    imageWidth: integer('image_width').default(1000),
    imageHeight: integer('image_height').default(1500),
    pinUrl: text('pin_url'),
    sortOrder: integer('sort_order').default(0),
    isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_pins_article').on(table.articleId),
    index('idx_pins_board').on(table.boardId),
    index('idx_pins_primary').on(table.isPrimary),
    index('idx_pins_order').on(table.sortOrder),
    index('idx_pins_created').on(table.createdAt),
]);

// ============================================
// PIN TEMPLATES TABLE
// ============================================
export const pinTemplates = sqliteTable('pin_templates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    canvasWidth: integer('canvas_width').default(1000),
    canvasHeight: integer('canvas_height').default(1500),
    backgroundColor: text('background_color').default('#ffffff'),
    elementsJson: text('elements_json').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    sortOrder: integer('sort_order').default(0),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_pin_templates_active').on(table.isActive),
    index('idx_pin_templates_default').on(table.isDefault),
    index('idx_pin_templates_order').on(table.sortOrder),
]);

// ============================================
// MEDIA TABLE
// ============================================
export const media = sqliteTable('media', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    filename: text('filename').notNull(),
    r2Key: text('r2_key').unique().notNull(),
    url: text('url').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    altText: text('alt_text'),
    attribution: text('attribution'),
    uploadedBy: text('uploaded_by'),
    uploadedAt: text('uploaded_at').default('CURRENT_TIMESTAMP'),
}, (table) => [
    index('idx_media_r2_key').on(table.r2Key),
    index('idx_media_filename').on(table.filename),
]);

// ============================================
// SITE SETTINGS TABLE
// ============================================
export const siteSettings = sqliteTable('site_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(), // JSON value
    description: text('description'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// ============================================
// REDIRECTS TABLE
// ============================================
export const redirects = sqliteTable('redirects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fromPath: text('from_path').unique().notNull(),
    toPath: text('to_path').notNull(),
    statusCode: integer('status_code').default(301),
    isActive: integer('is_active', { mode: 'boolean' }).default(true),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

// ============================================
// RELATIONS
// ============================================
export const categoriesRelations = relations(categories, ({ many }) => ({
    articles: many(articles),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
    articles: many(articles),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
    articleTags: many(articleTags),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
    category: one(categories, {
        fields: [articles.categorySlug],
        references: [categories.slug],
    }),
    author: one(authors, {
        fields: [articles.authorSlug],
        references: [authors.slug],
    }),
    articleTags: many(articleTags),
    pins: many(pinterestPins),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
    article: one(articles, {
        fields: [articleTags.articleId],
        references: [articles.id],
    }),
    tag: one(tags, {
        fields: [articleTags.tagId],
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

// ============================================
// TYPE EXPORTS
// ============================================
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type ArticleTag = typeof articleTags.$inferSelect;
export type NewArticleTag = typeof articleTags.$inferInsert;

export type PinterestBoard = typeof pinterestBoards.$inferSelect;
export type NewPinterestBoard = typeof pinterestBoards.$inferInsert;

export type PinterestPin = typeof pinterestPins.$inferSelect;
export type NewPinterestPin = typeof pinterestPins.$inferInsert;

export type PinTemplate = typeof pinTemplates.$inferSelect;
export type NewPinTemplate = typeof pinTemplates.$inferInsert;

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

export type SiteSetting = typeof siteSettings.$inferSelect;
export type NewSiteSetting = typeof siteSettings.$inferInsert;

export type Redirect = typeof redirects.$inferSelect;
export type NewRedirect = typeof redirects.$inferInsert;
