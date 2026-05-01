# Article Cached Fields Contract

> **Last Updated:** 2026-04-29

This document is the canonical contract for regenerable cached fields on the `articles` table.

For the full `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.
For source JSON fields, use `docs/ARTICLE_JSON_CONTRACTS.md` and `docs/CONTENT_JSON_CONTRACT.md`.

## Core Rule

Cache and snapshot fields are not source of truth.

They exist to:

- avoid repeated D1 joins on public pages
- make cards, related content, search, and JSON-LD cheaper to render
- denormalize stable display data at article-save time

Every cache field must be regenerable from source tables or source JSON.

## Field Ownership

| Field | Source of truth | Purpose |
| --- | --- | --- |
| `faqs_json` | `content_json.blocks[]` `faq_section` | Intermediate FAQ extraction cache used to build `jsonld_json`. |
| `cached_tags_json` | `articles_to_tags` + `tags` | Minimal tag snapshots for cards/search. |
| `cached_category_json` | `categories` | Category snapshot for cards/lists/search. |
| `cached_author_json` | `authors` | Author byline/card snapshot. |
| `cached_equipment_json` | `recipe_json.equipment[*].equipment_id` + active `equipment` rows | Rich equipment card snapshots for recipe rendering. |
| `cached_rating_json` | `recipe_json.aggregate_rating` | Rating display snapshot. |
| `cached_toc_json` | `content_json.blocks[]` `heading` | Table of contents cache. |
| `cached_recipe_json` | `recipe_json` | Lightweight recipe snapshot for lists, cards, roundup items, related content, and filters. |
| `cached_card_json` | article source fields + image slot/media snapshot | Zero-join card payload for listings, pickers, related content. |
| `jsonld_json` | article source fields + caches including `faqs_json` | Final generated Schema.org JSON-LD cache read by the frontend. |

Scalar mirrors:

| Field | Source | Purpose |
| --- | --- | --- |
| `reading_time_minutes` | `content_json` text | Display and sorting helper. |
| `total_time_minutes` | `recipe_json.total` / computed recipe time | SQL recipe filtering. |
| `difficulty_label` | `recipe_json.difficulty` | SQL recipe filtering. |

## Regeneration Rules

- Regenerate caches on article save when source fields change.
- Regenerate relationship snapshots when related source rows change meaningfully.
- Never edit cache fields manually as editorial source.
- Public rendering may read caches directly.
- Admin editing should treat caches as derived output.
- If a cache is missing or invalid, the app may regenerate it from source instead of treating it as author-entered content.

## Image Snapshot Rules

Image-bearing caches must follow `docs/IMAGE_JSON_CONTRACT.md`.

Rules:

- Stored cache JSON uses `r2_key`, not public `url`.
- Stored cache JSON uses `size_bytes`, not `sizeBytes`.
- Stored image slots use `aspect_ratio`, not `aspectRatio`.
- Public API/rendering converts `r2_key` to `url`.
- Do not store `original` in normal cache/card/related snapshots.
- Copy only variants needed by the render context.

## `faqs_json`

Source:

- `content_json.blocks[]` where `type = "faq_section"`

Role:

- Intermediate FAQ extraction cache.
- Used by JSON-LD generation to build FAQPage data inside `jsonld_json`.
- Not the final structured-data payload injected by the frontend.

Shape:

```json
[
  {
    "question": "Can I freeze it?",
    "answer": "Yes."
  }
]
```

Rules:

- New writes use `question` and `answer`.
- When `faqs_json` changes, `jsonld_json` must be regenerated.

## `cached_tags_json`

Source:

- `articles_to_tags`
- `tags`

Shape:

```json
[
  {
    "id": 12,
    "label": "Quick",
    "slug": "quick"
  },
  {
    "id": 18,
    "label": "Healthy",
    "slug": "healthy"
  }
]
```

Rules:

- Each item must include `id`, `label`, and `slug`.
- This is a display/search snapshot only.
- Tag ids and membership remain in `articles_to_tags`.
- Search indexing should flatten `label`, not the full JSON object.

## `cached_category_json`

Source:

- `categories`

Minimum shape:

```json
{
  "id": 3,
  "slug": "desserts",
  "label": "Desserts",
  "color": "#ff6600ff"
}
```

Rules:

- Use this for cards/lists where joining category would be wasteful.
- `categories.id` remains the source of truth.

## `cached_author_json`

Source:

- `authors`

Minimum shape:

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

- Store avatar variants with `r2_key`.
- Public props convert avatar variants to URLs.
- Author profile data remains in `authors`.

## `cached_recipe_json`

Source:

- `recipe_json`

Purpose:

- Lightweight derived snapshot for recipe lists, roundup items, related content, and filters.
- It is not the complete recipe payload.
- Full recipe rendering must read `recipe_json`.

Shape:

```json
{
  "is_recipe": true,
  "total_time_minutes": 35,
  "difficulty": "Easy",
  "servings": 4,
  "calories_per_serving": 320,
  "primary_diet_labels": ["Vegetarian"],
  "primary_occasion_labels": ["Weeknight"],
  "main_ingredients": ["Pasta", "Tomato"],
  "is_quick": false,
  "is_healthy": false,
  "is_budget": true
}
```

Rules:

- Stored cache JSON uses `snake_case`.
- The full recipe card renderer must not depend on this cache.
- This cache must be fully regenerable from `recipe_json`.
- `total_time_minutes` should also sync to the scalar `articles.total_time_minutes`.
- `difficulty` should also sync to `articles.difficulty_label`.

## `cached_card_json`

Source:

- article source fields
- `images_json.thumbnail` or `images_json.hero`
- `cached_category_json`
- `cached_author_json`
- `cached_recipe_json` when relevant
- `cached_rating_json` when relevant

Default shape:

```json
{
  "id": 42,
  "type": "recipe",
  "slug": "easy-pasta",
  "headline": "Easy Pasta",
  "short_description": "A quick weeknight pasta.",
  "thumbnail": {
    "media_id": 55,
    "alt": "Bowl of pasta",
    "variants": {
      "sm": { "r2_key": "media/easy-pasta-sm.webp", "width": 720, "height": 480 },
      "md": { "r2_key": "media/easy-pasta-md.webp", "width": 1200, "height": 800 }
    }
  },
  "category": {
    "id": 3,
    "slug": "dinner",
    "label": "Dinner"
  },
  "author": {
    "id": 5,
    "slug": "jane-doe",
    "name": "Jane Doe"
  }
}
```

Rules:

- Used by listings, pickers, and `related_content`.
- Store only variants needed by cards, usually `sm` + `md`.
- Do not store `original`.
- Do not treat this as article source data.

## `cached_toc_json`

Source:

- `content_json.blocks[]` headings

Shape:

```json
[
  {
    "id": "ingredients",
    "text": "Ingredients",
    "level": 2
  }
]
```

Rules:

- Only headings level `2` through `6` should be included.
- H1 belongs to `headline`, not `content_json`.

## `cached_equipment_json`

Source:

- `recipe_json.equipment[*].equipment_id`
- `equipment`

Shape:

```json
[
  {
    "equipment_id": 1,
    "name": "Stand Mixer",
    "slug": "stand-mixer",
    "required": true,
    "affiliate_url": "https://example.com"
  }
]
```

Rules:

- The complete recipe equipment checklist remains in `recipe_json.equipment`.
- Equipment metadata remains in `equipment`.
- `cached_equipment_json` contains only rich card snapshots for matching active equipment table rows.
- It does not need to contain every item from `recipe_json.equipment`.
- Items present in `recipe_json.equipment` but absent from this cache should render as simple bullet/checklist items.
- Canonical mapped recipe equipment references should use `equipment_id`.
- Public recipe rendering reads this rich cache for affiliate links, product image, brand, price, and provider display.
- Refresh this cache when linked equipment metadata changes.
- Regenerate this cache in application/service code. Do not use a SQL trigger to rebuild the rich JSON payload.

## `cached_rating_json`

Source:

- `recipe_json.aggregate_rating`

Shape:

```json
{
  "rating_value": 4.8,
  "rating_count": 55
}
```

Rules:

- Stored cache JSON uses `snake_case`.

## `jsonld_json`

Source:

- article source fields
- `images_json`
- `recipe_json`
- `faqs_json`
- cached author/category snapshots

Shape:

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Article"
  }
]
```

Rules:

- Generated at save/cache refresh time.
- This is the final structured-data cache consumed by public article, recipe, and roundup pages.
- FAQPage data should come from `faqs_json`; the frontend should not rebuild FAQ JSON-LD from `content_json`.
- Public rendering can inject it directly after escaping/serialization rules.
- Do not hand-edit as source content.

Generation chain:

```txt
content_json faq_section
  -> faqs_json
  -> jsonld_json
  -> public SEO rendering
```
