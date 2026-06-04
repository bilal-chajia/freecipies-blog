# Naming Contract

> **Last Updated:** 2026-06-03

This document is the canonical naming contract for SQL schema names, stored JSON,
serialized JSON, public routes, slugs, file names, and TypeScript/TSX
implementation names.

## Core Rules

- SQL schema names use `snake_case`.
- Stored JSON keys use `snake_case`.
- Serialized API/admin/server-render JSON keys use `snake_case`.
- **Data object properties use `snake_case` end to end.** The same key flows
  unchanged from the SQL column → Drizzle field → service layer → serialized API
  payload → consuming React/Astro prop. **No casing conversion at any boundary.**
- The TypeScript types and interfaces that model data shapes (DB rows, JSON
  payloads, API request/response bodies) therefore use `snake_case` property
  names. This is a deliberate exception to JS idiom, chosen to remove the
  camelCase↔snake_case drift that caused stored/serialized leaks.
- Local variables, function names, and other non-data identifiers use
  `camelCase` per normal TS/JS idiom. They are not data keys.
- Type/interface/class/React-component/Astro-component **names** use `PascalCase`.
- Public slugs and route params use lowercase `kebab-case`.
- Files and folders use the existing local convention of their owning module.
  New contract docs use uppercase descriptive names ending in `_CONTRACT.md`.
- Mixed shapes (e.g. both `sizeBytes` and `size_bytes`) are forbidden.

## Boundaries

A data key keeps **one** name across every layer. There is no implementation-side
rename and no conversion step.

| Layer | Name |
| --- | --- |
| SQL column | `content_json` |
| Stored JSON key | `content_json` |
| Drizzle field | `content_json` |
| Serialized JSON key | `content_json` |
| TypeScript data-shape property | `content_json` |
| React/Astro prop reading it | `content_json` |

Rules:

- Data flows `snake_case` end to end. Handlers, services, serializers, and the
  admin SPA read and write the same `snake_case` keys.
- **Do not add a camelCase↔snake_case conversion layer** (axios interceptor,
  Drizzle camelCase field aliases, a `serialize*Payload` remap, etc.) for data
  keys.
- Local variables and function names may be `camelCase`; they are not data keys.
- Mixed shapes such as both `sizeBytes` and `size_bytes` are forbidden.

> **Migration status (2026-06-04):** all Drizzle-backed resources are migrated to
> snake_case data keys end to end (schema → service → API/admin/server-render
> payloads → consuming types/components). CamelCase data-shape aliases are no
> longer tolerated for migrated resources.

## SQL Names

SQL tables, columns, indexes, triggers, and constraints use `snake_case`.

Examples:

- `articles`
- `cached_author_json`
- `articles_to_tags`
- `idx_articles_slug`
- `trg_articles_updated_at`

Rules:

- Table names are plural nouns when they represent entity collections.
- Join tables use `{left_table}_to_{right_table}`.
- Timestamp columns use `_at`, for example `created_at`, `updated_at`, and
  `deleted_at`.
- Boolean columns use `is_`, `has_`, or another explicit boolean prefix.
- JSON columns end with `_json`.
- Cache columns start with `cached_` when they store regenerable snapshots.

## Stored JSON And Serialized JSON

Stored JSON means JSON persisted inside D1 columns such as `images_json`,
`recipe_json`, `roundup_json`, `content_json`, `seo_json`, and cache fields.

Serialized JSON means API/admin/server-render JSON returned by the app.

Rules:

- Stored JSON keys use `snake_case`.
- Serialized JSON keys use `snake_case`.
- Nested JSON keys also use `snake_case`.
- Arrays use plural names when they contain multiple items, for example
  `social_links`, `content_images`, and `diet_labels`.
- Object maps use a plural container name when the values are a keyed
  collection, for example `recipe_steps` and `content_images`.
- Public API/admin payloads must not expose storage-only key names unless the
  contract explicitly allows them.

## Public Routes And Slugs

Rules:

- Public slugs use lowercase `kebab-case`.
- Route params use meaningful names such as `slug`; do not expose internal
  numeric ids in public routes unless a contract explicitly requires it.
- Slugs are stable public identifiers after publish.
- Changing a published slug requires a redirect plan.

Examples:

