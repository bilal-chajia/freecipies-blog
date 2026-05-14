# Authors Table Contract

> **Last Updated:** 2026-05-14

This document is the product/data contract for the `authors` table. The executable SQL source remains `db/schema.sql`.

## Scope

`authors` owns public bylines, author profile pages, team listings, and author attribution snapshots used by article cards and search.

Related contracts:

- `docs/ARTICLE_TABLE_CONTRACT.md` for `articles.author_id` and `cached_author_json`
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for article-side author snapshots
- `docs/IMAGE_JSON_CONTRACT.md` for avatar and hero slots
- `docs/MEDIA_TABLE_CONTRACT.md` for source media records
- `docs/NAMING_CONTRACT.md` for stored JSON naming rules

## Source Of Truth

The `authors` row is the source of truth for public author identity, profile content, avatar/hero snapshots, biography, and SEO overrides.

`articles.author_id` is the source of truth for article attribution. `articles.cached_author_json` is only a regenerable display/search snapshot.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. |
| `slug` | yes | Admin/API | Unique public route identifier for `/authors/{slug}`. Lowercase kebab-case. Treat as stable after publish. |
| `name` | yes | Admin/API | Public display name. Used in bylines, cards, search, and JSON-LD author output. |
| `email` | yes | Admin/internal | Unique internal contact/auth email. Never copied to public article caches, public JSON-LD, cards, or profile output by default. |
| `role` | no | Admin/auth | Internal workflow/auth role: `guest`, `staff`, `editor`, `admin`. Never use as the public title. |
| `job_title` | no | Admin/editorial | Public professional title. Copied to `articles.cached_author_json.job_title`. |
| `headline` | no | Admin/editorial | Profile page H1. Falls back to `name`. |
| `subtitle` | no | Admin/editorial | Profile tagline. |
| `short_description` | yes | Admin/editorial | Short public bio. Source for `articles.cached_author_json.bio`, author cards, and SEO fallback. |
| `introduction` | no | Admin/editorial | Visible profile hero/body introduction. Not copied to article caches. Markdown support is renderer-dependent. |
| `images_json` | no | Admin/media | Avatar and hero slots. See `docs/IMAGE_JSON_CONTRACT.md`. |
| `bio_json` | no | Admin/editorial | Public author page content, expertise labels, and intentional public social/contact links. |
| `persona_json` | no | Admin/AI | Private AI/editorial persona instructions for this author. Never rendered publicly by default. |
| `seo_json` | publish-required | Admin/SEO | Author profile SEO payload. SQL default is `{}`, but public authors must store the complete v1 shape before publish. |
| `is_featured` | no | Admin/editorial | Featured author eligibility flag. Public featured surfaces still require `is_online = 1` and `deleted_at IS NULL`. |
| `is_online` | no | Admin/workflow | Public author profile/listing visibility. Does not erase article bylines already stored in article caches. |
| `sort_order` | no | Admin/navigation | Team/author-list ordering; lower values render first. Not related to article ordering. |
| `cached_post_count` | no | App | Denormalized count of online, non-deleted articles where `articles.author_id = authors.id`. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active author queries must filter `deleted_at IS NULL`; linked authors must not be hard-deleted. |

## Column Rules

### Identity And Internal Fields

- `id` is the internal database identity. Public URLs and payloads use
  `slug` when a stable public identifier is needed.
- `slug` owns the author route. Changing a published `slug` requires an
  explicit redirect plan outside this table contract.
- `name` is the public display name and is safe for article caches, public
  rendering, search, and JSON-LD.
- `email` is private by default. It must not be copied to
  `articles.cached_author_json`, `articles.cached_card_json`, public JSON-LD,
  author cards, RSS, or public profile output.
- Public contact email belongs only in `bio_json.socials[]` when the editor
  intentionally creates a public `email` social/contact item.
- `role` is for admin/workflow/auth behavior only. Public UI labels must use
  `job_title`, not `role`.

### Public Profile Text

- `job_title` is the compact public title used in bylines, cards, author boxes,
  and author profile headers.
- `headline` is the author profile H1. If empty, render `name`.
- `subtitle` is optional profile support copy below the H1. It is not an article
  cache field.
