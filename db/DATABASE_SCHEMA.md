# Database Schema Reference

> **Last Updated:** 2026-04-29
> **Database:** Cloudflare D1 (SQLite)  
> **ORM:** Drizzle ORM

This document provides a compact database reference for tables, fields, indexes, triggers, and relationships.

Detailed JSON payload rules live in the dedicated contract documents. When this file and a contract disagree, the contract wins.

---

## 🤖 AI Agent Guidelines

> **IMPORTANT FOR AI AGENTS (Claude, Gemini, etc.):**
> This section contains critical rules for maintaining data consistency.

### General Rules

1. **Always use IDs for relationships**, never slugs in foreign key columns.
2. **JSON fields must be valid JSON** - use `JSON.stringify()` before inserting.
3. **Soft deletes only** - set `deleted_at` instead of hard deleting records.
4. **All queries must filter** `WHERE deleted_at IS NULL` unless explicitly requested.
5. **Timestamps are UTC** - always use `CURRENT_TIMESTAMP` or ISO-8601 strings.

### JSON Field Rules

1. **Never store invalid JSON** - validate before inserting.
2. **Use dedicated contracts for JSON shapes** - do not infer JSON contracts from examples in this file.
3. **Stored JSON uses storage-safe values** - image snapshots store `r2_key`, not public URLs.
4. **Public APIs/render props transform storage JSON** - public payloads must not expose storage-only fields such as `r2_key`.

### Naming Conventions

| Type            | Convention            | Example                    |
| --------------- | --------------------- | -------------------------- |
| Slugs           | lowercase, kebab-case | `chocolate-chip-cookies`   |
| Stored JSON keys | snake_case           | `media_id`, `focal_point`  |
| API/React props | camelCase             | `mediaId`, `focalPoint`    |
| SQL columns     | snake_case            | `created_at`, `is_online`  |
| Boolean columns | `is_` prefix          | `is_online`, `is_featured` |

### API Design Patterns

> **AGENT RULE:** Follow these patterns when creating API endpoints.

#### Standard Response Shapes

**Single Entity:**

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
```

**List with Pagination:**

```typescript
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### Common API Endpoints Pattern

| Resource   | GET (list)        | GET (single)            | POST                | PUT                   | DELETE                |
| ---------- | ----------------- | ----------------------- | ------------------- | --------------------- | --------------------- |
| Articles   | `/api/articles`   | `/api/articles/:slug`   | `/api/articles`     | `/api/articles/:id`   | `/api/articles/:id`   |
| Categories | `/api/categories` | `/api/categories/:slug` | `/api/categories`   | `/api/categories/:id` | `/api/categories/:id` |
| Authors    | `/api/authors`    | `/api/authors/:slug`    | `/api/authors`      | `/api/authors/:id`    | `/api/authors/:id`    |
| Tags       | `/api/tags`       | `/api/tags/:slug`       | `/api/tags`         | `/api/tags/:id`       | `/api/tags/:id`       |
| Media      | `/api/media`      | `/api/media/:id`        | `/api/media/upload` | `/api/media/:id`      | `/api/media/:id`      |

> **AGENT RULE:** Use `slug` for public GET requests (SEO-friendly URLs), use `id` for mutations (PUT/DELETE).

#### Query Parameter Standards

```
GET /api/articles?page=1&limit=12&sort=publishedAt&order=desc&category=desserts&tag=vegan&author=jane-doe&type=recipe&online=true&search=chocolate
```

| Param      | Type    | Default       | Description                                       |
| ---------- | ------- | ------------- | ------------------------------------------------- |
| `page`     | number  | 1             | Page number (1-indexed)                           |
| `limit`    | number  | 12            | Items per page (max: 100)                         |
| `sort`     | string  | `publishedAt` | Sort field                                        |
| `order`    | string  | `desc`        | `asc` or `desc`                                   |
| `category` | string  | -             | Filter by category slug                           |
| `tag`      | string  | -             | Filter by tag slug (comma-separated for multiple) |
| `author`   | string  | -             | Filter by author slug                             |
| `type`     | string  | -             | `article`, `recipe`, or `roundup`                 |
| `online`   | boolean | true          | Filter by visibility                              |
| `search`   | string  | -             | Full-text search query                            |

#### Hydration Pattern

> **CRITICAL:** Raw database rows must be hydrated before sending to frontend.

```typescript
// Raw DB row (snake_case, JSON strings)
interface RawArticle {
  id: number;
  slug: string;
  images_json: string; // JSON string
  recipe_json: string; // JSON string
  category_id: number;
  // ...
}

// Hydrated for API response (camelCase, parsed JSON)
interface HydratedArticle {
  id: number;
  slug: string;
  images: ImagesJson; // Parsed object
  recipe: RecipeJson; // Parsed object
  categoryId: number;
  route: string; // Computed: `/recipes/${slug}`
  imageUrl: string; // Convenience: images.cover.variants.md.url
  // ...
}
```

**Hydration Steps:**

1. Parse all `*_json` fields with `JSON.parse()`
2. Convert snake_case to camelCase
3. Add computed fields (`route`, `imageUrl`, etc.)
4. Remove sensitive fields (`r2_key`, internal IDs)

#### Common JOIN Patterns

**Articles with Category + Author (for listings):**

```sql
SELECT
  articles.*,
  categories.label AS category_label,
  categories.slug AS category_slug,
  categories.color AS category_color,
  authors.name AS author_name,
  authors.slug AS author_slug
FROM articles
LEFT JOIN categories ON articles.category_id = categories.id
LEFT JOIN authors ON articles.author_id = authors.id
WHERE articles.deleted_at IS NULL
  AND articles.is_online = 1
ORDER BY articles.published_at DESC
LIMIT ? OFFSET ?
```

