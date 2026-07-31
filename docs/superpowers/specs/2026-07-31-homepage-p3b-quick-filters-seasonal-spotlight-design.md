# Homepage P3B Quick Filters and Seasonal Spotlight Design

**Date:** 2026-07-31

## Goal

Add two optional, editor-controlled homepage sections: quick recipe filters and a seasonal editorial spotlight. Both remain disabled by default and use the existing homepage settings save, cache, ordering, and public rendering paths.

## Scope

- `quick_filters` is an ordered group of editor-authored links to internal recipe listing URLs.
- `seasonal_spotlight` is an editorial image, title, body, and CTA band.
- The spotlight image is a stored structural media snapshot. Public homepage rendering uses the snapshot and does not query D1 for the image.
- Homepage admin can enable, edit, reorder, save, reload, and preview both sections.
- Media updates refresh referenced spotlight snapshots and invalidate the homepage settings cache.

## Stored Shapes

All stored keys are `snake_case`.

```json
{
  "id": "quick_filters",
  "type": "quick_filters",
  "enabled": false,
  "title": "Explore recipes",
  "filters": [
    { "label": "Quick dinners", "href": "/recipes?tag=quick" }
  ]
}
```

```json
{
  "id": "seasonal_spotlight",
  "type": "seasonal_spotlight",
  "enabled": false,
  "title": "Summer cooking",
  "body": "Fresh ideas for warm days.",
  "image": {
    "media_id": 55,
    "alt": "Seasonal salad",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "4:3",
    "variants": {
      "sm": { "r2_key": "media/salad-sm.webp", "width": 720, "height": 540 },
      "md": { "r2_key": "media/salad-md.webp", "width": 1200, "height": 900 },
      "lg": { "r2_key": "media/salad-lg.webp", "width": 2048, "height": 1536 }
    }
  },
  "cta": { "label": "Browse summer recipes", "href": "/recipes?category=summer" }
}
```

The image follows the shared structural image snapshot contract: `caption` and `credit` are omitted; `original` is never copied. Snapshot variants retain internal `r2_key` values only in stored settings. Server rendering turns them into public URLs and emits width, height, `srcset`, `sizes`, and `loading="lazy"`.

## Admin Behavior

Quick filters have immutable add, edit, delete, and drag-reorder operations. Each saved filter must have a nonblank label and a valid internal recipe URL beginning with `/recipes`.

The spotlight uses the existing Media Library selection flow and `buildImageSlotFromMedia` with `sm`, `md`, and `lg` variants. Its title, body, CTA label, and CTA URL are controlled fields. CTA URLs may be valid internal site paths or absolute `https:` URLs. An external CTA displays in a new tab with `rel="noopener noreferrer"`.

Both sections appear in the existing Homepage section navigation and participate in its normal reordering and enabled state. FAQ remains the only fixed-last section.

## Public Rendering

`HomeSections.astro` dispatches both sections in configured order.

- Quick filters render as an accessible responsive link row. Empty or disabled sections render nothing.
- The seasonal spotlight renders a single unframed editorial band using the site tokens and the existing editorial visual language. The image and copy stack on narrow screens and sit side by side on wider screens.
- The spotlight renders only when it has a complete image snapshot, nonblank title/body, and complete CTA. It does not issue a media lookup at render time.

## Media Synchronization

`propagateMediaUpdate` gains a homepage-settings branch. When a matching spotlight snapshot is found, it applies the shared image snapshot patch with `sm`, `md`, and `lg` variants, updates `site_settings.homepage_settings`, and invalidates `site_settings:v1:homepage_settings`.

The scan is limited to the single settings row and to snapshots with the changed `media_id`. A failed synchronization does not block the successful media update, consistent with existing snapshot synchronization behavior.

## Validation and Failure Behavior

- Zod rejects unknown fields, incomplete image variants, whitespace-only editor content, invalid filter URLs, and unsafe CTA protocols.
- Older homepage settings receive disabled defaults for both new sections exactly once.
- Invalid stored image snapshots, incomplete spotlight content, or empty filters are omitted from public rendering.
- No public API or HTML exposes `r2_key`.

## Tests

- Homepage settings defaults and Zod validation for both new discriminated section types.
- Immutable quick-filter transformations and normal homepage ordering behavior.
- Snapshot creation from the Media Library payload and public URL resolution without a D1 lookup.
- Homepage data and rendering tests for enabled, disabled, complete, and invalid section states.
- Snapshot synchronization updates the matching homepage setting and invalidates cache.
- Focused tests, `pnpm typecheck`, `pnpm check:boundaries`, and explicit browser checks at desktop and mobile widths.

## Out of Scope

- Search analytics, tracking links, external social feeds, newsletter delivery, and the other deferred P3 section types.
- Changes to canonical contracts.
