# Database Schema Reference

> **Last Updated:** 2024-12-18  
> **Database:** Cloudflare D1 (SQLite)  
> **ORM:** Drizzle ORM

This document provides a comprehensive reference for all database tables, fields, relationships, and usage patterns.

---

## Table of Contents

1. [Overview](#overview)
2. [Tables](#tables)
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
3. [FTS5 Search Indexes](#fts5-search-indexes)
4. [JSON Field Schemas](#json-field-schemas)
5. [Relationships](#relationships)
6. [Cached Fields Strategy](#cached-fields-strategy)
7. [Query Patterns](#query-patterns)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  articles  ←──→  categories  ←──→  authors                 │
│      │                                   │                  │
│      └──→ tags (via articles_to_tags)    └──→ media        │
│      └──→ equipment                                         │
├─────────────────────────────────────────────────────────────┤
│                    PINTEREST LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  pinterest_boards  ←──→  pinterest_pins  ←──→  articles    │
│  pin_templates                                              │
├─────────────────────────────────────────────────────────────┤
│                    SYSTEM LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  site_settings  │  media  │  redirects  │  FTS5 indexes    │
└─────────────────────────────────────────────────────────────┘
```

### Field Naming Conventions

| Convention | Example |
|------------|---------|
| Primary key | `id` (INTEGER AUTOINCREMENT) |
| Foreign key | `{table}_id` (e.g., `author_id`) |
| Boolean | `is_{property}` (e.g., `is_online`) |
| Timestamp | `{event}_at` (e.g., `published_at`) |
| JSON fields | `{name}_json` (e.g., `images_json`) |
| Cached data | `cached_{name}_json` (e.g., `cached_author_json`) |
| Soft delete | `deleted_at` (NULL = active) |

---

## Tables

### site_settings

**Purpose:** Key-value store for global configuration.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `key` | TEXT | ✅ PK | Setting identifier (snake_case) |
| `value` | TEXT | ✅ | JSON configuration payload |
| `description` | TEXT | ❌ | Admin UI helper text |
| `category` | TEXT | ❌ | Grouping (`general`, `seo`, `social`, `theme`) |
| `sort_order` | INTEGER | ❌ | Display order (default: 0) |
| `type` | TEXT | ❌ | UI editor type (`json`, `text`, `boolean`, `image`) |
| `updated_at` | DATETIME | ❌ | Auto-updated timestamp |

**Common Keys:**
- `site_info` - Site name, tagline, logo
- `social_links` - Social media URLs
- `seo_defaults` - Default SEO settings
- `theme_config` - Colors, dark mode
- `scripts` - Analytics, tracking codes

---

### media

**Purpose:** Centralized asset library with responsive variants.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `name` | TEXT | ✅ | Human filename |
| `alt_text` | TEXT | ❌ | Accessibility text |
| `caption` | TEXT | ❌ | Display caption |
| `credit` | TEXT | ❌ | Attribution |
| `mime_type` | TEXT | ✅ | MIME type (image/webp) |
| `file_size` | INTEGER | ❌ | Original file size (bytes) |
| `width` | INTEGER | ❌ | Original width (px) |
| `height` | INTEGER | ❌ | Original height (px) |
| `blurhash` | TEXT | ❌ | BlurHash placeholder |
| `dominant_color` | TEXT | ❌ | Hex color (#ff6600) |
| `variants_json` | TEXT | ✅ | Responsive variants (xs/sm/md/lg) |
| `folder` | TEXT | ❌ | Organization folder |
| `tags_json` | TEXT | ❌ | Media tags array |
| `created_at` | DATETIME | ❌ | Upload timestamp |
| `updated_at` | DATETIME | ❌ | Last modification |
| `deleted_at` | DATETIME | ❌ | Soft delete marker |

**variants_json Schema:**
```json
{
  "xs": { "url": "...", "width": 360, "height": 540, "r2_key": "..." },
  "sm": { "url": "...", "width": 720, "height": 1080, "r2_key": "..." },
  "md": { "url": "...", "width": 1200, "height": 1800, "r2_key": "..." },
  "lg": { "url": "...", "width": 2048, "height": 3072, "r2_key": "..." }
}
```

---

### categories

**Purpose:** Article/recipe categorization with navigation support.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | URL path (/category/desserts) |
| `name` | TEXT | ✅ | Display name |
| `description` | TEXT | ❌ | Category description |
| `short_description` | TEXT | ❌ | Card/meta text |
| `parent_id` | INTEGER | ❌ FK | Parent category (hierarchy) |
| `display_order` | INTEGER | ❌ | Navigation order |
| `color_hex` | TEXT | ❌ | Theme color |
| `icon_svg` | TEXT | ❌ | SVG icon markup |
| `images_json` | TEXT | ❌ | Cover/thumbnail images |
| `seo_json` | TEXT | ❌ | SEO overrides |
| `config_json` | TEXT | ❌ | Layout configuration |
| `cached_post_count` | INTEGER | ❌ | Denormalized count |
| `is_featured` | BOOLEAN | ❌ | Homepage featured |
| `is_nav` | BOOLEAN | ❌ | Show in navigation |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |
| `deleted_at` | DATETIME | ❌ | Soft delete |

---

### authors

**Purpose:** Content creators with profiles and social links.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | URL path (/author/jane-doe) |
| `name` | TEXT | ✅ | Display name |
| `email` | TEXT | ❌ UNIQUE | Contact email |
| `job_title` | TEXT | ❌ | Professional title |
| `role` | TEXT | ❌ | System role (admin/editor/writer) |
| `headline` | TEXT | ❌ | Author tagline |
| `short_description` | TEXT | ❌ | Brief bio |
| `introduction` | TEXT | ❌ | Full introduction |
| `images_json` | TEXT | ❌ | Avatar images (smaller breakpoints) |
| `bio_json` | TEXT | ❌ | Extended bio + socials |
| `seo_json` | TEXT | ❌ | SEO overrides |
| `cached_post_count` | INTEGER | ❌ | Denormalized count |
| `is_featured` | BOOLEAN | ❌ | Team page featured |
| `sort_order` | INTEGER | ❌ | Team page order |
| `is_online` | BOOLEAN | ❌ | Profile visibility |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |
| `deleted_at` | DATETIME | ❌ | Soft delete |

---

### tags

**Purpose:** Flexible labeling system for filtering and discovery.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | URL-safe identifier |
| `label` | TEXT | ✅ | Display label |
| `description` | TEXT | ❌ | Tag description |
| `filter_groups_json` | TEXT | ❌ | Filter categorization |
| `style_json` | TEXT | ❌ | Visual styling (color, icon) |
| `cached_post_count` | INTEGER | ❌ | Denormalized count |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |
| `deleted_at` | DATETIME | ❌ | Soft delete |

**filter_groups_json Example:**
```json
["diet", "difficulty", "time"]
```

---

### equipment

**Purpose:** Centralized kitchen equipment with affiliate links.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | URL path (/equipment/stand-mixer) |
| `name` | TEXT | ✅ | Display name |
| `description` | TEXT | ❌ | Short description (tooltips) |
| `category` | TEXT | ❌ | Equipment category (appliances, bakeware) |
| `image_json` | TEXT | ❌ | Product image |
| `affiliate_url` | TEXT | ❌ | Primary affiliate link |
| `affiliate_provider` | TEXT | ❌ | Provider (amazon, williams-sonoma) |
| `affiliate_note` | TEXT | ❌ | Disclosure override |
| `price_display` | TEXT | ❌ | Display price ($299.99) |
| `is_active` | BOOLEAN | ❌ | Visibility toggle |
| `sort_order` | INTEGER | ❌ | Display order |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |
| `deleted_at` | DATETIME | ❌ | Soft delete |

---

### articles

**Purpose:** Core content table for posts, recipes, and roundups.

#### Identity & Relations

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | URL path |
| `type` | TEXT | ✅ | Content type (`article`, `recipe`, `roundup`) |
| `locale` | TEXT | ❌ | Language code (default: en) |
| `category_id` | INTEGER | ✅ FK | Parent category |
| `author_id` | INTEGER | ✅ FK | Content author |
| `parent_article_id` | INTEGER | ❌ FK | Pillar/cluster parent |

#### Display Metadata

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `headline` | TEXT | ✅ | Main H1 / recipe name |
| `subtitle` | TEXT | ❌ | Optional tagline |
| `short_description` | TEXT | ✅ | Card text / meta fallback |
| `excerpt` | TEXT | ❌ | Newsletter teaser |
| `introduction` | TEXT | ❌ | Hero copy |

#### Content Fields

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `images_json` | TEXT | ❌ | Cover, thumbnail, gallery images |
| `content_json` | TEXT | ❌ | Block-based content (paragraphs, images, etc.) |
| `recipe_json` | TEXT | ❌ | Full recipe data (type='recipe' only) |
| `roundup_json` | TEXT | ❌ | Listicle data (type='roundup' only) |
| `faqs_json` | TEXT | ❌ | Cached FAQs for JSON-LD |

#### Cached Fields (Zero-Join)

| Column | Type | Description |
|--------|------|-------------|
| `related_articles_json` | TEXT | Related article snapshots |
| `cached_tags_json` | TEXT | Flattened tag labels |
| `cached_category_json` | TEXT | Category snapshot |
| `cached_author_json` | TEXT | Author snapshot with avatar |
| `cached_equipment_json` | TEXT | Equipment with affiliate links |
| `cached_comment_count` | INTEGER | Comment count |
| `cached_rating_json` | TEXT | Star rating snapshot |
| `cached_toc_json` | TEXT | Table of contents |
| `cached_recipe_json` | TEXT | Recipe card summary |
| `reading_time_minutes` | INTEGER | Estimated reading time |

#### Scalar Indexes

| Column | Type | Description |
|--------|------|-------------|
| `total_time_minutes` | INTEGER | Recipe total time (indexable) |
| `difficulty_label` | TEXT | Difficulty level (indexable) |

#### SEO & Config

| Column | Type | Description |
|--------|------|-------------|
| `seo_json` | TEXT | SEO overrides (meta, OG, canonical) |
| `jsonld_json` | TEXT | Pre-generated JSON-LD schemas |
| `config_json` | TEXT | Feature toggles (comments, TOC, experiments) |

#### Workflow

| Column | Type | Description |
|--------|------|-------------|
| `workflow_status` | TEXT | `draft`, `in_review`, `scheduled`, `published`, `archived` |
| `scheduled_at` | DATETIME | Scheduled publish time |

#### System

| Column | Type | Description |
|--------|------|-------------|
| `is_online` | BOOLEAN | Public visibility |
| `is_favorite` | BOOLEAN | Featured/pinned |
| `access_level` | INTEGER | 0=Public, 1=Members, 2=Premium |
| `view_count` | INTEGER | Page views |
| `published_at` | DATETIME | First publish timestamp |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update |
| `deleted_at` | DATETIME | Soft delete |

---

### articles_to_tags

**Purpose:** Many-to-many relationship between articles and tags.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `article_id` | INTEGER | ✅ FK | Article reference |
| `tag_id` | INTEGER | ✅ FK | Tag reference |

**Primary Key:** Composite (article_id, tag_id)

---

### pinterest_boards

**Purpose:** Pinterest board targets for pin organization.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | Internal handle |
| `name` | TEXT | ✅ | Display name |
| `description` | TEXT | ❌ | Board description |
| `board_url` | TEXT | ❌ | Pinterest board URL |
| `cover_image_url` | TEXT | ❌ | Admin preview image |
| `locale` | TEXT | ❌ | Target language |
| `is_active` | BOOLEAN | ❌ | Selectable for new pins |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |
| `deleted_at` | DATETIME | ❌ | Soft delete |

---

### pinterest_pins

**Purpose:** Pin assets ready for manual upload or CSV export.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `article_id` | INTEGER | ❌ FK | Source article |
| `board_id` | INTEGER | ❌ FK | Target board |
| `section_name` | TEXT | ❌ | Board section |
| `image_url` | TEXT | ✅ | Pin image URL |
| `destination_url` | TEXT | ✅ | Traffic destination |
| `title` | TEXT | ✅ | Pin title |
| `description` | TEXT | ❌ | Pin description |
| `tags_json` | TEXT | ❌ | Pin hashtags |
| `status` | TEXT | ❌ | `draft`, `scheduled`, `exported`, `published`, `failed` |
| `pinterest_pin_id` | TEXT | ❌ | Actual Pinterest ID |
| `exported_at` | DATETIME | ❌ | Last export time |
| `export_batch_id` | TEXT | ❌ | Export batch identifier |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |

---

### pin_templates

**Purpose:** Reusable canvas templates for pin generation.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `slug` | TEXT | ✅ UNIQUE | URL routing identifier |
| `name` | TEXT | ✅ | Display name |
| `description` | TEXT | ❌ | Template description |
| `category` | TEXT | ❌ | `recipe`, `listicle`, `quote`, `general` |
| `thumbnail_url` | TEXT | ❌ | Preview image URL |
| `width` | INTEGER | ❌ | Pin width (default: 1000) |
| `height` | INTEGER | ❌ | Pin height (default: 1500) |
| `elements_json` | TEXT | ✅ | Canvas design configuration |
| `is_active` | BOOLEAN | ❌ | Available in picker |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |

---

### redirects

**Purpose:** 301/302 redirects for SEO and broken link handling.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | INTEGER | ✅ PK | Auto-increment ID |
| `from_path` | TEXT | ✅ UNIQUE | Old path |
| `to_path` | TEXT | ✅ | New path |
| `status_code` | INTEGER | ❌ | HTTP code (301/302) |
| `is_active` | BOOLEAN | ❌ | Redirect enabled |
| `hit_count` | INTEGER | ❌ | Usage counter |
| `created_at` | DATETIME | ❌ | Creation timestamp |
| `updated_at` | DATETIME | ❌ | Last update |

---

## FTS5 Search Indexes

### idx_articles_search

Full-text search index for articles and recipes.

| Column | Source |
|--------|--------|
| `headline` | articles.headline |
| `subtitle` | articles.subtitle |
| `short_description` | articles.short_description |
| `body_content` | Flattened content_json + recipe_json |
| `tag_labels` | Flattened cached_tags_json |
| `author_name` | cached_author_json.name |
| `category_name` | cached_category_json.name |

**Search Query:**
```sql
SELECT articles.*
FROM idx_articles_search
JOIN articles ON articles.id = idx_articles_search.rowid
WHERE idx_articles_search MATCH 'vegan chicken quick'
ORDER BY rank
LIMIT 20;
```

### idx_media_search_fts

Full-text search for media library.

| Column | Source |
|--------|--------|
| `name` | media.name |
| `alt_text` | media.alt_text |
| `caption` | media.caption |
| `credit` | media.credit |

---

## JSON Field Schemas

### images_json (Standard)

```json
{
  "cover": {
    "media_id": 123,
    "alt": "Description",
    "caption": "Photo credit",
    "focal_point": { "x": 0.5, "y": 0.3 },
    "variants": {
      "xs": { "url": "...", "width": 360 },
      "sm": { "url": "...", "width": 720 },
      "md": { "url": "...", "width": 1200 },
      "lg": { "url": "...", "width": 2048 }
    }
  },
  "thumbnail": { ... },
  "gallery": [ ... ]
}
```

### content_json Block Types

| Category | Types |
|----------|-------|
| **Text** | `paragraph`, `heading`, `blockquote`, `list` |
| **Media** | `image`, `gallery`, `video` |
| **Callouts** | `tip_box`, `cta_button` |
| **Embeds** | `embed`, `recipe_card`, `product_card` |
| **Layout** | `divider`, `spacer`, `ad_slot`, `table` |
| **Food Blog** | `before_after`, `ingredient_spotlight`, `faq_section` |

### recipe_json (Complete)

```json
{
  "servings": 4,
  "recipeYield": "Makes 12 cookies",
  "suitableForDiet": ["VeganDiet", "GlutenFreeDiet"],
  "difficulty": "Easy",
  "cookingMethod": "Baking",
  "estimatedCost": "$",
  "prep": 15,
  "cook": 25,
  "total": 40,
  "prepTime": "PT15M",
  "cookTime": "PT25M",
  "totalTime": "PT40M",
  "ingredients": [
    {
      "section": "Dry Ingredients",
      "items": [
        {
          "name": "All-purpose flour",
          "amount": 2,
          "unit": "cups",
          "notes": "sifted",
          "substitutes": [
            { "name": "Almond flour", "ratio": "1:1", "notes": "for gluten-free" }
          ]
        }
      ]
    }
  ],
  "instructions": [
    {
      "section": "Preparation",
      "steps": [
        { "order": 1, "text": "Preheat oven to 350°F", "timer": 0, "image": null }
      ]
    }
  ],
  "tips": ["Let cookies cool for 5 minutes before transferring"],
  "nutrition": {
    "calories": "320 kcal",
    "fatContent": "12g",
    "carbohydrateContent": "40g",
    "proteinContent": "4g"
  },
  "aggregateRating": { "ratingValue": 4.8, "ratingCount": 55 },
  "equipment": [
    { "equipment_id": 1, "required": true },
    { "equipment_id": 5, "required": false, "notes": "or use hand mixer" }
  ],
  "video": {
    "url": "https://...",
    "name": "How to Make Cookies",
    "duration": "PT2M30S"
  }
}
```

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

## Cached Fields Strategy

### When to Rebuild

| Cached Field | Rebuild Trigger |
|--------------|-----------------|
| `faqs_json` | content_json changes (scan for faq_section blocks) |
| `cached_toc_json` | content_json changes (scan for heading blocks) |
| `cached_tags_json` | articles_to_tags changes |
| `cached_category_json` | category_id changes OR categories table updates |
| `cached_author_json` | author_id changes OR authors table updates |
| `cached_equipment_json` | recipe_json.equipment changes OR equipment table updates |
| `cached_rating_json` | recipe_json.aggregateRating changes |
| `cached_recipe_json` | recipe_json changes |
| `reading_time_minutes` | content_json changes |
| `jsonld_json` | Any SEO-relevant field changes |

### Implementation Pattern

```javascript
async function saveArticle(articleData) {
  // 1. Rebuild all caches before save
  articleData.faqs_json = extractFAQs(articleData.content_json);
  articleData.cached_toc_json = generateTOC(articleData.content_json);
  articleData.cached_author_json = await getAuthorSnapshot(articleData.author_id);
  articleData.cached_category_json = await getCategorySnapshot(articleData.category_id);
  // ... other caches
  
  // 2. Save to database
  await db.insert(articles).values(articleData);
  
  // 3. Purge CDN cache for this article
  await purgeCache(`/recipes/${articleData.slug}`);
}
```

---

## Query Patterns

### Listing Pages (Fast - Minimal Fields)

```typescript
const listingFields = {
  slug: articles.slug,
  headline: articles.headline,
  images_json: articles.images_json,
  cached_recipe_json: articles.cached_recipe_json,
  cached_author_json: articles.cached_author_json,
  cached_category_json: articles.cached_category_json,
  cached_tags_json: articles.cached_tags_json,
  published_at: articles.published_at,
};

const recipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    isNull(articles.deleted_at)
  ))
  .orderBy(desc(articles.published_at))
  .limit(20);
```

### Article Page (Full Data)

```typescript
const article = await db
  .select()
  .from(articles)
  .where(eq(articles.slug, slug))
  .get();
```

### Filtered Recipes

```typescript
const quickRecipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    lte(articles.total_time_minutes, 30),
    eq(articles.type, 'recipe')
  ))
  .orderBy(articles.total_time_minutes);
```

### Full-Text Search

```typescript
const results = await db.run(sql`
  SELECT articles.*
  FROM idx_articles_search
  JOIN articles ON articles.id = idx_articles_search.rowid
  WHERE idx_articles_search MATCH ${searchTerm}
  ORDER BY rank
  LIMIT 20
`);
```

---

## Image Breakpoints

Standard responsive sizes (pixels):

| Variant | Width | Use Case |
|---------|-------|----------|
| `xs` | 360 | Mobile thumbnails |
| `sm` | 720 | Mobile full-width |
| `md` | 1200 | Tablet / small desktop |
| `lg` | 2048 | Full desktop / retina |
| `original` | >2048 | Optional, hero images only |

**Avatar exception:** 50, 100, 200, 400 (smaller for profile images)
