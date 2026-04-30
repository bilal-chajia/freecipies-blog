# Authors Table Contract

> **Last Updated:** 2026-04-29

This document is the product/data contract for the `authors` table. The executable SQL source remains `db/schema.sql`.

## Scope

`authors` owns public bylines, author profile pages, team listings, and author attribution snapshots used by article cards and search.

Related contracts:

- `docs/ARTICLE_TABLE_CONTRACT.md` for `articles.author_id` and `cached_author_json`
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for article-side author snapshots
- `docs/MEDIA_IMAGE_CONTRACT.md` for avatar and cover slots
- `docs/MEDIA_TABLE_CONTRACT.md` for source media records

## Source Of Truth

The `authors` row is the source of truth for public author identity, profile content, avatar/cover snapshots, biography, and SEO overrides.

`articles.author_id` is the source of truth for article attribution. `articles.cached_author_json` is only a regenerable display/search snapshot.

## Columns

| Column | Required | Owner | Contract |
| --- | --- | --- | --- |
| `id` | yes | DB | Internal numeric identity. |
| `slug` | yes | Admin/API | Unique public route identifier. Lowercase kebab-case. Treat as stable after publish. |
| `name` | yes | Admin/API | Public display name. Used in bylines, cards, search, and JSON-LD author output. |
| `email` | yes | Admin/internal | Unique internal contact/auth email. Not public unless explicitly exposed in `bio_json`. |
| `job_title` | no | Admin/editorial | Public professional title. |
| `role` | no | Admin/auth | Internal author role: `guest`, `staff`, `editor`, `admin`. |
| `headline` | no | Admin/editorial | Profile page H1. Falls back to `name`. |
| `subtitle` | no | Admin/editorial | Profile tagline. |
| `short_description` | yes | Admin/editorial | Short public bio for cards and SEO fallback. |
| `excerpt` | no | Admin/editorial | Longer teaser for listings/newsletter contexts. |
| `introduction` | no | Admin/editorial | Profile hero copy. May support markdown. |
| `images_json` | no | Admin/media | Avatar, cover, and optional banner slots. See `docs/MEDIA_IMAGE_CONTRACT.md`. |
| `bio_json` | no | Admin/editorial/AI | Long biography, AI persona, and social links. |
| `seo_json` | publish-required | Admin/SEO | Author profile SEO payload. SQL default is `{}`, but public authors must have complete SEO before publish. |
| `is_online` | no | Admin/workflow | Public profile visibility. |
| `is_featured` | no | Admin/editorial | Featured author flag. |
| `sort_order` | no | Admin/navigation | Team/list ordering. |
| `cached_post_count` | no | App | Denormalized count of online, non-deleted articles by this author. |
| `created_at` | no | DB | UTC creation timestamp. |
| `updated_at` | no | DB | Updated by SQL trigger. |
| `deleted_at` | no | App | Soft delete marker. Active queries must filter `deleted_at IS NULL`. |

## JSON Fields

### `images_json`

Purpose: author-specific media snapshots.

Expected slots:

```json
{
  "avatar": {
    "media_id": 22,
    "alt": "Jane Doe",
    "aspect_ratio": "1:1",
    "variants": {
      "xs": { "r2_key": "media/jane-xs.webp", "width": 50, "height": 50 },
      "sm": { "r2_key": "media/jane-sm.webp", "width": 100, "height": 100 }
    }
  },
  "cover": {
    "media_id": 23,
    "alt": "Jane Doe cooking",
    "aspect_ratio": "16:9",
    "variants": {
      "md": { "r2_key": "media/jane-cover-md.webp", "width": 1200, "height": 675 },
      "lg": { "r2_key": "media/jane-cover-lg.webp", "width": 2048, "height": 1152 }
    }
  }
}
```

Rules:

- Avatar render contexts usually need `xs` and `sm`; full profile pages may use larger variants.
- Cover render contexts usually need `md` and `lg`.
- Internal snapshots may contain `r2_key`; public API/frontend props must convert to URLs.
- The source media row remains the full asset source of truth.

### `bio_json`

Purpose: long-form author biography, AI writing persona, and public social links.

```json
{
  "short": "Jane writes practical weeknight recipes.",
  "long": "Jane has developed recipes for home cooks for over 10 years.",
  "persona": {
    "voice": "Warm, practical, precise, and encouraging.",
    "expertise": ["weeknight dinners", "Mediterranean cooking", "meal prep"],
    "audience": "Busy home cooks who want reliable recipes without complicated techniques.",
    "point_of_view": "Food should be simple, seasonal, and realistic for everyday kitchens.",
    "avoid": ["overly technical language", "diet claims without evidence", "unverified health promises"]
  },
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

- `long` may contain markdown if the renderer supports it.
- `persona` is used by AI generation tools to keep content consistent with the author.
- `persona` is editorial guidance, not public biography copy by default.
- `persona.voice`, `persona.expertise`, `persona.audience`, and `persona.point_of_view` should be filled before using this author for AI-assisted content generation.
- `persona.avoid` should list writing patterns, claims, topics, or tone choices that the AI should not use.
- Public emails should only be exposed through an intentional `socials` item.
- Allowed networks should remain controlled by validation/UI: `twitter`, `instagram`, `facebook`, `youtube`, `pinterest`, `tiktok`, `linkedin`, `website`, `email`, `custom`.

### `seo_json`

Purpose: required SEO payload for public author profile pages.

```json
{
  "meta_title": "Jane Doe - Recipe Developer | Freecipies",
  "meta_description": "Meet Jane Doe, a recipe developer focused on easy dinners.",
  "no_index": false,
  "canonical": null,
  "og_image": null,
  "og_title": null,
  "og_description": null,
  "twitter_card": "summary_large_image"
}
```

Rules:

- Prefer `snake_case` in new JSON fields.
- SQL stores `seo_json` with default `{}` for draft flexibility, but `is_online = 1` authors must have a complete SEO payload.
- Required before publish: `meta_title`, `meta_description`, `no_index`, and `twitter_card`.
- `canonical`, `og_image`, `og_title`, and `og_description` may be `null` and derived by the renderer/service.
- Missing draft values may derive from `name`, `job_title`, and `short_description`, but this fallback is not the final publish contract.

## Relationships

- `articles.author_id -> authors.id` is required and uses `ON DELETE RESTRICT`.
- `articles.cached_author_json` is regenerated from `authors` when author identity/display/avatar fields change.

## Runtime Usage

Admin:

- Author editor creates profile content and avatar/cover snapshots.
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
- `images_json`, `bio_json`, `seo_json`: valid JSON.
- Public authors (`is_online = 1`) require complete `seo_json`.
- Authors used for AI-assisted content generation require `bio_json.persona`.
- Social URLs must be valid URLs.
- Public queries: `deleted_at IS NULL`; public profile listings also require `is_online = 1`.

## Cache Rules

Article-side `cached_author_json` should stay minimal:

```json
{
  "id": 5,
  "slug": "jane-doe",
  "name": "Jane Doe",
  "job_title": "Recipe Developer",
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

- Use snapshots for bylines/cards to avoid avoidable joins.
- Author profile data remains in `authors`.
- Public props convert avatar `r2_key` values to URLs.