- `short_description` is the canonical short public bio. It feeds author cards,
  SEO fallbacks, and `articles.cached_author_json.bio`.
- `introduction` is visible long-form profile introduction copy. It stays on the
  author profile page and is not copied into article relationship caches.

### Workflow And Metrics

- `is_featured` only controls eligibility for featured-author surfaces. Public
  featured rendering must also require `is_online = 1` and `deleted_at IS NULL`.
- `is_online` controls whether the author profile and author listings are
  publicly visible. Existing article pages can still render their saved
  `cached_author_json` byline when an author is later taken offline.
- `sort_order` controls author/team listing order only.
- `cached_post_count` counts public articles authored by this author:
  `articles.is_online = 1` and `articles.deleted_at IS NULL`.
- `deleted_at` is the lifecycle archive marker. Because articles reference
  authors, deletion workflows must soft delete instead of hard deleting linked
  authors.

## JSON Fields

### `images_json`

Purpose: author-specific public image snapshots for the author profile and
author display surfaces.

Canonical slots:

- `avatar`: compact author portrait used in bylines, author cards, author boxes,
  and author profile header.
- `hero`: wide author profile/header image.

Stored shape:

```json
{
  "avatar": {
    "media_id": 22,
    "alt": "Jane Doe",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "1:1",
    "variants": {
      "xs": { "r2_key": "media/jane-xs.webp", "width": 50, "height": 50 },
      "sm": { "r2_key": "media/jane-sm.webp", "width": 100, "height": 100 }
    }
  },
  "hero": {
    "media_id": 23,
    "alt": "Jane Doe cooking",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "16:9",
    "variants": {
      "sm": { "r2_key": "media/jane-hero-sm.webp", "width": 720, "height": 405 },
      "md": { "r2_key": "media/jane-hero-md.webp", "width": 1200, "height": 675 },
      "lg": { "r2_key": "media/jane-hero-lg.webp", "width": 2048, "height": 1152 }
    }
  }
}
```

Rules:

- `avatar` and `hero` are structural author display images.
- `avatar` is optional; when present it must include `media_id`, `alt`,
  `placeholder`, `aspect_ratio`, and `variants.xs` + `variants.sm`.
- `hero` is optional; when present it must include `media_id`, `alt`,
  `placeholder`, `aspect_ratio`, and `variants.sm` + `variants.md` +
  `variants.lg`.
- `focal_point` is optional, but use it when the default center crop is not
  correct for the author image.
- `avatar.aspect_ratio` must be `1:1`.
- `hero.aspect_ratio` must match the intended profile hero crop. The default
  profile hero ratio is `16:9`.
- `avatar` and `hero` must not store `caption` or `credit`; those are for
  contextual content images and recipe step images.
- Stored snapshots contain `r2_key`, never public `url`.
- Public API/frontend props must convert `r2_key` to `url` before rendering.
- `original` must not be copied into `authors.images_json`; the source media row
  remains the full asset source of truth.
- `cached_author_json.avatar` derives from `authors.images_json.avatar` and
  keeps only the compact author display snapshot needed by article caches.

### `bio_json`

Purpose: public long-form author biography content, public expertise labels, and public social links.

```json
{
  "content": {
    "blocks": [
      {
        "id": "block-1",
        "type": "heading",
        "level": 2,
        "text": "Cooking Philosophy"
      },
      {
        "id": "block-2",
        "type": "paragraph",
        "text": "Jane focuses on clear steps and reliable results."
      }
    ]
  },
  "expertise": ["weeknight dinners", "Mediterranean cooking", "meal prep"],
  "socials": [
    {
      "network": "instagram",
      "url": "https://instagram.com/janedoe",
      "label": "@janedoe"
    },
    {
      "network": "website",
      "url": "https://jane.example",
      "label": "Jane's Kitchen"
    }
  ]
}
```

Rules:

- `bio_json` is public-renderable content only.
- `bio_json.content.blocks[]` reuses stored block shapes from
  `docs/CONTENT_BLOCKS_CONTRACT.md`, but only for author-page editorial blocks.
- Allowed author bio block types are: `heading`, `paragraph`, `blockquote`,
  `list`, `tip_box`, `divider`, and `table`.
