# Tags Table Contract

> **Last Updated:** 2026-05-14

This document is the product/data contract for the `tags` table and the `articles_to_tags` join table. The executable SQL source remains `db/schema.sql`.

## Scope

`tags` owns secondary taxonomy labels used for discovery, badges, tag pages,
search, and tag clouds.

Related contracts:

- `docs/ARTICLE_TABLE_CONTRACT.md` for article/tag relationships
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for `cached_tags_json`
- `docs/DATABASE_CONTENT_MODEL.md` for relationship ownership

## Source Of Truth

`tags` owns tag identity and display metadata.

`articles_to_tags` is the source of truth for article/tag membership.

`articles.cached_tags_json` is only a regenerable display/search snapshot. It must use `label`, not `name`.

## `tags` Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. |
| `slug` | yes | Admin/API | Unique route/query identifier. Lowercase kebab-case. |
| `label` | yes | Admin/API | Public display label. Use `label`, never `name`, for tag snapshots. |
| `description` | no | Admin/SEO | Optional tag page intro, tooltip, and SEO fallback. |
| `style_json` | no | Admin/design | Optional badge styling. Defaults to `{}`. |
| `cached_post_count` | no | App | Denormalized count of online, non-deleted articles using this tag. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active queries must filter `deleted_at IS NULL`. |

## `articles_to_tags` Join Table

`articles_to_tags` is the database join table that stores article/tag
membership.

Columns:

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `article_id` | yes | API/App | References `articles.id`; cascade deletes the join row. |
| `tag_id` | yes | API/App | References `tags.id`; cascade deletes the join row. |

Primary key:

- `article_id`, `tag_id`

Rules:

- One article cannot have the same tag twice.
- This table owns membership. Do not treat `articles.cached_tags_json` as membership source.

## JSON Fields

### `style_json`

Purpose: optional design hints for tag badges.

```json
{
  "color": "#10b981",
  "variant": "outline"
}
```

Rules:

- `variant` must be controlled by UI validation: `solid`, `outline`, or `ghost`.
- Styling is a hint. Public rendering must remain accessible even when this object is empty.
- Tag styling must not store icons or raw SVG.

## Runtime Usage

Admin:

- Tag editor manages tag identity and badge style.
- Article editor writes membership to `articles_to_tags`.
- Article save must regenerate `articles.cached_tags_json`.

Public Astro:

- Article cards/search can read `cached_tags_json`.
- Tag pages route by `tags.slug`.
- Filter UIs read active tags directly. Grouped filter taxonomy is outside the
  v1 `tags` table contract.

## Validation Rules

- `slug`: required, unique, lowercase kebab-case.
- `label`: required, short enough for badges and filters.
- `description`: optional, recommended for public tag pages.
- `style_json`: valid JSON object.
- Public queries: `deleted_at IS NULL`.
- Public tag filters must ignore deleted tags even if an old article snapshot contains one.

## Cache Rules

Article-side `cached_tags_json` shape:

```json
[
  {
    "id": 12,
    "label": "Quick",
    "slug": "quick",
    "color": "#10b981"
  }
]
```

Rules:

- Each item must include `id`, `label`, `slug`, and `color`.
- `color` is copied from `tags.style_json.color` when present; otherwise it is
  `null`.
- Do not copy full `style_json` into `cached_tags_json`.
- Do not use `name` for tags.
- Search indexing flattens `label`.
- Regenerate from `articles_to_tags` joined with active `tags`.
