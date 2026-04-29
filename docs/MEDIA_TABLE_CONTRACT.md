# Media Table Contract

This document is the canonical contract for the `media` table.

For reusable image variant and rendering rules, use `docs/MEDIA_IMAGE_CONTRACT.md`.

This document defines the database/storage contract. It does not define article image-slot placement or public rendering props.

## Purpose

`media` is the centralized asset library.

It owns:

- searchable asset metadata
- complete generated image variants for image media
- R2 file references for cleanup and regeneration
- focal point and layout hints
- soft-delete lifecycle

It does not own article placement. Article placement belongs to `articles.images_json`, `articles.content_json`, and render caches.

## Table Shape

SQL table:

```sql
media
```

Drizzle reference:

```txt
src/modules/media/schema/media.schema.ts
```

Columns:

| Column | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Stable media identifier. |
| `name` | yes | Internal editor/search name. |
| `alt_text` | yes | Default accessibility text for the asset. Article slots may override it for context. |
| `caption` | no | Default caption. Article slots may override it. |
| `credit` | no | Serialized author credit snapshot JSON. |
| `mime_type` | yes | Asset MIME type, default `image/webp`. |
| `aspect_ratio` | no | Layout hint such as `16:9`, `4:5`, or `1:1`. |
| `variants_json` | yes | Complete stored variant payload with R2 keys. |
| `focal_point_json` | no | Default crop focal point. |
| `created_at` | no | Creation timestamp. |
| `updated_at` | no | Metadata update timestamp. |
| `deleted_at` | no | Soft-delete marker. Active queries must filter `deleted_at IS NULL`. |

## Stored `variants_json`

`media.variants_json` is the complete source of truth for generated files owned by the media row.

For image media, it must contain all generated image variants:

- `xs`
- `sm`
- `md`
- `lg`
- `original`

Example:

```json
{
  "variants": {
    "original": {
      "r2_key": "media/lemon-biscuits-original.jpg",
      "width": 4000,
      "height": 2250,
      "size_bytes": 412345
    },
    "xs": {
      "r2_key": "media/lemon-biscuits-xs.webp",
      "width": 360,
      "height": 203,
      "size_bytes": 18320
    },
    "sm": {
      "r2_key": "media/lemon-biscuits-sm.webp",
      "width": 720,
      "height": 405,
      "size_bytes": 54321
    },
    "md": {
      "r2_key": "media/lemon-biscuits-md.webp",
      "width": 1200,
      "height": 675,
      "size_bytes": 102345
    },
    "lg": {
      "r2_key": "media/lemon-biscuits-lg.webp",
      "width": 2048,
      "height": 1152,
      "size_bytes": 198765
    }
  },
  "placeholder": "data:image/jpeg;base64,..."
}
```

Rules:

- Store `r2_key`, never public `url`.
- Store `width` and `height` for every variant.
- Store `size_bytes` when available.
- Keep `xs`, `sm`, `md`, and `lg` for normal generated image assets.
- Store `original` for image media. Pinterest pin generation depends on it.
- `original` stores the uploaded/cropped source used for Pinterest generation and future high-quality regeneration.
- If the uploaded/cropped source is not larger than `lg`, `original` may have the same dimensions as `lg`, but it remains a separate stored variant.
- Do not use `original` for normal public rendering.
- Non-image media can use a different `variants_json` shape only after a dedicated contract is documented.

## Stored `credit`

`media.credit` is a `TEXT` column, but new writes should store a serialized author credit snapshot, not a loose display string.

The goal is to keep attribution tied to an internal author record so media attribution remains stable across cards, articles, image overlays, and admin views.

Official shape:

```json
{
  "type": "author",
  "id": 7,
  "name": "Jane Doe",
  "slug": "jane-doe",
  "avatar": {
    "media_id": 22,
    "alt": "Jane Doe",
    "variants": {
      "xs": { "r2_key": "media/jane-avatar-xs.webp", "width": 50, "height": 50 }
    }
  }
}
```

Rules:

- `type` is required and must be `author`.
- Author credits must include `id`, `name`, and `slug`.
- `avatar` is optional, but when present it should include only the `xs` variant for a simple lightweight avatar.
- Credit avatar snapshots follow the same stored image-slot rules: `r2_key`, not public `url`.
- Public API/rendering may convert credit avatar variants to URLs.
- Legacy `credit` plain text may be displayed as legacy text in admin, but new writes should replace it with an author snapshot.
- New writes should not store a bare credit string.

## Media vs Article Snapshots

`media.variants_json` is the complete asset record.

Article JSON fields are usage snapshots:

| Field | Role |
| --- | --- |
| `articles.images_json` | Article-level image slots such as cover, thumbnail, pinterest. |
| `articles.content_json` | Block-level image payloads and related-content snapshots. |
| `articles.cached_card_json` | Zero-join listing/card render cache. |

Snapshots may copy selected variants from `media.variants_json`, but they are not authoritative. They can be regenerated from `media`.

## Public API Boundary

The database stores R2 keys. Public responses and rendered Astro props expose URLs.

Allowed internally:

```json
{
  "r2_key": "media/lemon-biscuits-md.webp",
  "width": 1200,
  "height": 675,
  "size_bytes": 102345
}
```

Allowed publicly:

```json
{
  "url": "/api/images/media/lemon-biscuits-md.webp",
  "width": 1200,
  "height": 675,
  "size_bytes": 102345
}
```

Rules:

- Admin/API save paths persist `r2_key`.
- Public API/render paths convert `r2_key` to `url`.
- Public responses must not expose `r2_key`.
- Stored JSON must not persist absolute URLs.

## Lifecycle Rules

Upload/confirm flow:

1. Generate or upload all required image variants for image media.
2. Store R2 keys in `variants_json`.
3. Store searchable metadata in SQL columns.
4. Store optional placeholder and focal point.

Update flow:

- Metadata updates change SQL columns.
- Variant regeneration updates `variants_json`.
- Article snapshots should be regenerated when their selected media changes meaningfully.

Delete flow:

- Normal UI deletion should soft-delete with `deleted_at`.
- Cleanup jobs must read `variants_json` and delete every stored `r2_key` from R2.
- Hard delete is allowed only after R2 cleanup or when deliberately orphan-safe.

## Query Rules

- Active media queries must filter `deleted_at IS NULL`.
- Search uses `name`, `alt_text`, and credit display text extracted from `credit`.
- Sort recent media by `created_at`.
- Do not query article snapshots as if they were the media source of truth.

## Naming Rules

- SQL columns use `snake_case`: `alt_text`, `mime_type`, `variants_json`.
- Drizzle/JS properties use `camelCase`: `altText`, `mimeType`, `variantsJson`.
- Stored JSON keys use `snake_case`: `r2_key`, `size_bytes`.
- Public JSON responses should also prefer `snake_case` for serialized payloads.
- Internal JS/TS variables may use `camelCase`.
- Upload API payloads may use `r2Key` or `sizeBytes` at the request boundary, but must convert to `r2_key` and `size_bytes` before storage.
- Legacy stored values using `sizeBytes` may be normalized when read, but new writes should use `size_bytes`.
