# Tags Table Contract

This document is the product/data contract for the `tags` table and the `articles_to_tags` join table. The executable SQL source remains `db/schema.sql`.

## Scope

`tags` owns secondary taxonomy labels used for filtering, discovery, badges, tag pages, search, and tag clouds.

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
| `filter_groups_json` | no | Admin/filtering | Array of filter group labels where this tag appears. Defaults to `[]`. |
| `style_json` | no | Admin/design | Optional badge/icon styling. Defaults to `{}`. |
| `cached_post_count` | no | App | Denormalized count of online, non-deleted articles using this tag. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active queries must filter `deleted_at IS NULL`. |

## `articles_to_tags` Columns

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

### `filter_groups_json`

Purpose: group tags in admin/public filter UIs.

```json
["Diet", "Time", "Popular"]
```

Rules:

- Always an array.
- Store display group labels, not translated UI copy.
- SQLite does not index this JSON array. Fetch tags and group in app/UI memory.

### `style_json`

Purpose: optional design hints for tag badges.

```json
{
  "svg_code": "<svg viewBox=\"0 0 24 24\"><path d=\"...\" /></svg>",
  "color": "#10b981",
  "variant": "outline"
}
```

Rules:

- `svg_code` must be sanitized, small, and contain no scripts or event handlers.
- `variant` should be controlled by UI validation: `solid`, `outline`, or `ghost`.
- Styling is a hint. Public rendering must remain accessible even when this object is empty.

## Runtime Usage

Admin:

- Tag editor manages tag identity, filter groups, and badge style.
- Article editor writes membership to `articles_to_tags`.
- Article save should regenerate `articles.cached_tags_json`.

Public Astro:

- Article cards/search can read `cached_tags_json`.
- Tag pages route by `tags.slug`.
- Filter UIs read active tags and group them by `filter_groups_json`.

## Validation Rules

- `slug`: required, unique, lowercase kebab-case.
- `label`: required, short enough for badges and filters.
- `description`: optional, recommended for public tag pages.
- `filter_groups_json`: valid JSON array of strings.
- `style_json`: valid JSON object.
- Public queries: `deleted_at IS NULL`.
- Public tag filters should ignore deleted tags even if a stale article snapshot still contains one.

## Cache Rules

Article-side `cached_tags_json` shape:

```json
[
  {
    "id": 12,
    "label": "Quick",
    "slug": "quick"
  }
]
```

Rules:

- Each item must include `id`, `label`, and `slug`.
- Do not use `name` for tags.
- Search indexing flattens `label`.
- Regenerate from `articles_to_tags` joined with active `tags`.

## Known Implementation Notes

- `tags.cached_post_count` is documented in SQL, but no equivalent tag-count trigger is currently visible in `db/schema.sql`.
- Until a trigger/job is implemented, treat `cached_post_count` as app-managed.