- Author bio content must not use `image`, `before_after`, `related_content`,
  `main_recipe`, `main_roundup`, `main_faq`, or `video` unless this contract is
  explicitly expanded later.
- Author page rich content is edited with the admin BlockEditor and stored in `bio_json.content.blocks[]`.
- `short_description` stays as a top-level column and must not be duplicated as `bio_json.short`.
- `introduction` stays as a top-level column and must not be duplicated as `bio_json.introduction`.
- `bio_json` must not contain `persona`, AI instructions, admin-only notes, private moderation notes, or private contact data.
- `expertise[]` is public and can be rendered on the author page.
- Public emails are exposed only through an intentional `socials` item.
- Allowed networks are controlled by validation/UI: `twitter`, `instagram`, `facebook`, `youtube`, `pinterest`, `tiktok`, `linkedin`, `website`, `email`, `custom`.

### `persona_json`

Purpose: private AI/editorial persona used by generation tools to keep author voice and constraints consistent.

```json
{
  "voice": "Warm, practical, precise, and encouraging.",
  "audience": "Busy home cooks who want reliable recipes without complicated techniques.",
  "point_of_view": "Food should be simple, seasonal, and realistic for everyday kitchens.",
  "expertise": ["weeknight dinners", "Mediterranean cooking", "meal prep"],
  "avoid": ["overly technical language", "diet claims without evidence", "unverified health promises"]
}
```

Rules:

- `persona_json` is not public profile copy.
- Public author rendering must not read or expose `persona_json` by default.
- AI-assisted content generation can use `persona_json`.
- `voice`, `audience`, and `point_of_view` are required before using this author for AI-assisted content generation.
- `expertise[]` in `persona_json` is AI guidance and can differ from public `bio_json.expertise[]`.
- `avoid[]` lists writing patterns, claims, topics, or tone choices that the AI must not use.

### `seo_json`

Purpose: publish-required HTML metadata payload for public author profile pages.

`seo_json` controls author page metadata only. It does not replace author source
fields, article caches, `bio_json`, or generated Schema.org output.

Empty strings are not valid override values. Use `null` when the renderer should
derive the value from author source fields.

```json
{
  "meta_title": null,
  "meta_description": null,
  "no_index": false,
  "canonical": null,
  "og_image": "https://example.com/images/jane-doe-og.webp",
  "og_title": null,
  "og_description": null,
  "twitter_card": "summary_large_image"
}
```

Field rules:

| Field | Required | Stored value | Fallback when `null` |
| --- | --- | --- | --- |
| `meta_title` | yes | `string` or `null` | `headline`, then `name`, plus site naming policy. |
| `meta_description` | yes | `string` or `null` | `short_description`, then `introduction`, then visible text from `bio_json.content.blocks[]`. |
| `no_index` | yes | `boolean` | `false`. |
| `canonical` | yes | absolute URL string or `null` | Public author URL derived from `/authors/{slug}`. |
| `og_image` | yes | absolute public image URL string | Derived before publish from `images_json.hero`, then `images_json.avatar`, then the site default OG image. |
| `og_title` | yes | `string` or `null` | Resolved `meta_title`. |
| `og_description` | yes | `string` or `null` | Resolved `meta_description`. |
| `twitter_card` | yes | `"summary"` or `"summary_large_image"` | `"summary_large_image"`. |

Rules:

- `seo_json` stores overrides and explicit metadata decisions only.
- Public rendering must resolve fallbacks before emitting `<title>`, meta
  description, canonical, Open Graph, or Twitter metadata.
- `no_index = true` emits noindex metadata for the author page.
- `canonical`, when present, must be an absolute URL.
- `og_image` must be a non-empty public image URL before publish.
- `og_image` is derived from the largest suitable author image available.
- Author Open Graph image fallback uses the largest available public image in
  this order:
  - `images_json.hero.variants.lg`
  - `images_json.hero.variants.md`
  - `images_json.avatar.variants.sm`
  - site default OG image
- When author image snapshots change, regenerate `seo_json.og_image`.
- Open Graph image fallback must not use `xs` and must not use `original`.
- Open Graph image output exposes public `url`, never stored `r2_key`.
- `seo_json` must not store image snapshots, `media_id`, `r2_key`, `original`,
  or image URLs outside `og_image`.
