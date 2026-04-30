# Redirects Table Contract

> **Last Updated:** 2026-04-29

This document is the product/data contract for the `redirects` table. The executable SQL source remains `db/schema.sql`.

## Scope

`redirects` manages SEO redirects and broken-link handling for moved content.

It is used by middleware before normal route handling to redirect old paths to new internal paths or approved external URLs.

## Source Of Truth

The `redirects` row is the source of truth for redirect rules and redirect hit statistics.

No article/category/author slug should be treated as moved unless a row exists here or the application has an explicit slug-history feature.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. |
| `from_path` | yes | Admin/API | Unique source path. Must not include domain. |
| `to_path` | yes | Admin/API | Destination path or approved external URL. |
| `status_code` | yes | Admin/API | Redirect code: `301`, `302`, `307`, or `308`. Default `301`. |
| `is_active` | yes | Admin/workflow | `1` active, `0` paused. |
| `notes` | no | Admin/internal | Internal editor notes. Not public. |
| `hit_count` | yes | App/runtime | Incremented when redirect is used. Default `0`. |
| `last_hit_at` | no | App/runtime | Last redirect hit timestamp. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |

## Path Rules

### `from_path`

Rules:

- Required and unique.
- Must start with `/`.
- Must not include protocol, host, or domain.
- Should not include fragments.
- Query strings should be avoided unless middleware explicitly supports matching them.
- Should be normalized before save:
  - trim whitespace
  - collapse repeated slashes where safe
  - remove trailing slash unless the root path `/`

Examples:

```text
/old-recipe
/recipes/old-chocolate-cake
/category/quick-dinners
```

### `to_path`

Rules:

- Required.
- Can be an internal path starting with `/`.
- Can be an external absolute URL only when intentionally allowed by admin validation.
- Must not equal `from_path`.
- Must not create redirect loops.
- Redirect chains should be avoided; point to the final target.

Examples:

```text
/recipes/new-chocolate-cake
https://trusted-partner.example/landing-page
```

## Status Codes

Allowed values:

- `301`: permanent redirect, normal SEO/content move.
- `302`: temporary redirect.
- `307`: temporary redirect preserving method.
- `308`: permanent redirect preserving method.

Default:

- `301`

Rules:

- Use `301` for old article/category/author URLs after a permanent slug move.
- Use `302`/`307` for temporary campaigns, tests, or maintenance.
- Do not use unsupported status codes in admin/API validation.

## Runtime Usage

Middleware:

- Look up active redirect by normalized request path.
- If found, increment `hit_count` and update `last_hit_at`.
- Return redirect response with `status_code`.
- If not found, continue normal route handling.

Admin:

- Create, update, pause, and delete redirect rules.
- Search by `from_path`, `to_path`, or `notes`.
- Use `hit_count` and `last_hit_at` to identify old links still receiving traffic.

## Validation Rules

- `from_path`: required, unique, relative path only.
- `to_path`: required, relative path or approved external URL.
- `status_code`: one of `301`, `302`, `307`, `308`.
- `is_active`: boolean.
- Prevent direct self-redirects.
- Prevent obvious loops and chains where possible.
- `notes`: internal only.

## Lifecycle Rules

- The table has no `deleted_at` column.
- Deleting a redirect is a hard delete in the current schema.
- Prefer `is_active = 0` when preserving history is useful.
- Runtime hit tracking updates `hit_count` and `last_hit_at`.
