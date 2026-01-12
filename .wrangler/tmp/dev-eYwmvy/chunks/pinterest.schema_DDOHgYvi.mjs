globalThis.process ??= {}; globalThis.process.env ??= {};
import { s as sqliteTable, t as text, a as sql, i as integer, b as index } from './templates.schema_DniFYo8s.mjs';

const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // 1. NAVIGATION & HIERARCHY
  slug: text("slug").unique().notNull(),
  label: text("label").notNull(),
  parentId: integer("parent_id"),
  depth: integer("depth").default(0),
  // 2. DISPLAY TEXT (Landing Page Content)
  headline: text("headline"),
  collectionTitle: text("collection_title"),
  shortDescription: text("short_description").notNull(),
  // 3. VISUALS (Display-Ready Image Data)
  imagesJson: text("images_json").default("{}"),
  // 4. LOGIC & THEME
  color: text("color").default("#ff6600ff"),
  iconSvg: text("icon_svg"),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  // 5. JSON CONFIG CONTAINERS
  seoJson: text("seo_json").default("{}"),
  configJson: text("config_json").default("{}"),
  i18nJson: text("i18n_json").default("{}"),
  // 6. SYSTEM & METRICS
  sortOrder: integer("sort_order").default(0),
  isOnline: integer("is_online", { mode: "boolean" }).default(false),
  cachedPostCount: integer("cached_post_count").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
}, (table) => [
  index("idx_categories_slug").on(table.slug),
  index("idx_categories_parent").on(table.parentId),
  index("idx_categories_display").on(table.isOnline, table.sortOrder),
  index("idx_categories_featured").on(table.isFeatured),
  index("idx_categories_active").on(table.deletedAt)
]);

const authors = sqliteTable("authors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // 1. IDENTITY & ROUTING
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  // 2. DISPLAY METADATA
  jobTitle: text("job_title"),
  role: text("role").default("guest"),
  headline: text("headline"),
  subtitle: text("subtitle"),
  shortDescription: text("short_description").notNull(),
  excerpt: text("excerpt"),
  introduction: text("introduction"),
  // 3. VISUALS
  imagesJson: text("images_json").default("{}"),
  // 4. BIOGRAPHY & SOCIALS
  bioJson: text("bio_json").default("{}"),
  // 5. SEO CONFIGURATION
  seoJson: text("seo_json").default("{}"),
  // 6. SYSTEM & METRICS
  isOnline: integer("is_online", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  sortOrder: integer("sort_order").default(0),
  cachedPostCount: integer("cached_post_count").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
}, (table) => [
  index("idx_authors_slug").on(table.slug),
  index("idx_authors_role").on(table.role),
  index("idx_authors_email").on(table.email),
  index("idx_authors_featured").on(table.isFeatured),
  index("idx_authors_display").on(table.isOnline, table.sortOrder),
  index("idx_authors_active").on(table.deletedAt)
]);

const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").unique().notNull(),
  type: text("type").notNull().default("article"),
  locale: text("locale").default("en"),
  // Relations
  categoryId: integer("category_id").notNull().references(() => categories.id),
  authorId: integer("author_id").notNull().references(() => authors.id),
  parentArticleId: integer("parent_article_id"),
  // Display Metadata
  headline: text("headline").notNull(),
  subtitle: text("subtitle"),
  shortDescription: text("short_description").notNull(),
  excerpt: text("excerpt"),
  introduction: text("introduction"),
  // Content Fields
  imagesJson: text("images_json"),
  contentJson: text("content_json"),
  recipeJson: text("recipe_json"),
  roundupJson: text("roundup_json"),
  faqsJson: text("faqs_json"),
  // Cached Fields (Zero-Join)
  relatedArticlesJson: text("related_articles_json"),
  cachedTagsJson: text("cached_tags_json"),
  cachedCategoryJson: text("cached_category_json"),
  cachedAuthorJson: text("cached_author_json"),
  cachedEquipmentJson: text("cached_equipment_json"),
  cachedCommentCount: integer("cached_comment_count").default(0),
  cachedRatingJson: text("cached_rating_json"),
  cachedTocJson: text("cached_toc_json"),
  cachedRecipeJson: text("cached_recipe_json"),
  cachedCardJson: text("cached_card_json"),
  readingTimeMinutes: integer("reading_time_minutes"),
  // Scalar Indexes
  totalTimeMinutes: integer("total_time_minutes"),
  difficultyLabel: text("difficulty_label"),
  // SEO & Config
  seoJson: text("seo_json"),
  jsonldJson: text("jsonld_json"),
  configJson: text("config_json"),
  // Workflow
  workflowStatus: text("workflow_status").default("draft"),
  scheduledAt: text("scheduled_at"),
  // System
  isOnline: integer("is_online", { mode: "boolean" }).default(false),
  isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
  accessLevel: integer("access_level").default(0),
  viewCount: integer("view_count").default(0),
  publishedAt: text("published_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
}, (table) => [
  index("idx_articles_slug").on(table.slug),
  index("idx_articles_type").on(table.type),
  index("idx_articles_category").on(table.categoryId),
  index("idx_articles_author").on(table.authorId),
  index("idx_articles_online").on(table.isOnline),
  index("idx_articles_favorite").on(table.isFavorite),
  index("idx_articles_published").on(table.publishedAt),
  index("idx_articles_views").on(table.viewCount),
  index("idx_articles_workflow").on(table.workflowStatus),
  index("idx_articles_time").on(table.totalTimeMinutes),
  index("idx_articles_difficulty").on(table.difficultyLabel),
  index("idx_articles_active").on(table.deletedAt)
]);

