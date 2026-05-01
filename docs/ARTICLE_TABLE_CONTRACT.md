# Article Table Contract

> **Last Updated:** 2026-04-29

This document is the canonical contract for the `articles` table.

For JSON payload details, use:

- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for cached fields on `articles`
- `docs/ARTICLE_JSON_CONTRACTS.md` for article JSON fields except `content_json`
- `docs/CONTENT_JSON_CONTRACT.md` for `articles.content_json`
- `docs/RECIPE_JSON_CONTRACT.md` for `articles.recipe_json`
- `docs/IMAGE_JSON_CONTRACT.md` for image slots and snapshots

## Purpose

`articles` is the central editorial content table for:

- standard articles
- recipes
- roundups/listicles

It owns routing, article identity, editorial metadata, primary relationships, source JSON payloads, cache snapshots, workflow state, access flags, and lifecycle timestamps.

It does not own media files, author profiles, category definitions, or tag membership labels. Those are referenced or snapshotted from their source tables.

## Table Shape

SQL table:

```sql
articles
```

Drizzle reference:

```txt
src/modules/articles/schema/articles.schema.ts
```

## Identity and Routing

| Column | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Internal article id used by relations and snapshots. |
| `slug` | yes | Globally unique public route handle. |
| `type` | yes | Content kind: `article`, `recipe`, or `roundup`. |
| `locale` | no | Locale code, default `en`. |

Rules:

- `slug` is globally unique in the current schema.
- Soft-deleted articles still keep their slug unless app logic changes it.
- `type` controls editor UI, frontend layout, schema generation, and required JSON expectations.

## Relationships

| Column | Required | Source table | Rule |
| --- | --- | --- | --- |
| `category_id` | yes | `categories.id` | Main taxonomy bucket. Uses `ON DELETE RESTRICT`. |
| `author_id` | yes | `authors.id` | Primary author. Uses `ON DELETE RESTRICT`. |
| `parent_article_id` | no | `articles.id` | Optional topic cluster or pillar relationship. Uses `ON DELETE SET NULL`. |

Tag membership is not stored directly on `articles`. It lives in `articles_to_tags`; `cached_tags_json` is only a regenerable list of minimal tag snapshots.

## Editorial Metadata

| Column | Required | Purpose |
| --- | --- | --- |
| `headline` | yes | Public H1 and recipe name for recipes. |
| `subtitle` | no | Secondary heading near the article title. |
| `short_description` | yes | Primary card/meta/schema description fallback. |
| `excerpt` | no | Longer teaser for archives, index pages, or newsletters. |
| `introduction` | no | Hero/chapeau copy before the main body. |

Rules:

- `headline` and `short_description` are source fields, not cache fields.
- Recipe name and description should come from `headline` and `short_description`.
- SEO overrides may replace metadata output, but not the source article meaning.

## Source JSON Fields

| Column | Role | Contract |
| --- | --- | --- |
| `images_json` | Article image slots: hero, thumbnail, content images, recipe step images. | `docs/ARTICLE_JSON_CONTRACTS.md` |
| `content_json` | Versioned block document for article body. | `docs/CONTENT_JSON_CONTRACT.md` |
| `recipe_json` | Complete recipe source data for `type = "recipe"`. | `docs/RECIPE_JSON_CONTRACT.md` |
| `roundup_json` | Compatibility list data for `type = "roundup"`. | `docs/ARTICLE_JSON_CONTRACTS.md` |
| `seo_json` | Per-article SEO overrides. | `docs/ARTICLE_JSON_CONTRACTS.md` |
| `config_json` | Article feature toggles and experiments. | `docs/ARTICLE_JSON_CONTRACTS.md` |

Rules:

- `content_json` is always a `ContentDocument`, not a raw block array.
- `main_recipe` in `content_json` is a position marker only; complete recipe data stays in `recipe_json`.
- Full recipe rendering reads `recipe_json`; cards, lists, filters, related content, and roundup previews should use derived caches.
- New roundup items should move toward `content_json.blocks[]` using `roundup_item`.
- `images_json` stores article image slots with `r2_key` variants, not public URLs.

