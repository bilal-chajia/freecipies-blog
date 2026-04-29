# Media and Image Contract

This document defines image-related JSON across media storage, article/category/author image slots, article snapshots, and public rendering.

For the full `media` table contract, use `docs/MEDIA_TABLE_CONTRACT.md`.

Canonical TypeScript reference: `src/shared/types/images.ts`.

This document defines image JSON shapes and rendering rules. It does not replace the `media` table contract.

## Core Boundary

Do not mix the `media` table with article/editorial snapshots.

`media.variants_json` is the complete image asset source of truth. For image media, it should contain every generated image variant:

- `xs`
- `sm`
- `md`
- `lg`
- `original`

Article/category/author JSON fields are usage snapshots. They are not a second media library. They may copy only the variants needed by a specific rendering context, but those copies are always regenerable from the `media` row.

Use these mental names:

| Storage area | Meaning | Source of truth? |
| --- | --- | --- |
| `media.variants_json` | Complete image variants | Yes, for generated files, R2 cleanup, regeneration, and Pinterest |
| `articles.images_json` | Article image slots | No, editorial usage snapshot |
| `articles.content_json` image payloads | Embedded render snapshots | No, block-level render copy |
| `articles.cached_card_json` | Listing/card cache | No, zero-join render cache |

Snapshot optimization rules never apply to `media.variants_json`. They apply only to article/editorial snapshots.

## Layer Rules

### Stored/Internal

Used by:

- `media.variants_json`
- `articles.images_json`
- `authors.images_json`
- `categories.images_json`
- `articles.cached_card_json`
- `content_json` image snapshots when stored in DB
- R2 deletion/cleanup workflows
- internal image processing

Stored variants should contain `r2_key`, not absolute URLs. This keeps the database independent from domain/CDN changes.

There are two stored shapes:

- `media.variants_json`: the complete media row payload, shaped as `{ "variants": { ... }, "placeholder": "..." }`.
- Image slots/snapshots: contextual copies inside article/category/author/block JSON, shaped as `{ "media_id": 55, "variants": { ... } }`.

Example complete `media.variants_json` shape:

```json
{
  "variants": {
    "original": { "r2_key": "media/image-original.jpg", "width": 4000, "height": 2667, "size_bytes": 412345 },
    "xs": { "r2_key": "media/image-xs.webp", "width": 360, "height": 240, "size_bytes": 18320 },
    "sm": { "r2_key": "media/image-sm.webp", "width": 720, "height": 480, "size_bytes": 54321 },
    "md": { "r2_key": "media/image-md.webp", "width": 1200, "height": 800, "size_bytes": 102345 },
    "lg": { "r2_key": "media/image-lg.webp", "width": 2048, "height": 1365, "size_bytes": 198765 }
  },
  "placeholder": "data:image/jpeg;base64,..."
}
```

### Public/API/Rendered

Used by:

- public Astro rendering
- article/category/author cards
- rendered `content_json` image blocks
- rendered `related_content` cards

Public/rendered variants are derived from stored variants at the API/service/render boundary. They contain URL data and must not expose `r2_key`. This shape is for final props/responses, not DB storage.

```json
{
  "sm": { "url": "/api/images/media/55/sm.webp", "width": 720, "height": 480 },
  "md": { "url": "/api/images/media/55/md.webp", "width": 1200, "height": 800 }
}
```

## Variant Shapes

Stored variant:

```json
{
  "r2_key": "media/image-md.webp",
  "width": 1200,
  "height": 800,
  "size_bytes": 102345
}
```

Public/rendered variant:

```json
{
  "url": "/api/images/media/55/md.webp",
  "width": 1200,
  "height": 800,
  "size_bytes": 102345
}
```

Required in both shapes:

- `width`
- `height`

Stored shape requires:

- `r2_key`

Public/rendered shape requires:

- `url`

Optional in both:

- `size_bytes`

Compatibility:

- Stored legacy payloads may still contain `sizeBytes`; readers may normalize it to `size_bytes`.
- New stored JSON should use `size_bytes`.

## Image Slot

Used in article/category/author JSON containers and block snapshots. An image slot describes how a media asset is used in a specific editorial context. It is not the complete media record.

Stored image slots should keep `r2_key`; public/rendered image slots should expose generated `url`.

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
        "xs": { "r2_key": "media/jane-avatar-xs.webp", "width": 50, "height": 50 }
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

- `media_id` links back to the media library.
- The complete variant set remains in `media.variants_json`.
- `alt` should be present for public images.
- `credit` should be an author credit snapshot copied from `media.credit`, not a bare display string.
- `credit.avatar` should include only `xs` for a simple lightweight avatar.
- `width` and `height` are required for CLS-safe rendering.
- `focal_point` is optional and used for `object-position`.
- Stored image slots use `aspect_ratio`.
- Legacy stored values using `aspectRatio` may be normalized when read, but new writes should use `aspect_ratio`.

