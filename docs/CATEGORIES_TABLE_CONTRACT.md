# Categories Table Contract

> **Last Updated:** 2026-05-14

This document is the product/data contract for the `categories` table. The executable SQL source remains `db/schema.sql`.

## Scope

`categories` is the primary taxonomy for articles and recipes. It owns public category pages, navigation hierarchy, category visuals, and category-level SEO/configuration.

Related contracts:

- `docs/ARTICLE_TABLE_CONTRACT.md` for `articles.category_id` and `cached_category_json`
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for article-side category snapshots
- `docs/IMAGE_JSON_CONTRACT.md` for `images_json`
- `docs/MEDIA_TABLE_CONTRACT.md` for source media records
- `docs/NAMING_CONTRACT.md` for stored JSON naming rules

## Source Of Truth

The `categories` row is the source of truth for category identity, hierarchy, display text, visuals, and SEO overrides.

`articles.category_id` is the source of truth for the article's primary category. `articles.cached_category_json` is only a regenerable snapshot for cards, lists, search, and public rendering shortcuts.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. |
| `slug` | yes | Admin/API | Unique route identifier. Lowercase kebab-case. Treat as stable after publish. |
| `label` | yes | Admin/API | Short public category name for navigation, cards, breadcrumbs, filters, and snapshots. |
| `parent_id` | no | Admin/API | Optional self-reference to `categories.id`; deleted parents set children to root. |
| `depth` | no | App | Denormalized hierarchy depth. `0` means root. |
| `sort_order` | no | Admin/navigation | Navigation ordering. Lower appears first. |
| `headline` | no | Admin/editorial | Category landing page H1. Falls back to `label`. |
| `collection_title` | no | Admin/editorial | Heading above the article grid/list. Falls back to generated collection copy from `label`. |
| `short_description` | yes | Admin/editorial | Short public intro and SEO fallback. |
| `images_json` | no | Admin/media | Category image slots. See `docs/IMAGE_JSON_CONTRACT.md`. |
| `color` | no | Admin/design | Category accent color. Stored as hex, default `#ff6600ff`. |
| `seo_json` | no | Admin/SEO | Category SEO overrides. Empty object means derive from base fields. |
| `is_featured` | no | Admin/editorial | Homepage/sidebar feature flag. |
| `is_online` | no | Admin/workflow | Public category visibility. |
| `cached_post_count` | no | App/DB | Denormalized count of online, non-deleted articles in this category. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active queries must filter `deleted_at IS NULL`. |

## Display Text Rules

`label`, `headline`, and `collection_title` have distinct rendering roles:

- `label` is the short category identity.
- `headline` is the page H1 for the category landing page.
- `collection_title` is the heading above the article collection/grid.

Rules:

- Use `label` for navigation, breadcrumbs, category badges, chips, filters, and
  `cached_category_json`.
- Use `headline` as the H1 on `/categories/{slug}`.
- If `headline` is null, the category page H1 uses `label`.
- Use `collection_title` only above the article list/grid section.
- If `collection_title` is null, the renderer derives collection copy from
  `label`, such as `Latest Breakfast Recipes`.
- Do not use `collection_title` in badges, breadcrumbs, article cards, or
  `cached_category_json`.
- Do not use `headline` as the short category label in compact UI.

## JSON Fields

### `images_json`

Purpose: category-specific image slots copied from the `media` table.

Shape:

```json
{
  "hero": {
    "media_id": 202,
    "alt": "Breakfast table",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "16:9",
    "variants": {
      "sm": { "r2_key": "media/breakfast-hero-sm.webp", "width": 720, "height": 405 },
      "md": { "r2_key": "media/breakfast-hero-md.webp", "width": 1200, "height": 675 },
      "lg": { "r2_key": "media/breakfast-hero-lg.webp", "width": 2048, "height": 1152 }
    }
  },
  "thumbnail": {
    "media_id": 105,
    "alt": "Healthy breakfast bowl",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "1:1",
    "variants": {
      "xs": { "r2_key": "media/breakfast-xs.webp", "width": 360, "height": 360 },
      "sm": { "r2_key": "media/breakfast-sm.webp", "width": 720, "height": 720 }
    }
  }
}
```

Rules:

- `media.variants_json` keeps the complete source set.
- `hero` and `thumbnail` are the only v1 category image slots.
- `hero` stores `sm`, `md`, and `lg`.
- `thumbnail` stores `xs` and `sm`.
- `placeholder` is required when a slot exists.
- Category `hero` and `thumbnail` snapshots must not store `caption` or
  `credit`.
- Category snapshots must not store `original`.
- Stored internal snapshots contain `r2_key`; public API/frontend props must convert to URLs.
- `focal_point` and `aspect_ratio` follow `docs/IMAGE_JSON_CONTRACT.md`.
- Every rendered `<img>` must have `width`, `height`, and lazy loading unless it is the LCP hero image.

### `seo_json`

Purpose: optional SEO overrides for the category page.

```json
{
  "meta_title": "Easy Breakfast Recipes | SaaS Blog",
  "meta_description": "Discover quick and healthy breakfast recipes.",
  "no_index": false,
  "canonical": null,
  "og_image": "https://example.com/images/breakfast-og.webp",
  "og_title": null,
  "og_description": null,
  "twitter_card": "summary_large_image"
}
```

Rules:

- `meta_title` is a string or `null`. When `null`, render fallback uses
  `headline`, then `label`.
- `meta_description` is a string or `null`. When `null`, render fallback uses
  `short_description`.
- `no_index` is a boolean. `true` emits a noindex robots directive for the
  category page.
- `canonical` is a string or `null`. `null` means the canonical URL is derived
  from `/categories/{slug}`.
- `og_image` must be a non-empty public image URL before publish.
- `og_image` is derived from the largest suitable category image available in
  this order:
  - `images_json.hero.variants.lg`
  - `images_json.hero.variants.md`
  - `images_json.thumbnail.variants.sm`
  - site default OG image
- When category image snapshots change, regenerate `seo_json.og_image`.
- Open Graph image fallback must not use `xs` and must not use `original`.
- Open Graph image output exposes the stored public `og_image` URL, never
  stored `r2_key`.
- `og_title` is a string or `null`. When `null`, fallback uses the resolved
  `meta_title`.
- `og_description` is a string or `null`. When `null`, fallback uses the
  resolved `meta_description`.
- `twitter_card` must be `summary` or `summary_large_image`; default is
  `summary_large_image`.
- `seo_json` must not contain Schema.org or JSON-LD payloads.
- `seo_json` must not contain article-list data, category settings, social
  handles, or image snapshots.

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
- Article cards use `articles.cached_category_json` instead of joining `categories`.
- Navigation reads online, non-deleted categories ordered by `sort_order`.

## Validation Rules

- `slug`: required, unique, lowercase kebab-case.
- `label`: required, short enough for navigation.
- `short_description`: required.
- `parent_id`: must not create cycles.
- `depth`: app-maintained and must match the hierarchy.
- `images_json` and `seo_json`: valid JSON.
- Public queries: `deleted_at IS NULL`; public navigation also requires `is_online = 1`.

## Category Page Settings

Category page behavior is global for all category pages and belongs in
`site_settings.category_page_settings`, not in individual category rows.

Global settings include:

- `posts_per_page`
- `layout_mode`
- `card_style`
- `show_sidebar`
- `show_filters`
- `show_breadcrumb`
- `article_sort_by`
- `article_sort_order`
- `header_style`

`categories.sort_order` remains a per-category navigation/list ordering column.
It is not the same as `article_sort_order`.

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