## Cache and Snapshot Fields

Detailed shapes and regeneration rules are defined in `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.

| Column | Source of truth | Purpose |
| --- | --- | --- |
| `faqs_json` | `content_json` FAQ blocks | Intermediate FAQ extraction cache for `jsonld_json`. |
| `cached_tags_json` | `articles_to_tags` + `tags` | Minimal tag snapshots for display/search. |
| `cached_category_json` | `categories` | Category card/list snapshot. |
| `cached_author_json` | `authors` | Author byline/card snapshot. |
| `cached_equipment_json` | `recipe_json.equipment[*].equipment_id` + active `equipment` rows | Rich equipment card snapshots. |
| `cached_rating_json` | `recipe_json.aggregate_rating` | Rating snapshot. |
| `cached_toc_json` | `content_json` heading blocks | Table of contents cache. |
| `cached_recipe_json` | `recipe_json` | Lightweight recipe snapshot for lists, cards, roundup items, related content, and filters. |
| `cached_card_json` | article fields + image slot/media snapshot | Zero-join listing, picker, and related-content card. |
| `jsonld_json` | article source fields + caches including `faqs_json` | Final generated Schema.org JSON-LD cache. |

Rules:

- Cache fields are regenerable and should not become source of truth.
- Public rendering may prefer caches to avoid unnecessary D1 joins.
- Cache writes should use the same stored image rules: `r2_key`, `size_bytes`, `aspect_ratio`, no public URLs.
- `cached_equipment_json` does not need to contain every plain checklist item from `recipe_json.equipment`; uncached equipment renders as simple bullets/checklist items.

## Scalar Index Helpers

| Column | Mirrors | Purpose |
| --- | --- | --- |
| `reading_time_minutes` | computed from article body | Listing and UI display. |
| `total_time_minutes` | `recipe_json.total` or derived `prep + cook` | Recipe filters and indexes. |
| `difficulty_label` | `recipe_json.difficulty` | Recipe filters and indexes. |

Rules:

- Scalars exist for query speed.
- Their source remains the structured JSON or content source.
- They should be recalculated on article save when their source changes.

## Workflow and Access

| Column | Purpose |
| --- | --- |
| `workflow_status` | Editorial state: `draft`, `in_review`, `scheduled`, `published`, `archived`. |
| `scheduled_at` | Future publish time in UTC. |
| `is_online` | Public visibility flag. |
| `is_favorite` | Editorial curation flag for featured rails/homepage. |
| `access_level` | Access policy: `0` public, `1` members, `2` premium. |
| `view_count` | Simple global view counter. |

Rules:

- `is_online = 1` means the article may be publicly visible, subject to `access_level`.
- Triggers force online articles to `workflow_status = "published"`.
- `published_at` is set automatically the first time an article goes online.

## Lifecycle

| Column | Purpose |
| --- | --- |
| `published_at` | First public go-live timestamp. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp, trigger-managed. |
| `deleted_at` | Soft-delete marker. |

Rules:

- Active queries must filter `deleted_at IS NULL`.
- Hard deletes are guarded by trigger and converted into soft deletes.
- Timestamps should be treated as UTC.

## Index and Query Rules

Important indexes support:

- slug lookup
- online feed ordering
- category archive
- author archive
- parent/cluster lookup
- workflow filtering
- recipe time/difficulty filters
- soft-delete filtering

Search indexing is maintained separately through the article search triggers and reads from:

- article source fields
- `content_json.blocks`
- `recipe_json`
- cached tag/category/author labels

## Naming Rules

- SQL columns use `snake_case`: `short_description`, `content_json`, `cached_card_json`.
- Drizzle/TS/TSX properties use `camelCase`: `shortDescription`, `contentJson`, `cachedCardJson`.
- API payloads may use `camelCase`, but stored JSON contracts use their documented field names.
- Do not invent hybrid names such as `contentjson`, `content_JSON`, or `cachedcard_json`.
