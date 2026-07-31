# Homepage P3C Social Proof and Lead Magnet Design

**Date:** 2026-07-31

**Parent design:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md`

## Goal

Complete the next P3 slice with two optional, editor-controlled homepage sections:
`social_proof` and `lead_magnet`. Both use the existing homepage settings order, save,
cache, admin navigation, and public dispatcher. They remain disabled by default.

`social_feed` remains a separate P3D slice because external feed providers introduce
third-party scripts, privacy requirements, failure states, and performance costs that need
their own design.

## Decisions

- Homepage settings remain the only source of truth for both sections.
- Public rendering performs no media lookup and no section-specific D1 query.
- Every configured image is a structural media snapshot with `sm`, `md`, and `lg`
  variants. Stored settings use `r2_key`; admin and public representations use `url`.
- Social proof is editor-authored. P3C does not aggregate ratings, reviews, or analytics.
- Lead-magnet CTAs accept internal paths and absolute HTTPS URLs. External links open in a
  new tab with `rel="noopener noreferrer"`.
- FAQ remains the only fixed-last homepage section.

## Stored Shapes

All stored keys use `snake_case`.

```json
{
  "id": "social_proof",
  "type": "social_proof",
  "enabled": false,
  "eyebrow": "Trusted by home cooks",
  "title": "Recipes that work in real kitchens",
  "stats": [
    { "value": "500+", "label": "tested recipes" }
  ],
  "testimonials": [
    {
      "quote": "The instructions are clear and the results are reliable.",
      "name": "Maria D.",
      "role": "Home cook"
    }
  ],
  "logos": [
    {
      "name": "Featured publication",
      "image": {
        "media_id": 55,
        "alt": "Featured publication logo",
        "placeholder": "data:image/jpeg;base64,...",
        "aspect_ratio": "3:2",
        "variants": {
          "sm": { "r2_key": "media/logo-sm.webp", "width": 720, "height": 480 },
          "md": { "r2_key": "media/logo-md.webp", "width": 1200, "height": 800 },
          "lg": { "r2_key": "media/logo-lg.webp", "width": 2048, "height": 1365 }
        }
      }
    }
  ]
}
```

```json
{
  "id": "lead_magnet",
  "type": "lead_magnet",
  "enabled": false,
  "eyebrow": "Free kitchen guide",
  "title": "Cook with more confidence",
  "body": "Get the practical guide for planning dependable weeknight meals.",
  "image": {
    "media_id": 61,
    "alt": "Weeknight cooking guide cover",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "4:3",
    "variants": {
      "sm": { "r2_key": "media/guide-sm.webp", "width": 720, "height": 540 },
      "md": { "r2_key": "media/guide-md.webp", "width": 1200, "height": 900 },
      "lg": { "r2_key": "media/guide-lg.webp", "width": 2048, "height": 1536 }
    }
  },
  "cta": { "label": "Get the guide", "href": "/guides/weeknight-cooking" }
}
```

The shared homepage snapshot type is reused. Structural snapshots omit `caption`,
`credit`, and `original`. Every variant includes `width` and `height`, and every rendered
snapshot includes a placeholder.

For disabled-section drafting, a configured logo row may temporarily have a blank name or
`image: null`. Enabling the section requires every retained logo row to have a nonblank
name and a complete snapshot. Public rendering filters incomplete draft rows.

## Defaults and Ordering

Legacy and partial settings receive each missing P3C section exactly once:

- `social_proof` is inserted after `latest` and before `about_author`;
- `lead_magnet` is inserted after `about_author` and before `newsletter`;
- both are disabled with empty content arrays or fields;
- `faq` is normalized back to the final position without changing the relative order of
  other stored sections.

The same normalization runs before persistence, so a direct Homepage API client cannot
store a missing P3C catalog entry or move FAQ away from the final position.

## Admin Behavior

Both section editors follow the existing Homepage admin patterns and participate in normal
enable/disable and drag-reorder behavior.

### Social proof

- Editors control eyebrow and title text.
- Stats support add, edit, remove, and drag-reorder. Maximum: 4.
- Testimonials support add, edit, remove, and drag-reorder. Maximum: 6.
- Logos support add, rename, replace image, remove, and drag-reorder. Maximum: 6.
- Logo images use the existing Media Library dialog and the shared homepage snapshot
  builder.

### Lead magnet

- Editors control eyebrow, title, body, image, CTA label, and CTA URL.
- The image uses the existing Media Library dialog and the shared homepage snapshot
  builder.
- The section may remain incomplete while disabled. Enabling or publishing an enabled
  section requires complete content.

The admin API presents public image URLs only. It rejects caller-provided `r2_key` fields
and converts validated local image URLs back to storage keys before persistence.

## Validation

- Zod remains a strict discriminated union on `section.type`.
- Enabled `social_proof` requires a nonblank title and at least one valid stat,
  testimonial, or logo.
- In enabled social proof, stat values and labels are nonblank; testimonial quote and name
  are nonblank; role is optional; logo name and complete image are required. Disabled
  sections may persist incomplete draft rows.
- Enabled `lead_magnet` requires nonblank eyebrow, title, body, CTA label, safe CTA URL,
  and a complete image snapshot.
- CTA URLs must be an internal path beginning with `/` or an absolute `https:` URL.
  Protocol-relative URLs and executable or insecure protocols are rejected.
- Limits are enforced in both admin transformations and Zod validation.
- Invalid or incomplete stored sections are omitted from public rendering rather than
  producing an empty shell.

## Public Rendering

`HomeSections.astro` dispatches both sections in configured order.

- Social proof renders as one unframed editorial band. The heading leads into a compact
  stats row, a restrained testimonial grid, and an optional monochrome logo row. Empty
  groups are omitted. It does not use nested cards or a client carousel.
- Lead magnet renders as one editorial split band with image and concise copy. It stacks
  at narrow widths and uses a side-by-side layout on wider screens.
- Both use existing design tokens, Playfair Display headings, Source Sans 3 body text,
  fixed image dimensions, lazy loading, and the existing `data-fade-up` enhancement.
- Public image markup emits `srcset`, `sizes`, `width`, `height`, and never exposes
  `r2_key`.

## Image Resolution and Synchronization

The homepage image boundary is generalized from spotlight-only handling to all homepage
structural snapshots. It recursively copies settings while resolving only known image
locations:

- `seasonal_spotlight.image`;
- `social_proof.logos[].image`;
- `lead_magnet.image`.

The media snapshot propagation service scans only the `homepage_settings` row for the
changed `media_id`. It patches every matching known location with `sm`, `md`, and `lg`
variants, writes the settings row once when any snapshot changed, and invalidates
`site_settings:v1:homepage_settings` once. Failures remain best-effort and do not roll back
the successful media update.

## Canonical Contract Update

`docs/SITE_SETTINGS_TABLE_CONTRACT.md` is updated in P3C to:

- promote `quick_filters` and `seasonal_spotlight` from reserved to active types;
- add active `social_proof` and `lead_magnet` shapes and rules;
- document structural snapshot storage, API resolution, synchronization, defaults, and
  ordering.

No changes are required in `IMAGE_JSON_CONTRACT.md`, `MEDIA_TABLE_CONTRACT.md`,
`NAMING_CONTRACT.md`, or `API.md`; P3C follows their existing rules and reuses the current
Homepage GET/PUT endpoint.

## Tests and Verification

- Settings normalization inserts P3C defaults once and preserves ordering.
- Zod accepts valid disabled and enabled sections and rejects incomplete, oversized, or
  unsafe payloads.
- Image presentation and storage normalization cover spotlight, social-proof logos, and
  lead-magnet images without exposing `r2_key`.
- Admin list transformations are immutable, ordered, deduplicated where applicable, and
  enforce item limits.
- Public view-model construction omits invalid sections and performs no media lookup.
- Snapshot synchronization patches all matching homepage images with one settings write
  and one cache invalidation.
- Focused Vitest suites, `pnpm typecheck`, `pnpm check:boundaries`, and `pnpm astro check`
  must pass.
- Browser verification covers admin save/reload and desktop, tablet, and mobile public
  layouts. No production build is run without explicit permission.

## Out of Scope

- `social_feed`, third-party embeds, external feed APIs, ratings aggregation, analytics,
  lead capture delivery, newsletter delivery, and changes to article or recipe contracts.
