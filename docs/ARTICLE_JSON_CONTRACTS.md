# Article JSON Contracts

> **Last Updated:** 2026-05-14

This document covers JSON fields stored on `articles`, except `content_json`.

For the complete `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.
For cached fields on `articles`, use `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.
For `articles.content_json`, use `docs/CONTENT_JSON_CONTRACT.md`.
For `articles.recipe_json`, use `docs/RECIPE_JSON_CONTRACT.md`.
For `articles.roundup_json`, use `docs/ROUNDUP_JSON_CONTRACT.md`.
For the complete `media` table contract, use `docs/MEDIA_TABLE_CONTRACT.md`.
For media/image variant rules, use `docs/IMAGE_JSON_CONTRACT.md`.
For naming rules, use `docs/NAMING_CONTRACT.md`.

## Scope

This document defines only article JSON fields that do not already have a
dedicated contract document:

- `images_json`
- `faqs_json`
- `seo_json`
- `config_json`

It does not redefine:

- `content_json`: canonical contract is `docs/CONTENT_JSON_CONTRACT.md`
- `recipe_json`: canonical contract is `docs/RECIPE_JSON_CONTRACT.md`
- `roundup_json`: canonical contract is `docs/ROUNDUP_JSON_CONTRACT.md`
- `cached_*` fields and `jsonld_json`: canonical contract is `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`

## Naming

Follow `docs/NAMING_CONTRACT.md`. This article JSON contract adds one local
image boundary: stored image JSON uses `r2_key`; resolved public/admin payloads
use `url`.

## `images_json`

Purpose: article-level image slots.

`articles.images_json` is not the media library. It stores editorial image slots for the article and includes render-ready snapshots copied from `media.variants_json` when the slot needs rendering data. The complete variant set remains in the `media` table.

Common slots:

- `hero`: primary article page/header image.
- `thumbnail`: optional card/list thumbnail override. Omit it when cards/lists use `hero`.
- `content_images`: body image snapshots keyed by `content_json` image block `image_ref`.
- `recipe_steps`: step images referenced by `recipe_json.instructions[].steps[].image_ref`.

Normal body image blocks in `content_json` store placement only. Their contextual snapshots live in `images_json.content_images`.

Non-contractual legacy names:

- `cover`
- `banner`
- `pinterest`

New writes must not use those names in `images_json`. Pinterest generation is not an article slot; it uses `media.variants_json.original` as source input and stores generated outputs on `pinterest_pins`.

Caption and credit are contextual metadata. Hero and thumbnail slots must not
store `caption` or `credit`. Content image and recipe step snapshots store
`caption` and the complete author credit snapshot because those images can
render visible captions and credits in the article body or recipe instructions.

Shape:

```json
{
  "hero": {
    "media_id": 105,
    "alt": "Lemon blueberry biscuits on cooling rack",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "16:9",
    "variants": {
      "sm": { "r2_key": "media/lemon-biscuits-sm.webp", "width": 720, "height": 405 },
      "md": { "r2_key": "media/lemon-biscuits-md.webp", "width": 1200, "height": 675 },
      "lg": { "r2_key": "media/lemon-biscuits-lg.webp", "width": 2048, "height": 1152 }
    }
  },
  "thumbnail": {
    "media_id": 105,
    "alt": "Lemon blueberry biscuits",
    "placeholder": "data:image/jpeg;base64,...",
    "focal_point": { "x": 50, "y": 50 },
    "aspect_ratio": "1:1",
    "variants": {
      "xs": { "r2_key": "media/lemon-biscuits-xs.webp", "width": 360, "height": 203 },
      "sm": { "r2_key": "media/lemon-biscuits-sm.webp", "width": 720, "height": 405 }
    }
  },
  "recipe_steps": {
    "boil-water": {
      "media_id": 55,
      "alt": "Water boiling in a large pot",
      "caption": "Bring the water to a rolling boil",
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
      "aspect_ratio": "3:2",
      "variants": {
        "sm": { "r2_key": "media/boil-water-sm.webp", "width": 720, "height": 480 },
        "md": { "r2_key": "media/boil-water-md.webp", "width": 1200, "height": 800 },
        "lg": { "r2_key": "media/boil-water-lg.webp", "width": 2048, "height": 1365 }
      }
    }
  },
  "content_images": {
    "body-image-1": {
      "media_id": 77,
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
      "aspect_ratio": "3:2",
      "variants": {
        "sm": { "r2_key": "media/pasta-sm.webp", "width": 720, "height": 480 },
        "md": { "r2_key": "media/pasta-md.webp", "width": 1200, "height": 800 },
        "lg": { "r2_key": "media/pasta-lg.webp", "width": 2048, "height": 1365 }
      }
    }
  }
}
```