## Containers

### Article Images

`articles.images_json`:

- `cover`
- `thumbnail`
- `pinterest`
- `contentImages`

### Author Images

`authors.images_json`:

- `avatar`
- `cover`
- `banner`

### Category Images

`categories.images_json`:

- `thumbnail`
- `cover`

## Breakpoints

Standard content imagery:

- `xs`: 360px
- `sm`: 720px
- `md`: 1200px
- `lg`: 2048px
- `original`: required for image media; stores the uploaded/cropped source for Pinterest pin generation and future high-quality regeneration

Author avatars may use smaller dimensions. Check `src/shared/types/images.ts` and the media service before assuming standard content breakpoints for avatars.

## Snapshot Variant Policy

The public site is mobile-first and uses responsive `srcset`/`sizes`. Snapshots should store the variants needed to build the `srcset` for their render context, while `media.variants_json` always keeps the full source set.

| Context | Stored variants | Why |
| --- | --- | --- |
| `media.variants_json` | `xs`, `sm`, `md`, `lg`, `original` | Complete image source of truth for generated files, R2 cleanup, snapshot regeneration, and Pinterest pin generation. |
| Article/category/author main image slots | Full available set where practical | These images may render as heroes, cards, feeds, and social images. |
| Category thumbnail snapshots | `xs`, `sm` | Category thumbnails are small navigation/card assets and should not carry larger variants. |
| Category cover snapshots | `md`, `lg` | Category covers are larger page/header assets, so they keep tablet/desktop and wide cover sources without copying every intermediate variant. |
| Mobile-first card snapshots | `sm`, `md` by default | Covers mobile, retina mobile, tablet, and normal desktop cards without bloating JSON. |
| Tiny UI, avatars, small inline thumbnails | `xs`, `sm` | Avoids over-fetching when display size is very small. |
| Large visual cards or wide carousels | `md`, `lg` | Use only when the component can actually render the image large. |
| Related-content cards | `sm`, `md` by default | Avoids D1/media reads and keeps inline snapshots compact. |
| Hero/featured snapshots | `sm`, `md`, `lg` | Preserves mobile-first `srcset` while supporting above-the-fold large display surfaces. |
| Inline content image snapshots | `sm`, `md`, `lg` | Preserves responsive content rendering without copying `original`. |
| Pinterest pin generation | `original` | Only place where `original` should be consumed. |

Rules:

- `original` is required in `media.variants_json` for image media and is only for Pinterest pin generation or high-quality regeneration.
- Do not store `original` in public/card/related-content snapshots.
- Do not use `original` for normal public rendering, hero images, cards, or related content.
- Do not include every media variant in `related_content` by default; keep the complete set in `media.variants_json`.
- Do include `width` and `height` for every stored snapshot variant.
- Prefer `sm` + `md` for normal food-blog cards because the frontend is mobile-first.
- Add `lg` when a specific component displays the image wider than a normal card or needs a wider `srcset`.

## Responsive Rendering and `srcset`

Stored snapshots may contain `r2_key`, but rendered markup must use generated public URLs.

Example stored snapshot:

```json
{
  "variants": {
    "sm": { "r2_key": "media/pasta-sm.webp", "width": 720, "height": 480 },
    "md": { "r2_key": "media/pasta-md.webp", "width": 1200, "height": 800 },
    "lg": { "r2_key": "media/pasta-lg.webp", "width": 2048, "height": 1365 }
  }
}
```

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

- `srcset` is generated from the variants available in the stored snapshot.
- If a component needs `sm`, `md`, and `lg` for responsive rendering, its snapshot must include those variants.
- Do not fetch the `media` row at public render time just to complete a missing snapshot unless the component explicitly owns that fallback.
- Do not include `original` in normal `srcset`.

## Public Rendering Rules

- Every rendered `<img>` must have `width`, `height`, and appropriate `loading`.
- Stored image JSON should not contain absolute URLs.
- Public image props/responses must not expose `r2_key`.
- Build public URLs at the API/service/render boundary using the media helpers.
- Prefer snapshots for cards and related content to avoid runtime media joins.

## Related Content Image Snapshot

`related_content.image` uses a compact stored snapshot with `r2_key`. The default variant set is `sm` + `md` because the front site is mobile-first and related cards should stay lightweight. The public renderer converts the keys to URLs without reading D1.

```json
{
  "media_id": 55,
  "alt": "Bowl of easy pasta",
  "variants": {
    "sm": { "r2_key": "media/easy-pasta-sm.webp", "width": 720, "height": 480 },
    "md": { "r2_key": "media/easy-pasta-md.webp", "width": 1200, "height": 800 }
  }
}
```

Rules:

- Include `sm` or `md`; ideally include both.
- Do not store absolute URLs.
- Do not require a D1/media lookup during public rendering.