- `seo_json` must not contain Schema.org or JSON-LD payloads. Generated author
  `Person` JSON-LD belongs to the public rendering/SEO generation layer and
  must be derived from author source fields, public image snapshots, public
  socials, and site organization settings.
- `seo_json` must not contain `persona_json`, private email, admin role,
  article-list data, social handles outside `bio_json.socials[]`, or arbitrary
  page layout settings.

## Relationships

- `articles.author_id -> authors.id` is required and uses `ON DELETE RESTRICT`.
- `articles.cached_author_json` is regenerated from `authors` when author identity/display/avatar fields change.

## Runtime Usage

Admin:

- Author editor creates profile content and avatar/hero snapshots.
- Article editor reads author lookup data.

Public Astro:

- Article bylines can render from `cached_author_json`.
- Author profile pages route by `authors.slug`.
- Team pages read online, non-deleted authors ordered by `sort_order`.

## Validation Rules

- `slug`: required, unique, lowercase kebab-case.
- `name`: required public display name.
- `email`: required, unique, internal by default.
- `short_description`: required.
- `role`: one of `guest`, `staff`, `editor`, `admin`.
- `images_json`, `bio_json`, `persona_json`, `seo_json`: valid JSON.
- Public authors (`is_online = 1`) require complete `seo_json`.
- Authors used for AI-assisted content generation require `persona_json`.
- Social URLs must be valid URLs.
- Public queries: `deleted_at IS NULL`; public profile listings also require `is_online = 1`.

## Cache Rules

Article-side `cached_author_json` is a derived display snapshot stored on
`articles`. The canonical cache shape is defined in
`docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`; this section documents how the
`authors` table feeds that cache.

```json
{
  "id": 5,
  "slug": "jane-doe",
  "name": "Jane Doe",
  "job_title": "Recipe Developer",
  "bio": "Jane develops practical weeknight recipes for busy families.",
  "avatar": {
    "media_id": 22,
    "alt": "Jane Doe",
    "placeholder": "data:image/jpeg;base64,...",
    "variants": {
      "xs": { "r2_key": "media/jane-avatar-xs.webp", "width": 50, "height": 50 },
      "sm": { "r2_key": "media/jane-avatar-sm.webp", "width": 100, "height": 100 }
    }
  },
  "social_links": [
    {
      "network": "instagram",
      "url": "https://instagram.com/janedoe",
      "label": "@janedoe"
    }
  ]
}
```

Rules:

- `cached_author_json` is generated at article save/cache refresh time from the
  selected author row.
- It is used for article bylines, author boxes, cards, search, and related
  article payloads that must not join `authors` during normal rendering.
- `id` is copied from `authors.id`.
- `slug` is copied from `authors.slug`.
- `name` is copied from `authors.name`.
- `job_title` is copied from `authors.job_title`.
- `bio` is copied from `authors.short_description`.
- `avatar` is copied from `authors.images_json.avatar`.
- `avatar` is required in the cache shape and must be either the compact avatar
  snapshot or `null`.
- When `avatar` is present, it stores only `xs` and `sm`, includes
  `placeholder`, and uses `r2_key`.
- If the author has no avatar, store `avatar: null`; do not omit the field and
  do not invent a synthetic image object.
- `cached_author_json.avatar` must not store `caption`, `credit`, `hero`,
  `original`, or public `url`.
- `social_links` is copied from public `bio_json.socials[]` using the same
  `{ network, url, label }` shape. Use an empty array when no public social
  links should render.
- `social_links[]` must not use the older `platform` key.
- `cached_author_json` must not become a full author profile cache.
- `cached_author_json` must not store `email`, `role`, `is_online`,
  `is_featured`, `sort_order`, `cached_post_count`, `bio_json.content`,
  `persona_json`, `seo_json`, admin-only fields, private contact data, or
  moderation/workflow fields.
- Public props convert avatar `r2_key` values to `url` before rendering.
- Refresh this cache when `authors.name`, `authors.slug`, `authors.job_title`,
  `authors.short_description`, public `bio_json.socials[]`, or
  `authors.images_json.avatar` changes.
- Full author profile data remains in `authors`; author profile pages must read
  the author row, not `articles.cached_author_json`.
