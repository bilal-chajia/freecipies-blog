# Image JSON Contract

> **Last Updated:** 2026-05-14

This document is the canonical contract for image storage and output shapes across media storage, stored usage snapshots, admin API responses, server render payloads, and public HTML output.

For the `media` table columns, lifecycle, cleanup, and source-of-truth rules, use `docs/MEDIA_TABLE_CONTRACT.md`.
For naming rules, use `docs/NAMING_CONTRACT.md`.

This contract defines the target shape. Current implementation drift is tracked outside this contract.

## Core Boundary

Do not mix the media asset source of truth with editorial/render snapshots.

| Layer | Role | Source of truth? |
| --- | --- | --- |
| `media.variants_json` | Complete image variants plus required placeholder. | Yes |
| Stored image snapshots | Contextual copies for admin/site rendering. | No |
| Admin API image payloads | URL-based JSON returned to admin reads. | No |
| Server render image payloads | URL-based objects passed to server rendering. | No |
| Public HTML output | Final HTML attributes emitted by SSR pages. | No |

`media.variants_json` owns stored image files, placeholder reuse, R2 cleanup, snapshot regeneration, and high-quality generation inputs.

Stored snapshots exist to avoid runtime joins and to preserve the exact image usage context. They copy selected variants and metadata from `media` when needed by the render context, and they are always regenerable from the media row.

## Naming Rules

Follow `docs/NAMING_CONTRACT.md`. This image contract adds these required
stored/internal keys:

- `media_id`
- `r2_key`
- `size_bytes`
- `focal_point`
- `aspect_ratio`

Admin API JSON and server render payload objects expose `url` instead of
stored `r2_key`.

Public HTML output is not JSON. It uses normal HTML attributes such as `src`, `srcset`, `sizes`, `width`, `height`, `loading`, and `alt`.

## Stored Media Payload

`media.variants_json` is the complete payload stored on the `media` row.

For image media, it must contain:

- `variants`
- `placeholder`

The `variants` object must contain:

- `xs`
- `sm`
- `md`
- `lg`
- `original`

Official shape:

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

- `variants` is required.
- `placeholder` is required for image media.
- `placeholder` belongs beside `variants`, not inside an individual variant.
- Every variant must include `r2_key`, `width`, and `height`.
- `size_bytes` should be stored when available.
- Stored variants must not contain `url`.
- `original` is required as the preserved source asset for high-quality regeneration and Pinterest generation input.
- `original` is not generated like `xs`, `sm`, `md`, and `lg`; it is the uploaded/cropped source image stored separately, with no required format conversion or compression.
- `original` must not be copied into normal public/card/related-content snapshots.
- `original` must not be used for normal public rendering or standard `srcset` output.

## Variant Shapes

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

Required in stored/internal variants:

- `r2_key`
- `width`
- `height`

Required in resolved variants:

- `url`
- `width`
- `height`

Optional in both:

- `size_bytes`

## Breakpoints

Standard content image variants:

| Variant | Width target | Role |
| --- | ---: | --- |
| `xs` | 360px | Tiny UI, small thumbnails, lightweight previews. |
| `sm` | 720px | Mobile and small-card rendering. |
| `md` | 1200px | Tablet, normal desktop cards, and content images. |
| `lg` | 2048px | Wide heroes, large visual cards, and high-density displays. |
| `original` | source size | Preserved uploaded/cropped source asset for regeneration and Pinterest generation input only. |

If the source image is smaller than a target, the variant uses the best available source dimensions. The key still remains required in `media.variants_json`.

## Stored Image Snapshot

A stored image snapshot is a contextual copy used inside article/category/author/block JSON.

Official contextual stored snapshot shape:

```json
{
  "media_id": 55,
  "alt": "Bowl of pasta",
  "caption": "Fresh pasta in a ceramic bowl",
  "credit": {
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
  },
  "placeholder": "data:image/jpeg;base64,...",
  "focal_point": { "x": 50, "y": 50 },
  "aspect_ratio": "16:9",
  "variants": {
    "sm": { "r2_key": "media/pasta-sm.webp", "width": 720, "height": 480 },
    "md": { "r2_key": "media/pasta-md.webp", "width": 1200, "height": 800 }
  }
}
```

Rules:

- `media_id` links the snapshot back to the media library.
- `variants` is required and contains only the variants needed by the render context.
- `alt` is required for public images.
- `caption` is required only for contextual image snapshots that render visible
  image context, such as content images and recipe step images.
- `credit` is required only for contextual image snapshots that render visible
  credit context, such as content images and recipe step images.
- Structural image snapshots such as hero, thumbnail, avatar, and card images
  must omit `caption` and `credit`.