Rules:

- Each slot value follows the stored image snapshot contract in `docs/IMAGE_JSON_CONTRACT.md`.
- `credit` follows the stored author credit snapshot contract in `docs/MEDIA_TABLE_CONTRACT.md` and `docs/IMAGE_JSON_CONTRACT.md`.
- Stored image slots should use `r2_key`, not absolute URLs.
- Public/API/rendered image props must convert `r2_key` to `url` and must not expose `r2_key`.
- `hero` and `thumbnail` must not store `caption` or `credit`.
- `content_images` and `recipe_steps` must store `caption` and `credit`.
- `width` and `height` are required for stored and rendered variants.
- `size_bytes` should be retained when available; do not write `sizeBytes`.
- `media_id` is the stable reference back to the media library.
- Stored image slots use `aspect_ratio`.
- Stored image slots must not use `aspectRatio`.
- Variant selection follows `docs/IMAGE_JSON_CONTRACT.md`: source media keeps the full set; article slots keep the variants needed by their render contexts and `srcset`.
- Hero slots should include `sm`, `md`, and `lg` when rendered responsively.
- Thumbnail/card slots need `xs` + `sm`.
- Recipe step image slots need `sm`, `md`, and `lg`.
- Content image slots usually need `sm`, `md`, and `lg`.
- Body image blocks in `content_json` must reference `images_json.content_images` by `image_ref`.
- `content_images` keys must match `content_json.blocks[].image_ref` for image blocks.
- `recipe_steps` keys must match `recipe_json.instructions[].steps[].image_ref`.
- When an instruction step omits `image_ref`, it has no image.
- `original` is required in `media.variants_json` for image media and should not be copied into normal article image snapshots.
- Pinterest generation uses `media.variants_json.original` as source input and stores the generated output on `pinterest_pins`.

## Delegated Source JSON

`recipe_json` and `roundup_json` are source fields, but their shapes and rules
are intentionally not repeated here:

- `recipe_json`: `docs/RECIPE_JSON_CONTRACT.md`
- `roundup_json`: `docs/ROUNDUP_JSON_CONTRACT.md`

This document references those fields only to explain how article-level JSON
fields relate to them.

## `faqs_json`

Purpose: source the complete visible FAQ section and `jsonld_json` generation.

Shape:

```json
{
  "heading": "Frequently Asked Questions",
  "intro": "These answers cover the most common questions about this recipe.",
  "items": [
    { "question": "Can I freeze it?", "answer": "Yes." }
  ]
}
```

Rule:

- `faqs_json` is source content, not a cache.
- `faqs_json.heading`, `faqs_json.intro`, and `faqs_json.items` render the
  complete visible FAQ section.
- `content_json` uses a `main_faq` marker when FAQ display is needed, but all
  visible FAQ section content stays here.
- Public FAQ display reads the complete `faqs_json` section at the `main_faq`
  marker position.
- `jsonld_json` is generated from `faqs_json` at save time.
- New FAQ item writes use `question` and `answer`.
- Do not store FAQ heading, intro, explanation, or item arrays inside
  `content_json.main_faq`.

## Delegated Derived Fields

The canonical cached-fields contract is `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.

This document intentionally does not define cache shapes. `cached_*` and
`jsonld_json` are derived fields, and keeping their shapes in one document
prevents drift.

## SEO/GEO and Config JSON

### SEO/GEO Responsibilities

`seo_json` is not the complete SEO/GEO visibility system. It stores HTML
metadata overrides only.

Search engines and LLM answer engines need a coordinated article output made
from multiple fields:

| Responsibility | Source fields | Output |
| --- | --- | --- |
| HTML metadata | `seo_json` plus article source fields | `<title>`, meta description, canonical, robots, Open Graph, Twitter metadata. |
| Structured semantic data | `jsonld_json` generated from article source fields, `recipe_json`, `roundup_json`, `faqs_json`, `images_json`, and relationship caches | Schema.org JSON-LD for `Article`/`BlogPosting`, `Recipe`, `FAQPage`, `BreadcrumbList`, `Person`, `Organization`, and `ItemList` when applicable. |
| Visible answerable content | `content_json`, `recipe_json`, `roundup_json`, `faqs_json`, author/category snapshots | SSR HTML text visible to crawlers and LLM retrieval systems. |
| Image understanding | `images_json` snapshots and resolved image URLs | Crawlable images with alt text, captions, dimensions, credits, and no `original` in public output. |
| Entity trust | `cached_author_json`, author pages, category pages, internal links, timestamps | Clear author, category, publication, update, and site ownership signals. |
| Discovery and crawl access | sitemap, RSS/feed routes, robots policy, canonical URLs | Pages discoverable and allowed for the intended search crawlers. |

Rules:

- `seo_json` must not contain Schema.org or JSON-LD payloads.
- `jsonld_json` is the generated semantic output for SEO/GEO and is documented
  in `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.
