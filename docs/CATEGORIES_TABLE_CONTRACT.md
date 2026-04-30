# Categories Table Contract

> **Last Updated:** 2026-04-29

This document is the product/data contract for the `categories` table. The executable SQL source remains `db/schema.sql`.

## Scope

`categories` is the primary taxonomy for articles and recipes. It owns public category pages, navigation hierarchy, category visuals, and category-level SEO/configuration.

Related contracts:

- `docs/ARTICLE_TABLE_CONTRACT.md` for `articles.category_id` and `cached_category_json`
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for article-side category snapshots
- `docs/MEDIA_IMAGE_CONTRACT.md` for `images_json`
- `docs/MEDIA_TABLE_CONTRACT.md` for source media records

## Source Of Truth

The `categories` row is the source of truth for category identity, hierarchy, display text, visuals, and SEO overrides.

`articles.category_id` is the source of truth for the article's primary category. `articles.cached_category_json` is only a regenerable snapshot for cards, lists, search, and public rendering shortcuts.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. |
| `slug` | yes | Admin/API | Unique route identifier. Lowercase kebab-case. Treat as stable after publish. |
| `label` | yes | Admin/API | Public display label for navigation, cards, breadcrumbs, and snapshots. |
| `parent_id` | no | Admin/API | Optional self-reference to `categories.id`; deleted parents set children to root. |
| `depth` | no | App | Denormalized hierarchy depth. `0` means root. |
| `headline` | no | Admin/editorial | Category landing page H1. Falls back to `label`. |
| `collection_title` | no | Admin/editorial | Heading above the article grid/list. Falls back to `headline` or `label`. |
| `short_description` | yes | Admin/editorial | Short public intro and SEO fallback. |
| `images_json` | no | Admin/media | Category image slots. See `docs/MEDIA_IMAGE_CONTRACT.md`. |
| `color` | no | Admin/design | Category accent color. Stored as hex, default `#ff6600ff`. |
| `icon_svg` | no | Admin/design | Small sanitized SVG for menus/badges. No scripts or event handlers. |
| `is_featured` | no | Admin/editorial | Homepage/sidebar feature flag. |
| `seo_json` | no | Admin/SEO | Category SEO overrides. Empty object means derive from base fields. |
| `config_json` | no | Admin/layout | Category page behavior and display configuration. |
| `i18n_json` | no | Admin/i18n | Locale-specific overrides. Optional until multilingual is active. |
| `sort_order` | no | Admin/navigation | Navigation ordering. Lower appears first. |
| `is_online` | no | Admin/workflow | Public category visibility. |
| `cached_post_count` | no | App/DB | Denormalized count of online, non-deleted articles in this category. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active queries must filter `deleted_at IS NULL`. |

## JSON Fields

### `images_json`

Purpose: category-specific image slots copied from the `media` table.

Expected slots:

```json
{
  "thumbnail": {
    "media_id": 105,
    "alt": "Healthy breakfast bowl",
    "variants": {
      "xs": { "r2_key": "media/breakfast-xs.webp", "width": 360, "height": 240 },
      "sm": { "r2_key": "media/breakfast-sm.webp", "width": 720, "height": 480 }
    }
  },
  "cover": {
    "media_id": 202,
    "alt": "Breakfast table",
    "variants": {
      "md": { "r2_key": "media/breakfast-cover-md.webp", "width": 1200, "height": 675 },
      "lg": { "r2_key": "media/breakfast-cover-lg.webp", "width": 2048, "height": 1152 }
    }
  }
}
```

Rules:

- `media.variants_json` keeps the complete source set.
- Category snapshots keep only variants useful for the render context.
- `thumbnail` stores `xs` and `sm`.
- `cover` stores `md` and `lg`.
- Stored internal snapshots may contain `r2_key`; public API/frontend props must convert to URLs.
- Every rendered `<img>` must have `width`, `height`, and lazy loading unless it is the LCP hero image.

### `seo_json`

Purpose: optional SEO overrides for the category page.

```json
{
  "meta_title": "Easy Breakfast Recipes | Freecipies",
  "meta_description": "Discover quick and healthy breakfast recipes.",
  "no_index": false,
  "canonical": null,
  "og_image": null,
  "og_title": null,
  "og_description": null,
  "twitter_card": "summary_large_image"
}
```

Rules:

- Prefer `snake_case` in new JSON fields.
- Missing values derive from `headline`, `label`, and `short_description`.
- `no_index: true` hides the category page from search.

### `config_json`

Purpose: category page layout and behavior.

```json
{
  "posts_per_page": 12,
  "layout_mode": "grid",
  "card_style": "full",
  "show_sidebar": true,
  "show_filters": true,
  "show_breadcrumb": true,
  "sort_by": "published_at",
  "sort_order": "desc",
  "header_style": "hero",
  "show_in_nav": true,
  "show_in_footer": false,
  "featured_article_id": null
}
```

Rules:

- This is configuration, not article content.
- Do not store large block content here.
- App defaults should fill missing keys.

### `i18n_json`

Purpose: locale-specific category copy overrides.

```json
{
  "fr": {
    "label": "Petit-dejeuner",
    "headline": "Recettes du matin",
    "short_description": "Des recettes rapides pour commencer la journee."
  }
}
```

Rules:

- Base columns remain the fallback.
- Locale keys must be valid site locales.

## Relationships

- `articles.category_id -> categories.id` is required and uses `ON DELETE RESTRICT`.
- `categories.parent_id -> categories.id` is optional and uses `ON DELETE SET NULL`.
- `articles.cached_category_json` is regenerated from `categories` when category identity/display fields change.

## Runtime Usage

Admin:

- Category editor creates and updates category rows.
- Media picker writes category `images_json` snapshots.
- Article editor reads category lookup data.

Public Astro:

- Category pages route by `slug`.
- Article cards may use `articles.cached_category_json` instead of joining `categories`.
- Navigation reads online, non-deleted categories ordered by `sort_order`.

## Validation Rules

- `slug`: required, unique, lowercase kebab-case.
- `label`: required, short enough for navigation.
- `short_description`: required.
- `parent_id`: must not create cycles.
- `depth`: app-maintained and must match the hierarchy.
- `images_json`, `seo_json`, `config_json`, `i18n_json`: valid JSON.
- `icon_svg`: sanitized, small, no scripts, no event handlers.
- Public queries: `deleted_at IS NULL`; public navigation also requires `is_online = 1`.

## Cache Rules

- `cached_post_count` counts online, non-deleted articles in the category.
- Article-side `cached_category_json` should include only the fields needed for cards/search:

```json
{
  "id": 3,
  "slug": "desserts",
  "label": "Desserts",
  "color": "#ff6600ff"
}
```
