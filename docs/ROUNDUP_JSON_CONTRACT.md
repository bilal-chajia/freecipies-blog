# Roundup JSON Contract

> **Last Updated:** 2026-05-13

This document is the canonical contract for `articles.roundup_json`.

## Status

`roundup_json` is the complete structured roundup payload for
`articles.type = "roundup"`.

`content_json` uses a `main_roundup` block when the roundup list is placed in the body, but that block is only a
position marker. It tells the renderer where to display the roundup list.

## Ownership

`roundup_json` owns roundup-specific data:

- ordered recipe references
- resolved item display snapshots
- roundup-specific editorial notes
- list type metadata
- internal/external recipe source metadata

It must not own:

- complete article payloads
- complete recipe payloads
- complete author/category/tag payloads
- image variants outside the roundup render surface
- new display features
- SEO JSON-LD output

Those belong to the referenced article source fields, caches, `images_json`,
or `jsonld_json`.

## Relationship With `content_json`

`content_json` uses a `main_roundup` block:

```json
{
  "id": "main-roundup",
  "type": "main_roundup"
}
```

This block is only a position marker. It must not duplicate `items`,
`list_type`, item notes, image data, recipe metadata, or article card data.

Rules:

- `roundup_json` is the preferred source for roundup item data.
- `content_json.main_roundup` controls placement only.
- Public roundup list rendering reads `roundup_json.items` directly.
- `cached_toc_json` derives roundup item anchors from `roundup_json.items[]`
  when the article TOC is enabled.
- Public rendering must not perform one D1 read per referenced recipe item.
- Editorial prose around the list belongs in normal visible `content_json`
  blocks such as `heading`, `paragraph`, `image`, `tip_box`, and `main_faq`.

## Relationship With Caches

`roundup_json` stores the resolved rendering payload for the public roundup
page.

When a roundup is created or updated, selected recipe references are resolved
from the referenced recipe article caches:

| Resolved data | Write-time source |
| --- | --- |
| Recipe card display | `cached_card_json` |
| Hero image snapshot | `images_json.hero` |
| Recipe metadata and rating display | `cached_recipe_json` |
| Author label | `cached_author_json` |
| Category label | `cached_category_json` |
| Tag labels | `cached_tags_json` |

This resolution happens at write time, not at public render time.

Internal recipe items are resolved from the current D1 database and local
article caches.

External recipe items are resolved at write time from a compatible public
snapshot endpoint owned by another SaaS site in the same network. Public
rendering must not call the external site during request rendering.

The public `/roundups/[slug]` renderer reads the roundup article row and uses
`roundup_json.items` as the complete item-list rendering source.

Each internal item keeps the canonical recipe reference (`article_id`, `slug`)
plus the resolved display snapshot needed by the roundup page. The snapshot is
owned by the roundup because it represents how that recipe is displayed inside
that roundup.

Each external item keeps the canonical external recipe URL (`external_url`)
plus the resolved display snapshot returned by the external SaaS snapshot API.
The external snapshot must be autonomous enough for public rendering.

## Canonical Compatibility Shape

Stored JSON uses `snake_case`.

```json
{
  "items": [],
  "list_type": "ItemList"
}
```

### Presentation Settings

`roundup_json` owns the roundup list's own presentation, alongside its items:

| Field | Required | Source | Rule |
| --- | --- | --- | --- |
| `group_title` | no | Roundup editor | Optional editorial heading for the list. Omitted when blank. |
| `group_description` | no | Roundup editor | Optional editorial description under the heading. Omitted when blank. |
| `show_stats` | no | Roundup editor | Master toggle for whether badges render on each card. Defaults to `true`. |
| `visible_badges` | no | Roundup editor | Ordered list of badge keys to display on each card. Empty/absent falls back to `["total_time","difficulty","rating"]`. |

These are presentation of the roundup itself (not per-item display features), so they belong to `roundup_json`, not the `content_json.main_roundup` position marker.

Badge keys are defined in `src/modules/articles/utils/roundup-badges.ts` (the single source of truth shared by the admin picker and the public renderer). A badge is rendered only when `show_stats` is true, its key is in `visible_badges`, and the item snapshot carries data for it. Available keys: `total_time`, `prep_time`, `cook_time`, `servings`, `difficulty`, `rating`, `calories`, `protein`, `carbs`, `fat`, `category`, `cuisine`, `cooking_method`, `cost`, and the boolean diet/quality flags `is_vegetarian`, `is_vegan`, `is_gluten_free`, `is_dairy_free`, `is_healthy`, `is_high_protein`, `is_quick`, `is_budget`, `is_low_calorie`.

