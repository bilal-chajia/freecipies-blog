# Media Table Contract

> **Last Updated:** 2026-05-14

This document is the canonical database, storage, and lifecycle contract for the `media` table.

For reusable image JSON shapes, snapshot rules, and public rendering boundaries, use `docs/IMAGE_JSON_CONTRACT.md`.
For naming rules, use `docs/NAMING_CONTRACT.md`.

This document defines the media asset source of truth. It does not define full article/category/author table contracts or public UI component props.

## Purpose

`media` is the centralized asset library for reusable uploaded image assets.

It owns:

- searchable asset metadata
- the complete stored image file set
- the required image placeholder
- R2 keys needed for cleanup and regeneration
- focal point and layout hints
- soft-delete lifecycle

It does not own editorial placement. Article/category/author/block JSON fields copy image snapshots for rendering when needed, but those snapshots remain consumers of `media`, not a second media library.

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
| `alt_text` | yes | Default accessibility text for the asset. Usage snapshots override it only for context-specific wording. |
| `caption` | yes | Default caption. REQUIRED. |
| `credit` | yes | Serialized internal author credit snapshot JSON. REQUIRED. |
| `mime_type` | yes | Asset MIME type, default `image/webp`. |
| `aspect_ratio` | no | Layout hint such as `16:9`, `4:5`, or `1:1`. |
| `variants_json` | yes | Complete image variant payload with R2 keys and placeholder. |
| `focal_point_json` | no | Default crop focal point. |
| `created_at` | no | Creation timestamp. |
| `updated_at` | no | Metadata update timestamp. |
| `deleted_at` | no | Soft-delete marker. Active queries must filter `deleted_at IS NULL`. |

## Stored `variants_json`

`media.variants_json` is the complete source of truth for generated files owned by the media row.

For image media, it must be shaped exactly as:

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

Required top-level fields:

- `variants`
- `placeholder`

Required variant keys for image media:

- `xs`
- `sm`
- `md`
- `lg`
- `original`

Rules:

- Store `r2_key`, never public `url`.
- Store `width` and `height` for every variant.
- Store `size_bytes` when available.
- `placeholder` is required for every image media row and belongs beside `variants`, not inside an individual variant.
- The `placeholder` stored here is the authoritative source placeholder for the asset.
- `xs`, `sm`, `md`, and `lg` are the normal public-rendering source set.
- `original` is required as the preserved source asset for high-quality regeneration and Pinterest generation input.
- `original` is not generated like `xs`, `sm`, `md`, and `lg`; it is the uploaded/cropped source image stored separately, with no required format conversion or compression.
- `original` must not be used for normal public rendering, hero images, cards, related content, or standard `srcset` output.
- If the uploaded/cropped source is not larger than `lg`, `original` has the best available source dimensions and remains a separate stored variant.
- Non-image media are outside this contract and need a dedicated `variants_json` contract before new writes use a different shape.

## Stored `credit`

`media.credit` is a nullable `TEXT` column. For new writes, when credit is present, it must store a serialized internal author credit snapshot.

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
      "xs": { "r2_key": "media/jane-avatar-xs.webp", "width": 50, "height": 50 },
      "sm": { "r2_key": "media/jane-avatar-sm.webp", "width": 100, "height": 100 }
    }
  }
}
```

Rules:

- `credit` is required for every new media write.
- `type` is required and must be `author`.
- Author credits must include `id`, `name`, `slug`, and `avatar`.
- `avatar.variants` should include `xs` and `sm`.
- Credit avatar snapshots use `r2_key`, not public `url`.
- Public API/rendering converts credit avatar variants to `url`.
- New writes must not store a bare display string in `credit`.
- External, stock, AI, or free-form attribution is not part of this v1 contract.

## Media vs Snapshots

`media.variants_json` is authoritative. Usage snapshots are render copies.

| Storage area | Role |
| --- | --- |
| `media.variants_json` | Complete asset source of truth for variants, placeholder, cleanup, and regeneration. |
| `articles.images_json` | Article-level image usage slots such as `hero`, `thumbnail`, and `recipe_steps`. |
| `authors.images_json` | Author usage slots such as `avatar` and `hero`. |
| `categories.images_json` | Category usage slots such as `thumbnail` and `hero`. |
| `articles.content_json` | Block-level image payloads and related-content snapshots. |
| `articles.cached_card_json` | Zero-join listing/card render cache. |

Snapshots copy selected variants, metadata, and `placeholder` from `media` when needed by the render context, but they are not authoritative. They can be regenerated from the media row when the selected media changes meaningfully.

Placeholder ownership:

- `media.variants_json.placeholder` is the source placeholder.
- Snapshot `placeholder` is only a render copy taken from the selected media row.
- Snapshot `placeholder` is required only when the render context uses blur-up/progressive loading.
- Snapshot `placeholder` must not be edited as independent asset metadata.
- If the source placeholder changes during regeneration, affected snapshots should be regenerated instead of manually patched.

The canonical image slot names for new writes are:

- `hero`
- `thumbnail`
- `recipe_steps`
- `avatar`

Older implementation names are not part of this contract. Existing code is
being migrated to verify and enforce this current contract; remaining old names
are implementation drift, not alternate accepted contract names.

## Storage, Admin API, and Server Render Boundary

The database stores R2 keys. Admin API read responses and server render payloads expose URLs. Public-site browsers should normally receive SSR HTML, not raw image JSON.

Stored/internal variant:

```json
{
  "r2_key": "media/lemon-biscuits-md.webp",
  "width": 1200,
  "height": 675,
  "size_bytes": 102345
}
```

Resolved variant:

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
- Admin API read paths and server render paths convert `r2_key` to `url`.
- Public SSR pages render HTML with URL attributes.
- Admin API responses, server render payloads, and public HTML must not expose `r2_key`.
- Stored JSON must not persist absolute URLs.
- Serialized JSON uses `snake_case` in both stored and resolved shapes.

## Lifecycle Rules

Upload/confirm flow:

1. Validate that the asset is image media for this contract.
2. Persist `original` as the uploaded/cropped source asset.
3. Generate the resized render variants: `xs`, `sm`, `md`, and `lg`.
4. Generate the required compact `placeholder`.
5. Store R2 keys, dimensions, and optional file sizes in `variants_json`.
6. Store searchable metadata in SQL columns.
7. Store optional focal point and aspect ratio hints.

Update flow:

- Metadata updates change SQL columns.
- Variant regeneration updates `variants_json` atomically, including `placeholder` when it changes.
- Usage snapshots should be regenerated when their selected media changes meaningfully.
- `updated_at` tracks metadata/update activity according to the database trigger behavior.

Delete flow:

- Normal UI deletion should set `deleted_at`.
- Soft-deleted rows are excluded from active media queries with `deleted_at IS NULL`.
- Cleanup jobs must read `variants_json` and delete every stored `r2_key` from R2.
- Hard delete is allowed only after R2 cleanup or when the job is deliberately orphan-safe.

## Query Rules

- Active media queries must filter `deleted_at IS NULL`.
- Search uses `name`, `alt_text`, and credit display data extracted from `credit`.
- Sort recent media by `created_at`.
- Do not query article/category/author/block snapshots as if they were the media source of truth.

## Naming Rules

Follow `docs/NAMING_CONTRACT.md`.

- Media SQL examples: `alt_text`, `mime_type`, `variants_json`.
- Media JSON examples: `media_id`, `r2_key`, `size_bytes`, `focal_point`, `aspect_ratio`.
- Public serialized image JSON replaces stored `r2_key` with public `url`.
- Upload API payloads must be normalized to the contract shape before storage or public/admin serialization.