- Public article, recipe, and roundup pages must render meaningful SSR HTML,
  not only client-hydrated or hidden JSON data.
- Structured data must match visible page content.
- Images used in `jsonld_json`, Open Graph metadata, and public article HTML
  must be crawlable resolved URLs, not stored `r2_key` values.
- Crawl policy is outside `articles`, but the article contract depends on it:
  public pages must not be blocked from the search crawlers the product wants
  to appear in.

### `seo_json`

Purpose: optional metadata overrides for the public article/recipe/roundup page.

`seo_json` controls HTML metadata only. It does not replace source article
fields, card caches, or Schema.org JSON-LD. Final JSON-LD output belongs to
`jsonld_json` and is documented in `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.

Empty strings are not valid override values. Use `null` when the renderer should
derive the value from article source fields.

```json
{
  "meta_title": null,
  "meta_description": null,
  "no_index": false,
  "canonical": null,
  "og_image": "https://example.com/images/avocado-toast-og.webp",
  "og_title": null,
  "og_description": null,
  "twitter_card": "summary_large_image"
}
```

Field rules:

| Field | Required | Stored value | Fallback when `null` |
| --- | --- | --- | --- |
| `meta_title` | yes | `string` or `null` | `headline` plus site naming policy. |
| `meta_description` | yes | `string` or `null` | `short_description`, then `introduction`, then an excerpt from `content_json`. |
| `no_index` | yes | `boolean` | `false`. |
| `canonical` | yes | absolute URL string or `null` | public article URL derived from `type` and `slug`. |
| `og_image` | yes | absolute public image URL string | Derived before publish from `images_json.hero`, then `images_json.thumbnail`, then the site default OG image. |
| `og_title` | yes | `string` or `null` | `meta_title` resolved value. |
| `og_description` | yes | `string` or `null` | `meta_description` resolved value. |
| `twitter_card` | yes | `"summary"` or `"summary_large_image"` | `"summary_large_image"`. |

Rules:

- `seo_json` stores overrides and explicit metadata decisions only.
- Public rendering must resolve fallbacks before emitting `<title>`, meta
  description, canonical, Open Graph, or Twitter metadata.
- `no_index = true` emits noindex metadata for the page.
- `canonical`, when present, must be an absolute URL.
- `og_image` must be a non-empty public image URL before publish.
- `og_image` is derived from the largest suitable article image available:
  `images_json.hero.variants.lg`, then `images_json.hero.variants.md`, then
  `images_json.thumbnail.variants.sm`, then the site default OG image.
- When article image snapshots change, regenerate `seo_json.og_image`.
- `seo_json` must not store image snapshots, `media_id`, `r2_key`, `original`,
  or image URLs outside `og_image`.
- Social image rendering uses the stored `og_image` public URL.
- `seo_json` must not contain Schema.org keys such as `@context`, `@type`,
  `recipeIngredient`, or `FAQPage`. Those belong to generated `jsonld_json`.

### `config_json`

Purpose: per-article rendering and editorial behavior toggles.

`config_json` controls article-specific behavior only. It does not own global
site settings, visual design tokens, cache payloads, SEO metadata, or source
content.

Empty strings are not valid config values.

```json
{
  "allow_comments": true,
  "show_table_of_contents": true,
  "show_author_box": true,
  "show_related_content": true
}
```

Field rules:

| Field | Required | Stored value | Default behavior |
| --- | --- | --- | --- |
| `allow_comments` | yes | `boolean` | `true` means the article is eligible for comments if the global comments feature is enabled. |
| `show_table_of_contents` | yes | `boolean` | `true` allows the article page to render TOC when `cached_toc_json` has enough items and global TOC settings allow it. |
| `show_author_box` | yes | `boolean` | `true` allows the article page to render the author box when the layout supports it. |
| `show_related_content` | yes | `boolean` | `true` allows automatic/global related-content surfaces when the layout supports them. |

Rules:

- `config_json` stores per-article behavior only.
- Global behavior belongs to `site_settings`, not `config_json`.
- TOC visual behavior belongs to `site_settings.toc_settings`; this field only
  opts the current article in or out.
- Manual related content belongs in `content_json.related_content`, not in
  `config_json`.
- A/B testing and experiment assignment are outside the v1 article contract.
- `config_json` must not contain SEO fields, JSON-LD fields, image snapshots,
  author/category/tag snapshots, or arbitrary UI theme tokens.
