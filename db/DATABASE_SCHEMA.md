# Database Schema Reference

> **Last Updated:** 2026-01-10  
> **Database:** Cloudflare D1 (SQLite)  
> **ORM:** Drizzle ORM

This document provides a comprehensive reference for all database tables, fields, relationships, and usage patterns.

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

1. **Never store `null` for empty JSON** - use `{}` for objects, `[]` for arrays.
2. **Validate JSON structure** before inserting - match schemas below exactly.
3. **Image variants must include ALL breakpoints** - xs, sm, md, lg (original is optional).
4. **All URLs must be absolute** - no relative paths in JSON fields.

### Naming Conventions

| Type            | Convention            | Example                    |
| --------------- | --------------------- | -------------------------- |
| Slugs           | lowercase, kebab-case | `chocolate-chip-cookies`   |
| JSON keys       | camelCase             | `mediaId`, `focalPoint`    |
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
| `variants_json`    | TEXT     | ✅       | -                   | **See schema below**                 |
| `focal_point_json` | TEXT     | ❌       | `'{"x":50,"y":50}'` | Cropping focal point                 |
| `created_at`       | DATETIME | ❌       | CURRENT_TIMESTAMP   | Upload timestamp                     |
| `updated_at`       | DATETIME | ❌       | CURRENT_TIMESTAMP   | Last modification                    |
| `deleted_at`       | DATETIME | ❌       | NULL                | Soft delete marker                   |

#### variants_json Schema