- When `credit` is present, it is copied from `media.credit` as an internal
  author credit snapshot.
- `credit.avatar.variants` must include `xs` and `sm` when an avatar is present.
- `placeholder` is required for all rendered snapshots to support progressive loading.
- `focal_point` is optional and uses percentages from 0 to 100.
- `aspect_ratio` is optional, but recommended when it helps reserve layout space.
- Stored snapshots use `r2_key`, never public `url`.

## Resolved Image Outputs

Resolved image outputs are derived from stored snapshots at the API/service/render boundary.

### Admin API Image Payload

Admin screens receive resolved image JSON from admin APIs. This payload uses public `url` values and must not expose R2 keys.

Official admin API image payload shape:

```json
{
  "media_id": 55,
  "alt": "Bowl of pasta",
  "caption": "Fresh pasta in a ceramic bowl",
  "credit": {
    "type": "author",
    "id": 7,
    "name": "Jane Doe",
    "slug": "jane-doe",
    "avatar": {
      "media_id": 22,
      "alt": "Jane Doe",
      "variants": {
        "xs": { "url": "/api/images/media/jane-avatar-xs.webp", "width": 50, "height": 50 },
        "sm": { "url": "/api/images/media/jane-avatar-sm.webp", "width": 100, "height": 100 }
      }
    }
  },
  "placeholder": "data:image/jpeg;base64,...",
  "focal_point": { "x": 50, "y": 50 },
  "aspect_ratio": "16:9",
  "variants": {
    "sm": { "url": "/api/images/media/pasta-sm.webp", "width": 720, "height": 480 },
    "md": { "url": "/api/images/media/pasta-md.webp", "width": 1200, "height": 800 }
  }
}
```

Rules:

- Admin API image payloads use `url`, never `r2_key`.
- Admin API image payloads remain serialized `snake_case`.
- This payload is safe for the browser because storage keys have already been resolved to public URLs.
- `width` and `height` are required for CLS-safe rendering.

### Server Render Image Payload

The public site is SSR. Astro server code consumes the same resolved URL-based shape when rendering images, but that object is a server-side render payload, not a public client JSON contract.

Server render payloads:

- use `url`, never `r2_key`;
- keep serialized-style keys such as `media_id`, `focal_point`, and `aspect_ratio`;
- generate `src`, `srcset`, and `sizes` on the server from available variants;
- should not fetch the `media` row at public render time just to complete a missing snapshot unless that component explicitly owns the fallback.

### Public HTML Output

The normal public browser output is SSR HTML, not raw image JSON.

Example public HTML output:

```html
<img
  src="/api/images/media/pasta-md.webp"
  srcset="/api/images/media/pasta-sm.webp 720w, /api/images/media/pasta-md.webp 1200w"
  sizes="(max-width: 768px) 100vw, 720px"
  width="1200"
  height="800"
  loading="lazy"
  alt="Bowl of pasta"
/>
```

Rules:

- Public HTML output must not expose `r2_key`.
- Public HTML output uses URL attributes derived from stored R2 keys.
- Every rendered `<img>` must include `width`, `height`, and an appropriate `loading` value.

## Canonical Containers

Canonical image slots for new writes:

| Container | Slots |
| --- | --- |
| `articles.images_json` | `hero`, `thumbnail`, `content_images` (Record/Map), `recipe_steps` (Record/Map) |
| `authors.images_json` | `avatar`, `hero` |
| `categories.images_json` | `thumbnail`, `hero` |
| `articles.content_json` image blocks | `image_ref` placement marker only |
| `articles.content_json` related content | `related_content.image` snapshot |
| `articles.cached_card_json` | card image snapshot |

Normal body image snapshots are stored in `articles.images_json.content_images`.
`content_json` image blocks reference them by `image_ref` and must not store
the snapshot directly.

Older implementation names are not canonical and should not be used for new writes. They can be handled later as migration drift during implementation alignment.

## Snapshot Variant Matrix

The public site is mobile-first and uses responsive `srcset`/`sizes`. Snapshots should copy the smallest useful variant set for their render context.