The `items[].recipe` snapshot carries the compact metadata these badges read: `total_time_minutes`, `prep_time_minutes`, `cook_time_minutes`, `difficulty`, `servings`, `calories_per_serving`, `protein_g`, `carbohydrate_g`, `fat_g`, `recipe_category`, `recipe_cuisine`, `cooking_method`, `estimated_cost`, and a `badges` object of boolean flags mirrored from `cached_recipe_json.badges`. All resolved at write time from the referenced recipe's caches.

Expanded item shape:

```json
{
  "items": [
    {
      "position": 1,
      "source_type": "internal_recipe",
      "article_id": 42,
      "slug": "avocado-toast",
      "title": "Avocado Toast",
      "subtitle": "A fast breakfast staple",
      "note": "Use ripe avocados and toasted sourdough.",
      "description": "Creamy avocado on toasted sourdough with simple toppings.",
      "image": {
        "media_id": 105,
        "alt": "Avocado toast on a plate",
        "caption": "Creamy avocado toast",
        "credit": {
          "type": "author",
          "id": 7,
          "name": "Jane Doe",
          "slug": "jane-doe",
          "avatar": {
            "media_id": 70,
            "alt": "Jane Doe",
            "variants": {
              "xs": {
                "r2_key": "media/jane-doe-avatar-xs.webp",
                "width": 50,
                "height": 50
              },
              "sm": {
                "r2_key": "media/jane-doe-avatar-sm.webp",
                "width": 100,
                "height": 100
              }
            }
          }
        },
        "placeholder": "data:image/jpeg;base64,...",
        "focal_point": { "x": 50, "y": 50 },
        "aspect_ratio": "4:3",
        "variants": {
          "xs": {
            "r2_key": "media/avocado-toast-xs.webp",
            "width": 360,
            "height": 270
          },
          "sm": {
            "r2_key": "media/avocado-toast-sm.webp",
            "width": 720,
            "height": 540
          },
          "md": {
            "r2_key": "media/avocado-toast-md.webp",
            "width": 1200,
            "height": 900
          }
        }
      },
      "recipe": {
        "total_time_minutes": 10,
        "difficulty": "easy",
        "servings": 2
      },
      "rating": {
        "rating_value": 4.8,
        "rating_count": 125
      },
      "author": {
        "id": 7,
        "name": "Jane Doe",
        "slug": "jane-doe"
      },
      "category": {
        "id": 3,
        "name": "Breakfast",
        "slug": "breakfast"
      },
      "tags": [
        {
          "id": 9,
          "name": "High Protein",
          "slug": "high-protein"
        }
      ]
    },
    {
      "position": 2,
      "source_type": "external_recipe",
      "external_url": "https://other-site.com/recipes/high-protein-pancakes",
      "title": "High Protein Pancakes",
      "subtitle": "A protein-rich breakfast from another owned SaaS site",
      "note": "Great option for meal prep.",
      "description": "Fluffy pancakes with Greek yogurt and extra protein.",
      "image": {
        "alt": "High protein pancakes on a plate",
        "caption": "Fluffy high protein pancakes",
        "placeholder": "data:image/jpeg;base64,...",
        "aspect_ratio": "4:3",
        "variants": {
          "xs": {
            "url": "https://other-site.com/cdn/pancakes-xs.webp",
            "width": 360,
            "height": 270
          },
          "sm": {
            "url": "https://other-site.com/cdn/pancakes-sm.webp",
            "width": 720,
            "height": 540
          },
          "md": {
            "url": "https://other-site.com/cdn/pancakes-md.webp",
            "width": 1200,
            "height": 900
          }
        }
      },
      "recipe": {
        "total_time_minutes": 25,
        "difficulty": "easy",
        "servings": 4
      },
      "rating": {
        "rating_value": 4.7,
        "rating_count": 88
      },
      "author": {
        "name": "Other Site",
        "url": "https://other-site.com"
      },
      "category": {
        "name": "Breakfast",
        "url": "https://other-site.com/categories/breakfast"
      },
      "tags": [
        {
          "name": "High Protein",
          "url": "https://other-site.com/tags/high-protein"
        }
      ]
    }
  ],
  "list_type": "ItemList"
}
```

## Field Rules