- `/recipes/avocado-toast`
- `/roundups/high-protein-dinners`
- `/authors/jane-doe`
- `/categories/easy-breakfast`

## Image Names

Image storage and image payload naming follows `docs/IMAGE_JSON_CONTRACT.md`.
This section defines only the naming boundary.

Rules:

- Stored variants use `r2_key`.
- Public/admin/server-render resolved variants use `url`.
- Stored variant metadata uses `size_bytes`, not `sizeBytes`.
- Image references use `media_id`.
- Crop metadata uses `focal_point` and `aspect_ratio`.
- Canonical article image slots are `hero`, `thumbnail`, `content_images`, and
  `recipe_steps`.
- Canonical author image slots are `avatar` and `hero`.
- Canonical category image slots are `hero` and `thumbnail`.

### R2 Image Object Keys

R2 keys for editorial media images use this canonical format:

```text
media/images/{slug_base}-{variant}-{asset_id}.{ext}
```

Examples:

```text
media/images/avocado-toast-xs-m8f3a91c.webp
media/images/avocado-toast-sm-m8f3a91c.webp
media/images/avocado-toast-md-m8f3a91c.webp
media/images/avocado-toast-lg-m8f3a91c.webp
media/images/avocado-toast-original-m8f3a91c.jpg
```

Rules:

- `media/images/` is the canonical prefix for reusable editorial image media.
- `slug_base` is descriptive lowercase `kebab-case` derived from the upload
  title, alt text, original filename, or editor-provided media name.
- `variant` is one of `xs`, `sm`, `md`, `lg`, or `original`.
- `asset_id` is a short generated unique id created once per uploaded media
  asset and shared by all variants from that asset.
- `asset_id` must not encode user ids, private ids, author emails, or other
  sensitive data.
- Generated public variants normally use `.webp`.
- `original` keeps the stored source/cropped file extension.
- R2 keys must not contain spaces, accents, camelCase, uppercase letters, query
  strings, or editor-only slot names.
- R2 keys describe the reusable media asset, not the editorial usage slot.
  Do not include names such as `hero`, `thumbnail`, `avatar`, or
  `recipe_step` in the object key.
- Do not rename an existing R2 key referenced by D1 without migrating every
  stored `r2_key` reference and cleaning old objects.

## Content Block Names

Content block names follow `docs/CONTENT_BLOCKS_CONTRACT.md`.

Rules:

- Stored block `type` values use lowercase `snake_case`.
- Position marker blocks use names beginning with `main_` when they place a
  top-level source payload in `content_json`.
- Image blocks reference article image snapshots with `image_ref`.
- Related content references use `article_id` for internal articles.

Examples:

- `heading`
- `paragraph`
- `tip_box`
- `main_recipe`
- `main_roundup`
- `main_faq`

## Allowed Exceptions

- Public/resolved image payloads replace stored `r2_key` with public `url`.
- `jsonld_json` follows the external Schema.org vocabulary exactly, including
  external camelCase keys required by Schema.org.
- HTML output is not JSON; it uses normal HTML attributes such as `src`,
  `srcset`, `width`, `height`, `loading`, and `alt`.
- Third-party provider payloads can use their external naming only at the
  integration boundary. Normalize before storing app-owned JSON.

## Migration Drift

Older implementation or stored names such as `sizeBytes`, `aspectRatio`,
`contentJson`, or `recipeJson` are not contract names when they appear inside
stored or serialized JSON. Treat them as migration drift and normalize them
before persistence or public/admin serialization.

Non-canonical names that must not be used for new writes:

| Non-canonical name | Contract name |
| --- | --- |
| `sizeBytes` | `size_bytes` |
| `aspectRatio` | `aspect_ratio` |
| `focalPoint` | `focal_point` |
| `r2Key` | `r2_key` |
| `mediaId` | `media_id` |
| `contentJson` | `content_json` |
| `recipeJson` | `recipe_json` |
| `roundupJson` | `roundup_json` |
| `cover` | `hero` |
| `banner` | `hero` |
| `platform` for author social links | `network` |

Rules:

- Legacy aliases can be read only by explicit migration/normalization code.
- New writes must use the contract name.
- Public/admin serialized responses must use the contract name.
- Do not document a legacy alias as an accepted public shape unless a specific
  migration contract requires it.