```json
{
  "variants": {
    "original": {
      "url": "https://cdn.example.com/2025/01/image.webp",
      "r2_key": "2025/01/image.webp",
      "width": 4000,
      "height": 3000,
      "sizeBytes": 412345
    },
    "lg": {
      "url": "https://cdn.example.com/2025/01/image-lg.webp",
      "r2_key": "2025/01/image-lg.webp",
      "width": 2048,
      "height": 1536,
      "sizeBytes": 198765
    },
    "md": {
      "url": "https://cdn.example.com/2025/01/image-md.webp",
      "r2_key": "2025/01/image-md.webp",
      "width": 1200,
      "height": 900,
      "sizeBytes": 102345
    },
    "sm": {
      "url": "https://cdn.example.com/2025/01/image-sm.webp",
      "r2_key": "2025/01/image-sm.webp",
      "width": 720,
      "height": 540,
      "sizeBytes": 54321
    },
    "xs": {
      "url": "https://cdn.example.com/2025/01/image-xs.webp",
      "r2_key": "2025/01/image-xs.webp",
      "width": 360,
      "height": 270,
      "sizeBytes": 23123
    }
  },
  "placeholder": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

> **AGENT RULES:**
>
> - `xs`, `sm`, `md`, `lg` are **REQUIRED**. `original` is optional (only if source > 2048px).
> - `r2_key` is the path in R2 bucket - needed for deletion.
> - `sizeBytes` (optional) is the encoded file size for each variant, used by Media Library display.
> - `placeholder` is a base64 blur hash < 1KB.
> - Heights are auto-calculated from aspect ratio.

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
> 2. Use block-based `content_json` with flattened structure (no `data` wrapper).
> 3. Never auto-insert `ad_slot` blocks unless explicitly requested.
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
| `content_json` | TEXT | ❌       | `'[]'`    | **See content_json schema** (block-based body)  |
| `recipe_json`  | TEXT | ❌       | `'{...}'` | **See recipe_json schema** (type='recipe' only) |
| `roundup_json` | TEXT | ❌       | `'{...}'` | **See roundup_json schema** (type='roundup')    |
| `faqs_json`    | TEXT | ❌       | `'[]'`    | **See faqs_json schema**                        |

#### Cached Fields (Zero-Join Rendering)

> **AGENT NOTE:** These are auto-rebuilt on article save. Do not manually update.

| Column                  | Type    | Description                               |
| ----------------------- | ------- | ----------------------------------------- |
| `cached_tags_json`      | TEXT    | Flattened tag labels `["Vegan", "Quick"]` |
| `cached_category_json`  | TEXT    | Category snapshot                         |
| `cached_author_json`    | TEXT    | Author snapshot with avatar               |
| `cached_equipment_json` | TEXT    | Equipment with affiliate links            |
| `cached_rating_json`    | TEXT    | Star rating snapshot                      |
| `cached_toc_json`       | TEXT    | Table of contents from headings           |
| `cached_recipe_json`    | TEXT    | Recipe card summary for listings          |
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

| Column          | Type     | Required  | Default           | Description                              |
| --------------- | -------- | --------- | ----------------- | ---------------------------------------- |
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

## Complete JSON Schemas

### images_json (Standard - Categories, Articles)

> **AGENT RULE:** When selecting from Media Library, copy the full variant set here for zero-join rendering.

```json
{
  "cover": {
    "media_id": 123,
    "alt": "Chocolate brownies on cooling rack",
    "caption": "Fresh out of the oven",
    "credit": "© Jane Doe Photography",
    "placeholder": "data:image/jpeg;base64,/9j/4AAQ...",
    "focal_point": { "x": 50, "y": 30 },
    "aspectRatio": "16:9",
    "variants": {
      "original": { "url": "https://cdn.example.com/img.webp", "width": 4000, "height": 2250 },
      "lg": { "url": "https://cdn.example.com/img-lg.webp", "width": 2048, "height": 1152 },
      "md": { "url": "https://cdn.example.com/img-md.webp", "width": 1200, "height": 675 },
      "sm": { "url": "https://cdn.example.com/img-sm.webp", "width": 720, "height": 405 },
      "xs": { "url": "https://cdn.example.com/img-xs.webp", "width": 360, "height": 203 }
    }
  },
  "thumbnail": {
    "media_id": 124,
    "alt": "...",
    "aspectRatio": "4:3",
    "variants": { ... }
  },
  "contentImages": [
    {
      "media_id": 125,
      "alt": "Step 1: Mixing ingredients",
      "caption": "Combine dry ingredients",
      "variants": { ... }
    }
  ]
}
```

Note: `contentImages` holds images referenced in `content_json`.

### images_json (Authors - Different breakpoints for avatars)

```json
{
  "avatar": {
    "media_id": 105,
    "alt": "Jane Doe headshot",
    "placeholder": "data:image/...",
    "aspectRatio": "1:1",
    "variants": {
      "original": { "url": "...", "width": 800, "height": 800 },
      "lg": { "url": "...", "width": 400, "height": 400 },
      "md": { "url": "...", "width": 200, "height": 200 },
      "sm": { "url": "...", "width": 100, "height": 100 },
      "xs": { "url": "...", "width": 50, "height": 50 }
    }
  },
  "cover": {
    "media_id": 202,
    "alt": "Jane in her kitchen",
    "aspectRatio": "16:9",
    "variants": { ... }
  }
}
```

> **AGENT NOTE:** Avatar uses smaller sizes (50-400px) because avatars display at 32-120px typically.

---

### seo_json (Universal - Categories, Authors, Articles)

```json
{
  "metaTitle": "Best Chocolate Brownies Recipe | Freecipies",
  "metaDescription": "Learn how to make the fudgiest chocolate brownies with this easy recipe. Ready in 35 minutes!",
  "noIndex": false,
  "canonical": null,
  "ogImage": "https://cdn.example.com/og-image.jpg",
  "ogTitle": null,
  "ogDescription": null,
  "twitterCard": "summary_large_image",
  "robots": null
}
```

| Field           | Type    | Default                                | Description              |
| --------------- | ------- | -------------------------------------- | ------------------------ |
| metaTitle       | string  | null (falls back to headline)          | `<title>` tag            |
| metaDescription | string  | null (falls back to short_description) | Meta description         |
| noIndex         | boolean | false                                  | Hide from search engines |
| canonical       | string  | null                                   | Override canonical URL   |
| ogImage         | string  | null                                   | Social share image URL   |
| ogTitle         | string  | null (falls back to metaTitle)         | Open Graph title         |
| ogDescription   | string  | null                                   | Open Graph description   |
| twitterCard     | string  | "summary_large_image"                  | Twitter card type        |
| robots          | string  | null                                   | Custom robots directive  |

---

### config_json (Categories)

```json
{
  "postsPerPage": 12,
  "layoutMode": "grid",
  "cardStyle": "full",
  "showSidebar": true,
  "showFilters": true,
  "showBreadcrumb": true,
  "showPagination": true,
  "sortBy": "publishedAt",
  "sortOrder": "desc",
  "headerStyle": "hero",
  "tldr": "Quick summary text",
  "showInNav": true,
  "showInFooter": false,
  "featuredArticleId": 123,
  "showFeaturedRecipe": true,
  "showHeroCta": true,
  "heroCtaText": "Join My Mailing List",
  "heroCtaLink": "#newsletter"
}
```

| Field            | Type    | Options                             | Default       |
| ---------------- | ------- | ----------------------------------- | ------------- |
| postsPerPage     | number  | -                                   | 12            |
| layoutMode       | string  | `grid`, `list`, `masonry`           | `grid`        |
| cardStyle        | string  | `compact`, `full`, `minimal`        | `full`        |
| showSidebar      | boolean | -                                   | true          |
| showFilters      | boolean | -                                   | true          |
| showBreadcrumb   | boolean | -                                   | true          |
| showPagination   | boolean | -                                   | true          |
| sortBy           | string  | `publishedAt`, `title`, `viewCount` | `publishedAt` |
| sortOrder        | string  | `asc`, `desc`                       | `desc`        |
| headerStyle      | string  | `hero`, `minimal`, `none`           | `hero`        |
| tldr             | string  | -                                   | null          |
| showInNav        | boolean | -                                   | null          |
| showInFooter     | boolean | -                                   | null          |
| featuredArticleId | number  | -                                   | null          |
| showFeaturedRecipe | boolean | -                                   | true          |
| showHeroCta      | boolean | -                                   | true          |
| heroCtaText      | string  | -                                   | null          |
| heroCtaLink      | string  | -                                   | null          |

---

### i18n_json (Categories - locale overrides)

```json
{
  "fr": { "label": "Petit-déjeuner", "headline": "Recettes du matin" },
  "es": { "label": "Desayuno", "headline": "Recetas de desayuno" }
}
```

---

### config_json (Articles)

```json
{
  "allowComments": true,
  "showTableOfContents": true,
  "manualRelatedIds": [],
  "experimentKey": null,
  "experimentVariant": null
}
```

| Field               | Type     | Description                    |
| ------------------- | -------- | ------------------------------ |
| allowComments       | boolean  | Enable/disable comments        |
| showTableOfContents | boolean  | Show/hide TOC                  |
| manualRelatedIds    | number[] | Hard-coded related article IDs |
| experimentKey       | string   | A/B test identifier            |
| experimentVariant   | string   | `A`, `B`, `control`, etc.      |

---

### bio_json (Authors)

```json
{
  "short": "Jane writes about healthy Mediterranean recipes...",
  "long": "## About Jane\n\nJane has been cooking since childhood...",
  "socials": [
    { "network": "twitter", "url": "https://x.com/jane", "label": "@janedoe" },
    { "network": "instagram", "url": "https://instagram.com/jane" },
    { "network": "youtube", "url": "https://youtube.com/@jane" },
    { "network": "website", "url": "https://jane.blog", "label": "My Blog" }
  ]
}
```

**Valid network values:** `twitter`, `instagram`, `facebook`, `youtube`, `pinterest`, `tiktok`, `linkedin`, `website`, `email`, `custom`

---

### filter_groups_json (Tags)

```json
["Diet", "Meal", "Time", "Difficulty"]
```

**Common groups:**

- `Diet`: Gluten Free, Vegan, Keto, Dairy Free
- `Meal`: Breakfast, Lunch, Dinner, Snack
- `Time`: Under 15 Min, Under 30 Min, Under 1 Hour
- `Difficulty`: Easy, Medium, Advanced
- `Occasion`: Holiday, Party, Weeknight

---

### style_json (Tags)

```json
{
  "svg_code": "<svg viewBox='0 0 24 24'><path d='M12 2L...'/></svg>",
  "color": "#10b981",
  "variant": "outline"
}
```

| Field    | Type   | Options                     | Description                       |
| -------- | ------ | --------------------------- | --------------------------------- |
| svg_code | string | -                           | Sanitized SVG (< 2KB, no scripts) |
| color    | string | -                           | Hex color for badge               |
| variant  | string | `solid`, `outline`, `ghost` | UI variant                        |

---

### recipe_json (Complete Schema)

> **AGENT RULE:** `headline` and `short_description` from articles table are the source of truth for name/description. This JSON focuses on recipe-specific data.

```json
{
  "prep": 15,
  "cook": 25,
  "total": 40,
  "servings": 4,
  "recipeYield": "Makes 12 cookies",

  "recipeCategory": "Dessert",
  "recipeCuisine": "American",
  "keywords": ["chocolate", "cookies", "easy"],
  "suitableForDiet": ["VeganDiet", "GlutenFreeDiet"],

  "difficulty": "Easy",
  "cookingMethod": "Baking",
  "estimatedCost": "$",

  "prepTime": "PT15M",
  "cookTime": "PT25M",
  "totalTime": "PT40M",

  "ingredients": [
    {
      "group_title": "Dry Ingredients",
      "items": [
        {
          "id": "dry-flour",
          "name": "all-purpose flour",
          "amount": 315.0,
          "unit": "grams",
          "notes": "sifted",
          "isOptional": false,
          "substitutes": [
            { "name": "whole wheat flour", "ratio": "1:1", "notes": "denser result" }
          ]
        }
      ]
    },
    {
      "group_title": "Wet Ingredients",
      "items": [ ... ]
    }
  ],

  "instructions": [
    {
      "section_title": "Preparation",
      "steps": [
        {
          "name": "Preheat Oven",
          "text": "Preheat oven to 350°F (175°C).",
          "timer": null,
          "image": null
        },
        {
          "name": "Bake",
          "text": "Bake until golden brown.",
          "timer": 1200,
          "image": "https://cdn.example.com/step2.jpg"
        }
      ]
    }
  ],

  "tips": [
    "Let cookies cool for 5 minutes before transferring",
    "Don't overmix the batter"
  ],

  "nutrition": {
    "calories": 320,
    "fatContent": "15g",
    "carbohydrateContent": "40g",
    "proteinContent": "4g",
    "sugarContent": "12g",
    "sodiumContent": "220mg",
    "servingSize": "1 cookie (80g)"
  },

  "aggregateRating": {
    "ratingValue": 4.8,
    "ratingCount": 55
  },

  "equipment": [
    { "equipment_id": 1, "required": true },
    { "equipment_id": 5, "required": false, "notes": "or use hand mixer" }
  ],

  "video": {
    "url": "https://youtube.com/watch?v=...",
    "name": "How to Make Chocolate Cookies",
    "description": "Step-by-step video tutorial",
    "thumbnailUrl": "https://cdn.example.com/video-thumb.jpg",
    "duration": "PT2M30S"
  }
}
```

#### Important Field Notes

| Field                               | Type     | Description                         |
| ----------------------------------- | -------- | ----------------------------------- |
| `prep`, `cook`, `total`             | number   | Minutes (for UI timers and filters) |
| `prepTime`, `cookTime`, `totalTime` | string   | ISO-8601 duration (for JSON-LD)     |
| `servings`                          | number   | Numeric for scaling UI              |
| `recipeYield`                       | string   | Display string for JSON-LD          |
| `suitableForDiet`                   | string[] | schema.org RestrictedDiet values    |
| `ingredients[].amount`              | number   | **FLOAT** - required for scaling    |
| `instructions[].timer`              | number   | **INTEGER** seconds or null         |

#### suitableForDiet Valid Values

```
VeganDiet, VegetarianDiet, GlutenFreeDiet, DiabeticDiet,
HalalDiet, HinduDiet, KosherDiet, LowCalorieDiet,
LowFatDiet, LowLactoseDiet, LowSaltDiet
```

---

### content_json (Block-Based Article Body)

> **AGENT RULE:** All `text` fields support Markdown. Use `react-markdown` or similar to render.

```json
[
  { "type": "paragraph", "text": "Rich text with **markdown** support..." },

  { "type": "heading", "level": 2, "text": "Section Title" },

  { "type": "blockquote", "text": "Quote text...", "cite": "Author Name" },

  { "type": "list", "style": "unordered", "items": ["Item 1", "Item 2", "Item 3"] },

  {
    "type": "image",
    "media_id": 123,
    "alt": "Description",
    "caption": "Photo caption",
    "credit": "(c) Photographer",
    "variants": { ... }
  },

  {
    "type": "video",
    "provider": "youtube",
    "videoId": "dQw4w9WgXcQ",
    "aspectRatio": "16:9"
  },

  {
    "type": "tip_box",
    "variant": "tip",
    "title": "Pro Tip",
    "text": "**Bold** and lists:\n1. Item\n2. Item"
  },


  { "type": "divider" },

  { "type": "spacer", "size": "md" },

  {
    "type": "faq_section",
    "title": "Common Questions",
    "items": [
      { "q": "Can I freeze the dough?", "a": "Yes, up to 3 months." },
      { "q": "Can I use almond milk?", "a": "Yes, same ratio." }
    ]
  },

  {
    "type": "ingredient_spotlight",
    "name": "Tahini",
    "description": "Sesame seed paste...",
    "image": { "media_id": 201, "variants": {...} },
    "tips": "Store in fridge after opening",
    "substitutes": ["Sunflower seed butter", "Cashew butter"],
    "link": "/ingredients/tahini"
  }
]
```

#### Block Type Reference

| Type          | Required Fields         | Optional Fields     |
| ------------- | ----------------------- | ------------------- |
| `paragraph`   | text                    | -                   |
| `heading`     | level (2-6), text       | -                   |
| `blockquote`  | text                    | cite                |
| `list`        | style, items            | -                   |
| `image`       | media_id, alt, variants | caption, credit     |
| `video`       | provider, videoId       | aspectRatio         |
| `tip_box`     | variant, text           | title               |
| `divider`     | -                       | -                   |
| `spacer`      | size                    | -                   |
| `faq_section` | items                   | title               |
| `table`       | headers, rows           | -                   |

---

### roundup_json (Listicle/Collection)

```json
{
  "listType": "ItemList",
  "items": [
    {
      "position": 1,
      "article_id": 123,
      "external_url": null,
      "title": "Best Lemon Biscuits",
      "subtitle": "Crisp edges, fluffy center",
      "note": "Great for brunch.",
      "cover": {
        "alt": "Lemon biscuits",
        "variants": { ... }
      }
    },
    {
      "position": 2,
      "article_id": null,
      "external_url": "https://example.com/recipe",
      "title": "External Recipe",
      "subtitle": "From another site",
      "note": "Affiliate link",
      "cover": { ... }
    }
  ]
}
```

---

### faqs_json (SEO Cache)

> **AGENT NOTE:** Auto-rebuilt by scanning content_json for `faq_section` blocks.

```json
[
  {
    "q": "Can I freeze the dough?",
    "a": "Yes, up to 3 months in an airtight container."
  },
  {
    "q": "Can I use almond milk?",
    "a": "Yes, the texture may be slightly different."
  }
]
```

---

### cached_card_json (Pre-computed Card Data)

**For type="recipe":**

```json
{
  "id": 42,
  "type": "recipe",
  "slug": "chocolate-brownies",
  "headline": "Best Chocolate Brownies",
  "short_description": "Fudgy, rich brownies...",
  "thumbnail": {
    "alt": "Chocolate Brownies",
    "variants": { "xs": {...}, "sm": {...}, "md": {...}, "lg": {...} }
  },
  "total_time": 35,
  "difficulty": "Easy",
  "servings": 12,
  "rating": { "value": 4.8, "count": 55 }
}
```

**For type="article":**

```json
{
  "id": 87,
  "type": "article",
  "slug": "baking-tips",
  "headline": "10 Baking Tips",
  "short_description": "Master these techniques...",
  "thumbnail": { ... },
  "reading_time": 8,
  "category": "Baking Tips"
}
```

**For type="roundup":**

```json
{
  "id": 123,
  "type": "roundup",
  "slug": "best-desserts",
  "headline": "15 Best Desserts",
  "short_description": "Our top picks...",
  "thumbnail": { ... },
  "item_count": 15
}
```

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
| `category_name`     | cached_category_json.name            |

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
| `cached_equipment_json` | recipe_json.equipment changes OR equipment table updates |
| `cached_rating_json`    | recipe_json.aggregateRating changes                      |
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

```typescript
// Before insert/update, validate JSON structure
function validateImagesJson(json: unknown): boolean {
  if (typeof json !== "object" || json === null) return false;

  // If has cover, validate variant structure
  if (json.cover) {
    const requiredVariants = ["xs", "sm", "md", "lg"];
    const hasAllVariants = requiredVariants.every(
      (v) => json.cover.variants?.[v]?.url
    );
    if (!hasAllVariants) return false;
  }

  return true;
}
```

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
    content: safeJsonParse(raw.content_json, []),
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