**Articles with Tags (for detail page):**

```sql
SELECT tags.slug, tags.label
FROM articles_to_tags
JOIN tags ON articles_to_tags.tag_id = tags.id
WHERE articles_to_tags.article_id = ?
  AND tags.deleted_at IS NULL
```

#### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string; // e.g., "NOT_FOUND", "VALIDATION_ERROR", "UNAUTHORIZED"
  details?: Record<string, string[]>; // Field-level errors
}
```

**Common Error Codes:**

- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid input data
- `DUPLICATE_SLUG` - Slug already exists
- `UNAUTHORIZED` - Missing or invalid auth
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server error

---

## Database Performance & Automation

### Key Indexes

The database includes optimized indexes for common query patterns:

| Table | Index | Purpose |
|-------|-------|---------|
| `site_settings` | `idx_site_settings_category` | Admin settings page organization |
| `media` | `idx_media_search` | Media library search (name, alt_text, credit) |
| `media` | `idx_media_date` | Most recent uploads sorting |
| `media` | `idx_media_active` | Soft delete filtering |
| `categories` | `idx_categories_slug` | Routing lookups |
| `categories` | `idx_categories_parent` | Hierarchy queries |
| `categories` | `idx_categories_display` | Navigation menus (online + sort_order) |
| `categories` | `idx_categories_featured` | Featured categories widgets |
| `categories` | `idx_categories_active` | Soft delete filtering |
| `authors` | `idx_authors_slug` | Routing lookups |
| `authors` | `idx_authors_role` | Team page filtering |
| `authors` | `idx_authors_email` | Admin lookups |
| `authors` | `idx_authors_featured` | Featured authors widgets |
| `authors` | `idx_authors_display` | Team page sorting |
| `authors` | `idx_authors_active` | Soft delete filtering |
| `tags` | `idx_tags_slug` | Routing lookups |
| `tags` | `idx_tags_popular` | Tag cloud sorting (by post count) |
| `tags` | `idx_tags_label` | Admin autocomplete |
| `tags` | `idx_tags_active` | Soft delete filtering |
| `equipment` | `idx_equipment_slug` | Routing lookups |
| `equipment` | `idx_equipment_category` | Category filtering |
| `equipment` | `idx_equipment_active` | Active equipment filtering |
| `articles` | `idx_articles_slug` | Routing lookups |
| `articles` | `idx_articles_feed` | Main feed (online + published_at DESC) |
| `articles` | `idx_articles_cat` | Category archive filtering |
| `articles` | `idx_articles_author` | Author archive filtering |
| `articles` | `idx_articles_parent` | Pillar/cluster queries |
| `articles` | `idx_articles_workflow` | Admin workflow filtering |
| `articles` | `idx_articles_total_time` | Recipe time filtering |
| `articles` | `idx_articles_difficulty` | Recipe difficulty filtering |
| `articles` | `idx_articles_active` | Soft delete filtering |
| `articles_to_tags` | `idx_tag_to_article` | Tag-based article queries |
| `pinterest_boards` | `idx_pinterest_boards_active` | Active board filtering |
| `pinterest_pins` | `idx_pinterest_pins_board` | Board-based pin queries |
| `pinterest_pins` | `idx_pinterest_pins_article` | Article-based pin queries |
| `pinterest_pins` | `idx_pinterest_pins_status` | Status-based pin filtering |
| `pinterest_pins` | `idx_pinterest_pins_batch` | Export batch queries |
| `pin_templates` | `idx_pin_templates_slug` | Routing lookups |
| `pin_templates` | `idx_pin_templates_category` | Category filtering |
| `pin_templates` | `idx_pin_templates_active` | Active template filtering |
| `redirects` | `idx_redirects_from_path` | Redirect matching |
| `redirects` | `idx_redirects_active` | Active redirect filtering |

### Important Triggers

Database triggers automate common operations and maintain data integrity:

#### Auto-Timestamp Updates
- `update_*_timestamp`: Automatically update `updated_at` on any row modification
- `trg_articles_updated_at`: Same for articles table

#### Workflow Automation (Articles)
- `trg_articles_set_published_at`: Sets `published_at` when article first goes online
- `trg_articles_online_workflow`: Forces `workflow_status = 'published'` when `is_online = 1`
- `trg_articles_prevent_delete`: Converts hard DELETE to soft delete (sets `deleted_at`)

#### Full-Text Search Synchronization
- `trg_articles_search_ai`: Syncs FTS index on INSERT
- `trg_articles_search_au`: Syncs FTS index on UPDATE (handles soft deletes)
- `trg_articles_search_ad`: Cleans FTS index on hard DELETE

#### Soft Delete Protection
All tables support soft deletes via `deleted_at` column. The articles table has additional protection via `trg_articles_prevent_delete` trigger, which prevents accidental hard deletes of published content.

---

## Table of Contents

1. [Tables](#tables)
   - [site_settings](#site_settings)
   - [media](#media)
   - [categories](#categories)
   - [authors](#authors)
   - [tags](#tags)
   - [equipment](#equipment)
   - [articles](#articles)
   - [articles_to_tags](#articles_to_tags)
   - [pinterest_boards](#pinterest_boards)
   - [pinterest_pins](#pinterest_pins)
   - [pin_templates](#pin_templates)
   - [redirects](#redirects)
2. [Complete JSON Schemas](#complete-json-schemas)
3. [FTS5 Search Indexes](#fts5-search-indexes)
4. [Relationships](#relationships)
5. [Database Performance & Automation](#database-performance--automation)

---

## Tables

### site_settings

**Purpose:** Key-value store for global site configuration.

**Canonical contract:** `docs/SITE_SETTINGS_TABLE_CONTRACT.md`

| Column        | Type     | Required | Default           | Description                                         |
| ------------- | -------- | -------- | ----------------- | --------------------------------------------------- |
| `key`         | TEXT     | ✅ PK    | -                 | Setting identifier (snake_case)                     |
| `value`       | TEXT     | ✅       | -                 | JSON configuration payload                          |
| `description` | TEXT     | ❌       | NULL              | Admin UI helper text                                |
| `category`    | TEXT     | ❌       | `'general'`       | Grouping (`general`, `seo`, `social`, `theme`)      |
| `sort_order`  | INTEGER  | ❌       | `0`               | Display order within category                       |
| `type`        | TEXT     | ❌       | `'json'`          | UI editor type (`json`, `text`, `boolean`, `image`) |
| `updated_at`  | DATETIME | ❌       | CURRENT_TIMESTAMP | Auto-updated timestamp                              |

**Common Keys:**

```
site_info       → Site name, tagline, logo
social_links    → Social media URLs
seo_defaults    → Default SEO settings
theme_config    → Colors, dark mode
scripts         → Analytics, tracking codes
footer_config   → Copyright, footer links
newsletter      → Email provider config
contact_info    → Contact details
```

---

### media

**Purpose:** Centralized asset library with responsive image variants.

> **AGENT RULE:** When deleting media, you MUST delete all R2 files first using `r2_key` from variants_json.

| Column             | Type     | Required | Default             | Description                          |
| ------------------ | -------- | -------- | ------------------- | ------------------------------------ |
| `id`               | INTEGER  | ✅ PK    | AUTO                | Auto-increment ID                    |
| `name`             | TEXT     | ✅       | -                   | Human filename for search            |
| `alt_text`         | TEXT     | ✅       | -                   | Accessibility text (WCAG required)   |
| `caption`          | TEXT     | ❌       | NULL                | Visible caption below image          |
| `credit`           | TEXT     | ❌       | NULL                | Attribution/copyright                |
| `mime_type`        | TEXT     | ✅       | `'image/webp'`      | MIME type                            |
| `aspect_ratio`     | TEXT     | ❌       | NULL                | Display ratio (`16:9`, `4:5`, `1:1`) |
| `variants_json`    | TEXT     | ✅       | -                   | See `docs/MEDIA_TABLE_CONTRACT.md`   |
| `focal_point_json` | TEXT     | ❌       | `'{"x":50,"y":50}'` | Cropping focal point                 |
| `created_at`       | DATETIME | ❌       | CURRENT_TIMESTAMP   | Upload timestamp                     |
| `updated_at`       | DATETIME | ❌       | CURRENT_TIMESTAMP   | Last modification                    |
| `deleted_at`       | DATETIME | ❌       | NULL                | Soft delete marker                   |

#### variants_json Contract

Canonical shape and variant rules are defined in:

- `docs/MEDIA_TABLE_CONTRACT.md`
- `docs/MEDIA_IMAGE_CONTRACT.md`

This file must not duplicate media JSON examples because image slot rules differ by context.

> **TYPESCRIPT TYPES:**
>
> Import from `@shared/types/images`:
> - `StorageVariant` - Full variant with `r2_key` (internal use only)
> - `ImageVariant` - Public variant without `r2_key` (API responses)
> - `MediaVariantsJson` - Complete `{ variants, placeholder }` structure


#### focal_point_json Schema

```json
{
  "x": 50,
  "y": 50
}
```

> Values are percentages (0-100). Default is center (50, 50).

---

### categories

**Purpose:** Article/recipe categorization with hierarchical navigation support.

**Canonical contract:** `docs/CATEGORIES_TABLE_CONTRACT.md`

| Column              | Type     | Required  | Default           | Description                             |
| ------------------- | -------- | --------- | ----------------- | --------------------------------------- |
| `id`                | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID                       |
| `slug`              | TEXT     | ✅ UNIQUE | -                 | URL path (immutable after creation)     |
| `label`             | TEXT     | ✅        | -                 | Navigation display name (< 30 chars)    |
| `parent_id`         | INTEGER  | ❌ FK     | NULL              | Parent category for hierarchy           |
| `depth`             | INTEGER  | ❌        | `0`               | Pre-computed hierarchy depth            |
| `headline`          | TEXT     | ❌        | NULL              | H1 page title (fallback: label)         |
| `collection_title`  | TEXT     | ❌        | NULL              | Header text above post grid             |
| `short_description` | TEXT     | ✅        | -                 | Intro paragraph (160-225 chars for SEO) |
| `images_json`       | TEXT     | ❌        | `'{}'`            | **See images_json schema below**        |
| `color`             | TEXT     | ❌        | `'#ff6600ff'`     | 8-char hex with alpha                   |
| `icon_svg`          | TEXT     | ❌        | NULL              | Raw SVG code (< 2KB, sanitized)         |
| `is_featured`       | BOOLEAN  | ❌        | `0`               | Show in "Featured Categories"           |
| `seo_json`          | TEXT     | ❌        | `'{}'`            | **See seo_json schema below**           |
| `config_json`       | TEXT     | ❌        | `'{}'`            | **See config_json schema below**        |
| `i18n_json`         | TEXT     | ❌        | `'{}'`            | Internationalization overrides          |
| `sort_order`        | INTEGER  | ❌        | `0`               | Navigation order (lower = first)        |
| `is_online`         | BOOLEAN  | ❌        | `0`               | Public visibility                       |
| `cached_post_count` | INTEGER  | ❌        | `0`               | Denormalized article count              |
| `created_at`        | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp                      |
| `updated_at`        | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update (auto-triggered)            |
| `deleted_at`        | DATETIME | ❌        | NULL              | Soft delete marker                      |

**Cached post count:** `categories.cached_post_count` is maintained automatically by SQL triggers on the `articles` table (insert/update/delete) and counts only rows where `is_online = 1` AND `deleted_at IS NULL`.

---

### authors

**Purpose:** Content creator profiles with social links and bios.

**Canonical contract:** `docs/AUTHORS_TABLE_CONTRACT.md`

| Column              | Type     | Required  | Default           | Description                             |
| ------------------- | -------- | --------- | ----------------- | --------------------------------------- |
| `id`                | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID                       |
| `slug`              | TEXT     | ✅ UNIQUE | -                 | URL path (immutable after creation)     |
| `name`              | TEXT     | ✅        | -                 | Public display name                     |
| `email`             | TEXT     | ✅ UNIQUE | -                 | Contact email (internal use)            |
| `job_title`         | TEXT     | ❌        | NULL              | Professional title                      |
| `role`              | TEXT     | ❌        | `'guest'`         | `guest`, `staff`, `editor`, `admin`     |
| `headline`          | TEXT     | ❌        | NULL              | Profile page H1 (fallback: name)        |
| `subtitle`          | TEXT     | ❌        | NULL              | Optional tagline                        |
| `short_description` | TEXT     | ✅        | -                 | Brief bio (100-160 chars, required)     |
| `excerpt`           | TEXT     | ❌        | NULL              | Newsletter teaser                       |
| `introduction`      | TEXT     | ❌        | NULL              | Full hero copy (supports markdown)      |
| `images_json`       | TEXT     | ❌        | `'{}'`            | **See author images_json schema below** |
| `bio_json`          | TEXT     | ❌        | `'{}'`            | **See bio_json schema below**           |
| `seo_json`          | TEXT     | ❌        | `'{}'`            | **See seo_json schema below**           |
| `is_online`         | BOOLEAN  | ❌        | `0`               | Profile visibility                      |
| `is_featured`       | BOOLEAN  | ❌        | `0`               | Show in "Featured Authors"              |
| `sort_order`        | INTEGER  | ❌        | `0`               | Team page order                         |
| `cached_post_count` | INTEGER  | ❌        | `0`               | Denormalized article count              |
| `created_at`        | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp                      |
| `updated_at`        | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update (auto-triggered)            |
| `deleted_at`        | DATETIME | ❌        | NULL              | Soft delete marker                      |

---

### tags

**Purpose:** Flexible labeling system for filtering and discovery.

**Canonical contract:** `docs/TAGS_TABLE_CONTRACT.md`

| Column               | Type     | Required  | Default           | Description                             |
| -------------------- | -------- | --------- | ----------------- | --------------------------------------- |
| `id`                 | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID                       |
| `slug`               | TEXT     | ✅ UNIQUE | -                 | URL-safe identifier                     |
| `label`              | TEXT     | ✅        | -                 | Display label (< 25 chars)              |
| `description`        | TEXT     | ❌        | NULL              | SEO description (100-160 chars)         |
| `filter_groups_json` | TEXT     | ❌        | `'[]'`            | **See filter_groups_json schema below** |
| `style_json`         | TEXT     | ❌        | `'{}'`            | **See style_json schema below**         |
| `cached_post_count`  | INTEGER  | ❌        | `0`               | Denormalized article count              |
| `created_at`         | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp                      |
| `updated_at`         | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update (auto-triggered)            |
| `deleted_at`         | DATETIME | ❌        | NULL              | Soft delete marker                      |

---

### equipment

**Purpose:** Kitchen equipment catalog with affiliate links.

**Canonical contract:** `docs/EQUIPMENT_TABLE_CONTRACT.md`

| Column               | Type     | Required  | Default           | Description                                                          |
| -------------------- | -------- | --------- | ----------------- | -------------------------------------------------------------------- |
| `id`                 | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID                                                    |
| `slug`               | TEXT     | ✅ UNIQUE | -                 | URL path                                                             |
| `name`               | TEXT     | ✅        | -                 | Display name                                                         |
| `description`        | TEXT     | ❌        | NULL              | Short description for tooltips                                       |
| `category`           | TEXT     | ❌        | `'other'`         | `appliances`, `bakeware`, `cookware`, `utensils`, `gadgets`, `other` |
| `image_json`         | TEXT     | ❌        | `'{}'`            | **See images_json schema**                                           |
| `affiliate_url`      | TEXT     | ❌        | NULL              | Primary affiliate link                                               |
| `affiliate_provider` | TEXT     | ❌        | NULL              | `amazon`, `williams-sonoma`, `target`, etc.                          |
| `affiliate_note`     | TEXT     | ❌        | NULL              | Disclosure override                                                  |
| `price_display`      | TEXT     | ❌        | NULL              | Display price (`$299.99`)                                            |
| `is_active`          | BOOLEAN  | ❌        | `1`               | Show in recipes                                                      |
| `sort_order`         | INTEGER  | ❌        | `0`               | Display order                                                        |
| `created_at`         | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp                                                   |
| `updated_at`         | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update                                                          |
| `deleted_at`         | DATETIME | ❌        | NULL              | Soft delete marker                                                   |

---

### articles

**Purpose:** Core content table for posts, recipes, and roundups.

> **AGENT RULES:**
>
> 1. Always use `category_id` and `author_id` (IDs), never slugs.
> 2. Use versioned `content_json` as a `ContentDocument` object with `blocks`.
> 3. `ad_slot` is reserved and not accepted by strict `content_json` v1 save validation.
> 4. Cached fields are rebuilt on save - don't manually update them.
> 5. **Soft Delete Protection:** Articles cannot be hard-deleted due to database triggers. Use `deleted_at` for logical deletion.

#### Identity & Relations

| Column              | Type    | Required  | Default     | Description                          |
| ------------------- | ------- | --------- | ----------- | ------------------------------------ |
| `id`                | INTEGER | ✅ PK     | AUTO        | Auto-increment ID                    |
| `slug`              | TEXT    | ✅ UNIQUE | -           | URL path (globally unique)           |
| `type`              | TEXT    | ✅        | `'article'` | `article`, `recipe`, or `roundup`    |
| `locale`            | TEXT    | ❌        | `'en'`      | Language code                        |
| `category_id`       | INTEGER | ✅ FK     | -           | Parent category (ON DELETE RESTRICT) |
| `author_id`         | INTEGER | ✅ FK     | -           | Content author (ON DELETE RESTRICT)  |
| `parent_article_id` | INTEGER | ❌ FK     | NULL        | Pillar/cluster parent                |

#### Display Metadata

| Column              | Type | Required | Default | Description                            |
| ------------------- | ---- | -------- | ------- | -------------------------------------- |
| `headline`          | TEXT | ✅       | -       | Main H1 / recipe name                  |
| `subtitle`          | TEXT | ❌       | NULL    | Optional tagline                       |
| `short_description` | TEXT | ✅       | -       | Card text / meta fallback (≤160 chars) |
| `excerpt`           | TEXT | ❌       | NULL    | Newsletter teaser                      |
| `introduction`      | TEXT | ❌       | NULL    | Hero copy (supports markdown)          |

#### Content Fields

| Column         | Type | Required | Default   | Description                                     |
| -------------- | ---- | -------- | --------- | ----------------------------------------------- |
| `images_json`  | TEXT | ❌       | `'{}'`    | **See images_json schema**                      |
| `content_json` | TEXT | ❌       | `ContentDocument v1` | **See content_json schema** (block-based body) |
| `recipe_json`  | TEXT | ❌       | `'{...}'` | **See recipe_json schema** (type='recipe' only) |
| `roundup_json` | TEXT | ❌       | `'{...}'` | **See roundup_json schema** (type='roundup')    |
| `faqs_json`    | TEXT | ❌       | `'[]'`    | **See faqs_json schema**                        |

#### Cached Fields (Zero-Join Rendering)

> **AGENT NOTE:** These are auto-rebuilt on article save. Do not manually update.

| Column                  | Type    | Description                               |
| ----------------------- | ------- | ----------------------------------------- |
| `cached_tags_json`      | TEXT    | Minimal tag snapshots `[{ "id": 1, "label": "Vegan", "slug": "vegan" }]` |
| `cached_category_json`  | TEXT    | Category snapshot                         |
| `cached_author_json`    | TEXT    | Author snapshot with avatar               |
| `cached_equipment_json` | TEXT    | Rich equipment card snapshots             |
| `cached_rating_json`    | TEXT    | Star rating snapshot                      |
| `cached_toc_json`       | TEXT    | Table of contents from headings           |
| `cached_recipe_json`    | TEXT    | Lightweight recipe summary for listings   |
| `cached_card_json`      | TEXT    | Pre-computed card for pickers/listings    |
| `reading_time_minutes`  | INTEGER | Estimated reading time                    |

#### Scalar Indexes (for fast filtering)

| Column               | Type    | Description                   |
| -------------------- | ------- | ----------------------------- |
| `total_time_minutes` | INTEGER | Recipe total time (indexable) |
| `difficulty_label`   | TEXT    | Difficulty level (indexable)  |

#### SEO & Config

| Column        | Type | Default   | Description                   |
| ------------- | ---- | --------- | ----------------------------- |
| `seo_json`    | TEXT | `'{...}'` | **See seo_json schema**       |
| `jsonld_json` | TEXT | `'[]'`    | Pre-generated JSON-LD schemas |
| `config_json` | TEXT | `'{...}'` | **See config_json schema**    |

#### Workflow

| Column            | Type     | Default   | Description                                                |
| ----------------- | -------- | --------- | ---------------------------------------------------------- |
| `workflow_status` | TEXT     | `'draft'` | `draft`, `in_review`, `scheduled`, `published`, `archived` |
| `scheduled_at`    | DATETIME | NULL      | Scheduled publish time                                     |

#### System

| Column         | Type     | Default           | Description                    |
| -------------- | -------- | ----------------- | ------------------------------ |
| `is_online`    | BOOLEAN  | `0`               | Public visibility              |
| `is_favorite`  | BOOLEAN  | `0`               | Featured/pinned                |
| `access_level` | INTEGER  | `0`               | 0=Public, 1=Members, 2=Premium |
| `view_count`   | INTEGER  | `0`               | Page views                     |
| `published_at` | DATETIME | NULL              | First publish timestamp        |
| `created_at`   | DATETIME | CURRENT_TIMESTAMP | Creation timestamp             |
| `updated_at`   | DATETIME | CURRENT_TIMESTAMP | Last update (auto-triggered)   |
| `deleted_at`   | DATETIME | NULL              | Soft delete marker             |

---

### articles_to_tags

**Purpose:** Many-to-many junction table for articles ↔ tags.

| Column       | Type    | Required | Description                           |
| ------------ | ------- | -------- | ------------------------------------- |
| `article_id` | INTEGER | ✅ FK    | Article reference (ON DELETE CASCADE) |
| `tag_id`     | INTEGER | ✅ FK    | Tag reference (ON DELETE CASCADE)     |

**Primary Key:** Composite (article_id, tag_id)

---

### pinterest_boards

**Purpose:** Pinterest board targets for pin organization.

| Column            | Type     | Required  | Default           | Description             |
| ----------------- | -------- | --------- | ----------------- | ----------------------- |
| `id`              | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID       |
| `slug`            | TEXT     | ✅ UNIQUE | -                 | Internal handle         |
| `name`            | TEXT     | ✅        | -                 | Display name            |
| `description`     | TEXT     | ❌        | NULL              | Board description       |
| `board_url`       | TEXT     | ❌        | NULL              | Full Pinterest URL      |
| `cover_image_url` | TEXT     | ❌        | NULL              | Preview image           |
| `locale`          | TEXT     | ❌        | `'en'`            | Target language         |
| `is_active`       | BOOLEAN  | ❌        | `1`               | Selectable for new pins |
| `created_at`      | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp      |
| `updated_at`      | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update             |
| `deleted_at`      | DATETIME | ❌        | NULL              | Soft delete marker      |

---

### pinterest_pins

**Purpose:** Pin assets ready for manual upload or CSV export.

| Column             | Type     | Required | Default           | Description                                             |
| ------------------ | -------- | -------- | ----------------- | ------------------------------------------------------- |
| `id`               | INTEGER  | ✅ PK    | AUTO              | Auto-increment ID                                       |
| `article_id`       | INTEGER  | ❌ FK    | NULL              | Source article (ON DELETE CASCADE)                      |
| `board_id`         | INTEGER  | ❌ FK    | NULL              | Target board (ON DELETE SET NULL)                       |
| `section_name`     | TEXT     | ❌       | NULL              | Board section name                                      |
| `image_url`        | TEXT     | ✅       | -                 | Final pin image URL                                     |
| `destination_url`  | TEXT     | ✅       | -                 | Traffic destination (article URL)                       |
| `title`            | TEXT     | ✅       | -                 | Pin title                                               |
| `description`      | TEXT     | ❌       | NULL              | Pin description                                         |
| `tags_json`        | TEXT     | ❌       | `'[]'`            | Pin hashtags `["easy dinner", "chicken"]`               |
| `status`           | TEXT     | ❌       | `'draft'`         | `draft`, `scheduled`, `exported`, `published`, `failed` |
| `pinterest_pin_id` | TEXT     | ❌       | NULL              | Actual Pinterest ID after publishing                    |
| `exported_at`      | DATETIME | ❌       | NULL              | Last export time                                        |
| `export_batch_id`  | TEXT     | ❌       | NULL              | Export batch identifier                                 |
| `created_at`       | DATETIME | ❌       | CURRENT_TIMESTAMP | Creation timestamp                                      |
| `updated_at`       | DATETIME | ❌       | CURRENT_TIMESTAMP | Last update                                             |

---

### pin_templates

**Purpose:** Reusable canvas templates for Pinterest pin generation.

| Column             | Type     | Required  | Default           | Description                              |
| ------------------ | -------- | --------- | ----------------- | ---------------------------------------- |
| id               | INTEGER  | ƒo. PK     | AUTO              | Auto-increment ID                        |
| slug             | TEXT     | ƒo. UNIQUE | -                 | URL routing identifier                   |
| 
ame             | TEXT     | ƒo.        | -                 | Display name                             |
| description      | TEXT     | ƒ?O        | NULL              | Template description                     |
| category         | TEXT     | ƒ?O        | 'general'       | 
ecipe, listicle, quote, general |
| ackground_color | TEXT     | ƒ?O        | '#ffffff'       | Canvas background color                  |
| 	humbnail_url    | TEXT     | ƒ?O        | NULL              | Preview image URL                        |
| width            | INTEGER  | ƒ?O        | 1000            | Pin width in pixels                      |
| height           | INTEGER  | ƒ?O        | 1500            | Pin height in pixels                     |
| elements_json    | TEXT     | ƒo.        | -                 | Canvas design configuration              |
| is_active        | BOOLEAN  | ƒ?O        | 1               | Available in picker                      |

---
------------ | -------- | --------- | ----------------- | ---------------------------------------- |
| `id`            | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID                        |
| `slug`          | TEXT     | ✅ UNIQUE | -                 | URL routing identifier                   |
| `name`          | TEXT     | ✅        | -                 | Display name                             |
| `description`   | TEXT     | ❌        | NULL              | Template description                     |
| `category`      | TEXT     | ❌        | `'general'`       | `recipe`, `listicle`, `quote`, `general` |
| `thumbnail_url` | TEXT     | ❌        | NULL              | Preview image URL                        |
| `width`         | INTEGER  | ❌        | `1000`            | Pin width in pixels                      |
| `height`        | INTEGER  | ❌        | `1500`            | Pin height in pixels                     |
| `elements_json` | TEXT     | ✅        | -                 | Canvas design configuration              |
| `is_active`     | BOOLEAN  | ❌        | `1`               | Available in picker                      |
| `created_at`    | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp                       |
| `updated_at`    | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update                              |

---

### redirects

**Purpose:** 301/302 redirects for SEO and broken link handling.

**Canonical contract:** `docs/REDIRECTS_TABLE_CONTRACT.md`

| Column        | Type     | Required  | Default           | Description                |
| ------------- | -------- | --------- | ----------------- | -------------------------- |
| `id`          | INTEGER  | ✅ PK     | AUTO              | Auto-increment ID          |
| `from_path`   | TEXT     | ✅ UNIQUE | -                 | Old path (no domain)       |
| `to_path`     | TEXT     | ✅        | -                 | New path or full URL       |
| `status_code` | INTEGER  | ❌        | `301`             | `301`, `302`, `307`, `308` |
| `is_active`   | BOOLEAN  | ❌        | `1`               | Redirect enabled           |
| `notes`       | TEXT     | ❌        | NULL              | Admin notes                |
| `hit_count`   | INTEGER  | ❌        | `0`               | Usage counter              |
| `last_hit_at` | DATETIME | ❌        | NULL              | Last redirect hit          |
| `created_at`  | DATETIME | ❌        | CURRENT_TIMESTAMP | Creation timestamp         |
| `updated_at`  | DATETIME | ❌        | CURRENT_TIMESTAMP | Last update                |

---

## JSON Payload Contracts

Detailed JSON payload rules live in dedicated contract documents. This database reference lists SQL columns and DB-level automation only.

Use these documents as the source of truth for JSON shapes:

- `articles.images_json`, `articles.seo_json`, `articles.config_json`, and `articles.roundup_json`: `docs/ARTICLE_JSON_CONTRACTS.md`
- `articles.content_json`: `docs/CONTENT_JSON_CONTRACT.md`
- `articles.recipe_json`: `docs/RECIPE_JSON_CONTRACT.md`
- `articles.cached_*`, `articles.faqs_json`, and `articles.jsonld_json`: `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`
- media source records and variants: `docs/MEDIA_TABLE_CONTRACT.md`
- reusable image slots and variant selection rules: `docs/MEDIA_IMAGE_CONTRACT.md`
- author, category, tag, equipment, redirect, and settings payloads: their matching `docs/*_TABLE_CONTRACT.md` files

This section intentionally does not duplicate examples. Duplicated JSON examples drift quickly and can confuse future refactors.

---

## FTS5 Search Indexes

### idx_articles_search

Full-text search index for articles and recipes.

| Column              | Source                               |
| ------------------- | ------------------------------------ |
| `headline`          | articles.headline                    |
| `subtitle`          | articles.subtitle                    |
| `short_description` | articles.short_description           |
| `body_content`      | Flattened content_json + recipe_json |
| `tag_labels`        | Flattened cached_tags_json           |
| `author_name`       | cached_author_json.name              |
| `category_name`     | cached_category_json.label           |

**Search Query Example:**

```sql
SELECT articles.*
FROM idx_articles_search
JOIN articles ON articles.id = idx_articles_search.rowid
WHERE idx_articles_search MATCH 'vegan chocolate quick'
ORDER BY rank
LIMIT 20;
```

**Synchronization:** The FTS indexes are automatically maintained via database triggers that sync with article changes (INSERT/UPDATE/DELETE). Soft-deleted articles are removed from search results.

### idx_media_search_fts

Full-text search for media library.

| Column     | Source         |
| ---------- | -------------- |
| `name`     | media.name     |
| `alt_text` | media.alt_text |
| `caption`  | media.caption  |
| `credit`   | media.credit   |

---

## Relationships

```
categories (1) ←──── (N) articles
authors (1) ←──── (N) articles
articles (N) ────→ (M) tags (via articles_to_tags)
equipment (1) ←──── (N) articles (via recipe_json.equipment)
pinterest_boards (1) ←──── (N) pinterest_pins
articles (1) ←──── (N) pinterest_pins
categories (1) ←──── (N) categories (self-referential via parent_id)
articles (1) ←──── (N) articles (pillar/cluster via parent_article_id)
```

---

## Image Breakpoints

| Variant    | Width   | Use Case                  |
| ---------- | ------- | ------------------------- |
| `xs`       | 360px   | Mobile thumbnails         |
| `sm`       | 720px   | Mobile full-width         |
| `md`       | 1200px  | Tablet / small desktop    |
| `lg`       | 2048px  | Full desktop / retina     |
| `original` | >2048px | Optional, for Pin Creator |

**Avatar Exception:** 50, 100, 200, 400 (smaller for profile images)

---

## Cached Fields Rebuild Triggers

| Cached Field            | Rebuild When                                             |
| ----------------------- | -------------------------------------------------------- |
| `faqs_json`             | content_json changes (scan for faq_section blocks)       |
| `cached_toc_json`       | content_json changes (scan for heading blocks)           |
| `cached_tags_json`      | articles_to_tags changes                                 |
| `cached_category_json`  | category_id changes OR categories table updates          |
| `cached_author_json`    | author_id changes OR authors table updates               |
| `cached_equipment_json` | recipe_json.equipment changes OR linked equipment updates |
| `cached_rating_json`    | recipe_json.aggregate_rating changes                     |
| `cached_recipe_json`    | recipe_json changes                                      |
| `cached_card_json`      | Any visible field changes (headline, thumbnail, etc.)    |
| `reading_time_minutes`  | content_json changes                                     |
| `jsonld_json`           | Any SEO-relevant field changes                           |

---

## CRUD Operations Guide

### Create Operations

> **AGENT RULE:** Always validate required fields and generate slug from headline/name if not provided.

**Create Article:**

```typescript
// Required fields
const required = [
  "slug",
  "headline",
  "short_description",
  "category_id",
  "author_id",
];

// Auto-generated fields
const autoFields = {
  created_at: "CURRENT_TIMESTAMP",
  updated_at: "CURRENT_TIMESTAMP",
  workflow_status: "draft",
  is_online: false,
  type: "article",
};

// Slug generation: "My Recipe Title" → "my-recipe-title"
const slug = headline
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
```

**Create with Relationships (Article + Tags):**

```typescript
// 1. Insert article first
const articleId = await db.insert(articles).values({...}).returning({ id: articles.id });

// 2. Insert tag relationships
for (const tagId of tagIds) {
  await db.insert(articles_to_tags).values({ article_id: articleId, tag_id: tagId });
}

// 3. Update cached_tags_json
await rebuildCachedTags(articleId);
```

### Update Operations

> **AGENT RULE:** Never update `slug` after creation (breaks SEO). Update `updated_at` automatically.

**Partial Update Pattern:**

```typescript
// Only update provided fields
const updates = {};
if (headline !== undefined) updates.headline = headline;
if (short_description !== undefined)
  updates.short_description = short_description;
// ...

await db
  .update(articles)
  .set({ ...updates, updated_at: new Date() })
  .where(eq(articles.id, id));
```

**Update with Cache Rebuild:**

```typescript
// After updating article
await Promise.all([
  rebuildCachedTags(articleId),
  rebuildCachedCategory(articleId),
  rebuildCachedAuthor(articleId),
  rebuildTableOfContents(articleId),
  rebuildFaqs(articleId),
  rebuildJsonLd(articleId),
]);
```

### Delete Operations

> **AGENT RULE:** Always soft delete. Never hard delete unless explicitly requested.

**Soft Delete:**

```typescript
await db
  .update(articles)
  .set({ deleted_at: new Date() })
  .where(eq(articles.id, id));
```

**Hard Delete (Admin only, with cascade):**

```typescript
// 1. Delete junction table entries
await db.delete(articles_to_tags).where(eq(articles_to_tags.article_id, id));

// 2. Delete pinterest pins
await db.delete(pinterest_pins).where(eq(pinterest_pins.article_id, id));

// 3. Delete article
await db.delete(articles).where(eq(articles.id, id));
```

---

## Validation Rules

### Required Field Validation

| Table        | Required Fields (NOT NULL)                                      |
| ------------ | --------------------------------------------------------------- |
| `articles`   | slug, headline, short_description, category_id, author_id, type |
| `categories` | slug, label, short_description                                  |
| `authors`    | slug, name, email, short_description                            |
| `tags`       | slug, label                                                     |
| `media`      | name, alt_text, mime_type, variants_json                        |
| `equipment`  | slug, name                                                      |

> **AGENT NOTE:** These fields have `NOT NULL` constraints in the database. Validation should fail before attempting insert if any are missing.

### Slug Validation

```typescript
// Valid: lowercase, kebab-case, alphanumeric
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Invalid examples:
// "My Recipe" - contains spaces
// "my_recipe" - contains underscores
// "MyRecipe" - contains uppercase
// "-my-recipe" - starts with hyphen
```

### JSON Field Validation

Validate JSON fields with the dedicated validation schemas and contract modules. Do not enforce one global image variant list here; snapshot variant sets are context-specific.

---

## Service Layer Pattern

> **AGENT RULE:** All database access should go through service functions, not direct queries.

### File Structure

```
src/modules/
├── articles/
│   ├── schema/articles.schema.ts     # Drizzle table definition
│   ├── types/articles.types.ts       # TypeScript interfaces
│   ├── services/articles.service.ts  # CRUD operations
│   └── index.ts                      # Barrel export
├── categories/
│   ├── schema/categories.schema.ts
│   ├── types/categories.types.ts
│   ├── services/categories.service.ts
│   └── index.ts
└── shared/
    ├── utils/hydration.ts            # Hydration functions
    └── types/api.types.ts            # Shared API types
```

### Service Function Naming

| Operation     | Function Name Pattern                |
| ------------- | ------------------------------------ |
| Get by ID     | `getArticleById(db, id)`             |
| Get by slug   | `getArticleBySlug(db, slug)`         |
| Get list      | `getArticles(db, options)`           |
| Get count     | `getArticlesCount(db, options)`      |
| Create        | `createArticle(db, data)`            |
| Update        | `updateArticle(db, id, data)`        |
| Delete (soft) | `deleteArticle(db, id)`              |
| Search        | `searchArticles(db, query, options)` |

### Hydration Functions

```typescript
// Located in: src/shared/utils/hydration.ts

export function hydrateArticle(raw: RawArticle): HydratedArticle {
  return {
    ...raw,
    images: safeJsonParse(raw.images_json, {}),
    recipe: safeJsonParse(raw.recipe_json, null),
    content: safeJsonParse(raw.content_json, { version: 1, kind: "content_document", blocks: [] }),
    seo: safeJsonParse(raw.seo_json, {}),
    config: safeJsonParse(raw.config_json, {}),
    route: raw.type === "recipe" ? `/recipes/${raw.slug}` : `/blog/${raw.slug}`,
    imageUrl: extractImageUrl(raw.images_json, "md"),
  };
}

export function hydrateArticles(rawList: RawArticle[]): HydratedArticle[] {
  return rawList.map(hydrateArticle);
}
```