| Field | Required | Write-time source | Rule |
| --- | --- | --- | --- |
| `items` | yes | Roundup editor selection order | Ordered array of roundup items. |
| `list_type` | yes | System constant | Must be `ItemList` for v1 compatibility. |
| `items[].position` | yes | Roundup editor order | 1-based display and Schema.org order. |
| `items[].source_type` | yes | Roundup editor selection type | Must be `internal_recipe` or `external_recipe`. |
| `items[].article_id` | yes for `internal_recipe` | Internal recipe selection | Internal referenced recipe article id. |
| `items[].slug` | yes for `internal_recipe` | Referenced recipe row: `articles.slug` | Canonical recipe slug used for internal links and JSON-LD URLs. |
| `items[].external_url` | yes for `external_recipe` | External snapshot request URL or response | Absolute HTTPS URL of the external recipe page. |
| `items[].title` | yes | Referenced recipe row: `articles.cached_card_json`; external snapshot API | Resolved visible item title. |
| `items[].subtitle` | no | Referenced recipe row: `articles.cached_card_json`; roundup editor override; external snapshot API | Optional visible subtitle. |
| `items[].description` | no | Referenced recipe row: `articles.cached_card_json`; roundup editor override; external snapshot API | Resolved card description or roundup-specific description. |
| `items[].note` | no | Roundup editor | Editorial note visible in the roundup item. |
| `items[].image` | yes when the roundup card displays an image | Referenced recipe row: `articles.images_json.hero`; external snapshot API | Resolved hero image snapshot for the roundup card. |
| `items[].recipe` | yes for recipe items | Referenced recipe row: `articles.cached_recipe_json`; external snapshot API | Resolved compact recipe metadata needed by the roundup card. |
| `items[].rating` | no | Referenced recipe row: `articles.cached_recipe_json`; external snapshot API | Resolved rating display snapshot. |
| `items[].author` | no | Referenced recipe row: `articles.cached_author_json`; external snapshot API | Resolved compact author label for display. |
| `items[].category` | no | Referenced recipe row: `articles.cached_category_json`; external snapshot API | Resolved compact category label for display. |
| `items[].tags` | no | Referenced recipe row: `articles.cached_tags_json`; external snapshot API | Resolved compact tag labels for display. |

Rules:

- `Referenced recipe row` means the `articles` row selected by
  `items[].article_id`.
- Internal item resolution reads fields from the referenced recipe `articles`
  row at write time only.
- Each item must be either `internal_recipe` or `external_recipe`.
- `internal_recipe` items must reference an internal recipe article using
  `article_id` and `slug`.
- `external_recipe` items must reference an external recipe page using
  `external_url`.
- `external_url` must be an absolute HTTPS URL owned by a trusted SaaS site in
  the same network.
- Public renderers must use the resolved item snapshot stored in
  `roundup_json.items`.
- Public renderers must not load the referenced article cache per item during
  request rendering.
- Public renderers must not fetch external recipe snapshot APIs during request
  rendering.
- `title`, `subtitle`, `description`, and `note` are visible roundup item
  fields.
- Internal stored item images must follow the image snapshot rules:
  `r2_key`, `width`, `height`, `aspect_ratio`, no public `url`.
- External stored item images use absolute public `url` values in
  `variants.xs`, `variants.sm`, and `variants.md`.
- External author, category, and tag link fields use absolute public `url`
  values when links are displayed.
- The external image `url` exception applies only to
  `roundup_json.items[]` where `source_type = "external_recipe"`.
- The external image `url` exception does not apply to `media.variants_json`,
  `images_json`, or internal roundup items.
- Stored item images use compact card variants: `xs`, `sm`, `md`.
- Stored item image variants do not store `size_bytes`; byte size belongs to
  media storage metadata, not roundup rendering.
- Stored item images must not include `original`.
- New code must not write legacy `cover` keys.

## JSON-LD

`roundup_json` is not the final Schema.org payload.

Save-time structured data generation reads roundup items and produces an
`ItemList` inside `articles.jsonld_json`. Public pages must read `jsonld_json`
for SEO output instead of rebuilding JSON-LD at render time.

For v1 recipe roundup pages:

- `ItemList.itemListElement[]` order must match `roundup_json.items[].position`.
- Internal `ListItem` entries must point to the canonical internal recipe page
  URL derived from `roundup_json.items[].slug`.
- External `ListItem` entries must point to `roundup_json.items[].external_url`.
- The roundup page must not embed complete `Recipe` JSON-LD for every listed
  recipe.
- Complete `Recipe` JSON-LD belongs on each canonical recipe page.