const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // 1. IDENTITY & ROUTING
  slug: text("slug").unique().notNull(),
  label: text("label").notNull(),
  description: text("description"),
  // 2. FILTER LOGIC (Multi-Grouping)
  filterGroupsJson: text("filter_groups_json").default("[]"),
  // 3. VISUAL STYLING
  styleJson: text("style_json").default("{}"),
  // 4. SYSTEM & METRICS
  cachedPostCount: integer("cached_post_count").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
}, (table) => [
  index("idx_tags_slug").on(table.slug),
  index("idx_tags_popular").on(table.cachedPostCount),
  index("idx_tags_label").on(table.label),
  index("idx_tags_active").on(table.deletedAt)
]);

const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // 1. SEARCHABLE METADATA
  name: text("name").notNull(),
  altText: text("alt_text").notNull(),
  caption: text("caption"),
  credit: text("credit"),
  mimeType: text("mime_type").notNull().default("image/webp"),
  aspectRatio: text("aspect_ratio"),
  sizeBytes: integer("size_bytes"),
  // 2. TECHNICAL PAYLOAD
  variantsJson: text("variants_json").notNull(),
  // 3. SMART DISPLAY
  focalPointJson: text("focal_point_json").default('{"x": 50, "y": 50}'),
  // 4. SYSTEM METADATA
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
}, (table) => [
  index("idx_media_search").on(table.name, table.altText, table.credit),
  index("idx_media_date").on(table.createdAt),
  index("idx_media_active").on(table.deletedAt)
]);

const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  sortOrder: integer("sort_order").default(0),
  type: text("type").default("json"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`)
}, (table) => [
  index("idx_site_settings_category").on(table.category, table.sortOrder)
]);

const pinterestBoards = sqliteTable("pinterest_boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  boardUrl: text("board_url"),
  coverImageUrl: text("cover_image_url"),
  locale: text("locale").default("en"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
}, (table) => [
  index("idx_pinterest_boards_active").on(table.isActive)
]);
const pinterestPins = sqliteTable("pinterest_pins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  articleId: integer("article_id").references(() => articles.id, { onDelete: "cascade" }),
  boardId: integer("board_id").references(() => pinterestBoards.id, { onDelete: "set null" }),
  sectionName: text("section_name"),
  imageUrl: text("image_url").notNull(),
  destinationUrl: text("destination_url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  tagsJson: text("tags_json").default("[]"),
  status: text("status").default("draft"),
  pinterestPinId: text("pinterest_pin_id"),
  exportedAt: text("exported_at"),
  exportBatchId: text("export_batch_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`)
}, (table) => [
  index("idx_pinterest_pins_board").on(table.boardId),
  index("idx_pinterest_pins_article").on(table.articleId),
  index("idx_pinterest_pins_status").on(table.status),
  index("idx_pinterest_pins_batch").on(table.exportBatchId)
]);

export { articles as a, authors as b, categories as c, pinterestPins as d, media as m, pinterestBoards as p, siteSettings as s, tags as t };