| Context | Stored snapshot variants | Notes |
| --- | --- | --- |
| `media.variants_json` | `placeholder`, `xs`, `sm`, `md`, `lg`, `original` | Complete source of truth. Snapshot optimization never applies here. |
| Hero slots | `sm`, `md`, `lg` | Primary above-the-fold or page/header visual. |
| Thumbnail slots | `xs`, `sm` | Small navigation/card asset. |
| Avatar slots | `xs`, `sm` | Lightweight inline avatar and retina/small-card contexts. |
| Card image snapshots | `xs`, `sm` | Default for mobile-first listing/card surfaces. |
| Related-content snapshots | `xs`, `sm` | Avoids media joins while keeping inline payloads compact. |
| Content image snapshots | `sm`, `md`, `lg` | Stored as a keyed map in `images_json.content_images`; supports responsive article content without copying `original`. |
| Recipe step snapshots | `sm`, `md`, `lg` | Stored as a keyed map in `images_json.recipe_steps`; supports full-width recipe instruction imagery. |
| Generation input | `media.variants_json.original` | Used only as source input; generated outputs belong to their owning tables. |

Rules:

- Do not store `original` in normal snapshots.
- Do not include every media variant in cards or related content by default.
- Do include `width` and `height` for every stored snapshot variant.
- Include `lg` only when the component can actually render the image large.
- Snapshot variant policy never changes the required complete set in `media.variants_json`.

## Caption and Credit Placement

Caption and credit are stored only where the public UI can render visible image
context.

| Snapshot context | Stores `caption` | Stores `credit` |
| --- | --- | --- |
| `articles.images_json.hero` | no | no |
| `articles.images_json.thumbnail` | no | no |
| `articles.cached_card_json.image` | no | no |
| `authors.images_json.avatar` | no | no |
| `authors.images_json.hero` | no | no |
| `articles.cached_author_json.avatar` | no | no |
| `categories.images_json.hero` | no | no |
| `categories.images_json.thumbnail` | no | no |
| `articles.images_json.content_images` | yes | yes |
| `articles.images_json.recipe_steps` | yes | yes |

Rules:

- Hero, thumbnail, avatar, and card image snapshots are structural display
  images and must not store `caption` or `credit`.
- Content image and recipe step snapshots are contextual images and must store
  `caption` and `credit`.
- `credit` follows the author credit snapshot contract when it is present.

## Pinterest and Generated Assets

`media` owns reusable editorial/source assets. Generated assets belong to the table that owns their lifecycle.

| Generated asset | Owning table | Purpose |
| --- | --- | --- |
| Template preview thumbnail | `pin_templates` | Admin/template picker preview generated from template data. |
| Final Pinterest pin image | `pinterest_pins` | Exportable/publishable pin image generated from a source image and template. |

Rules:

- Use `media.variants_json.original` only as high-quality source input for generation.
- Generated template preview thumbnails should be stored on `pin_templates`, not as new `media` rows.
- Generated Pinterest pin images should be stored on `pinterest_pins`, not as new `media` rows.
- Generated asset storage should keep R2 keys internally and expose public URLs only at API/export/render boundaries.

## Snapshot Synchronization

Snapshots are always regenerable from the source media row. When a media record's metadata changes (alt_text, caption, credit, variants_json, focal_point_json, aspect_ratio), all referencing snapshots must be updated.

Mechanism: **Application-level batch propagation** (not SQL triggers).

Implementation: `src/modules/media/services/snapshot-sync.service.ts`

API: `PATCH /api/media/:id` automatically triggers snapshot propagation after updating the media row.

Flow:

```txt
PATCH /api/media/:id
  → updateMedia()           (update the source-of-truth row)
  → propagateMediaUpdate()  (find & patch all referencing snapshots)
    → scan articles.images_json + cached_card_json
    → scan authors.images_json
    → scan categories.images_json
    → return SnapshotSyncResult { articlesUpdated, authorsUpdated, categoriesUpdated, errors }
```

Rules:

- Do not use SQL triggers for snapshot propagation (D1/Workers CPU time limits).
- Snapshot sync is best-effort — if it fails, the API still returns success for the media update.
- The sync response is included in the API response so the caller knows how many rows were affected.
- Matching is done via `LIKE '%"media_id":N%'` scan on the JSON column.
- Each slot is patched with only the variant keys it is allowed to contain per the Snapshot Variant Matrix.

## Rendering Rules

Rendered markup must use public URLs derived from stored R2 keys.

Example rendered output:

```html
<img
  src="/api/images/media/pasta-md.webp"
  srcset="/api/images/media/pasta-sm.webp 720w, /api/images/media/pasta-md.webp 1200w, /api/images/media/pasta-lg.webp 2048w"
  sizes="(max-width: 768px) 100vw, 720px"
  width="1200"
  height="800"
  loading="lazy"
  alt="Bowl of pasta"
>
```

Rules:

- Every rendered `<img>` must have `width`, `height`, and appropriate `loading`.
- Stored image JSON must not contain absolute URLs.
- Public image props/responses must not expose `r2_key`.
- Build public URLs at the API/service/render boundary.
- Prefer snapshots for cards and related content to avoid runtime media joins.
