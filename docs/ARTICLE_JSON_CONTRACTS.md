# Article JSON Contracts

> **Last Updated:** 2026-04-29

This document covers JSON fields stored on `articles`, except `content_json`.

For the complete `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.
For cached fields on `articles`, use `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.
For `articles.content_json`, use `docs/CONTENT_JSON_CONTRACT.md`.
For the complete `media` table contract, use `docs/MEDIA_TABLE_CONTRACT.md`.
For media/image variant rules, use `docs/IMAGE_JSON_CONTRACT.md`.

## Naming

- SQL column names use `snake_case`: `recipe_json`, `cached_card_json`.
- JS/API property names use `camelCase`: `recipeJson`, `cachedCardJson`.
- Stored JSON payload keys use `snake_case` unless a contract explicitly documents a stable exception.

## `images_json`

Purpose: article-level image slots.

`articles.images_json` is not the media library. It stores editorial image slots for the article and may include render-ready snapshots copied from `media.variants_json`. The complete variant set remains in the `media` table.

Common slots:

- `hero`: primary article page/header image.
- `thumbnail`: card/list thumbnail, if different from hero.
- `recipe_steps`: step images referenced by `recipe_json.instructions[].steps[].image_ref`.

Normal body images are stored directly in `content_json` image blocks. Do not maintain a separate `images_json.content_images` registry unless a future migration explicitly introduces one.

Shape:

```json
{
  "hero": {
    "media_id": 105,
    "alt": "Lemon blueberry biscuits on cooling rack",
    "caption": "Fresh out of the oven",
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
      "sm": { "r2_key": "media/lemon-biscuits-sm.webp", "width": 720, "height": 405 },
      "md": { "r2_key": "media/lemon-biscuits-md.webp", "width": 1200, "height": 675 },
      "lg": { "r2_key": "media/lemon-biscuits-lg.webp", "width": 2048, "height": 1152 }
    }
  },
  "recipe_steps": {
    "boil-water": {
      "media_id": 55,
      "alt": "Water boiling in a large pot",
      "variants": {
        "sm": { "r2_key": "media/boil-water-sm.webp", "width": 720, "height": 480 },
        "md": { "r2_key": "media/boil-water-md.webp", "width": 1200, "height": 800 }
      }
    }
  }
}
```

Rules:

- Stored image slots should use `r2_key`, not absolute URLs.
- Public/API/rendered image props must convert `r2_key` to URLs and must not expose `r2_key`.
- `credit` should be an author credit snapshot copied from `media.credit`, not a bare display string.
- `credit.avatar.variants` should include `xs` and `sm` for lightweight inline avatar rendering and retina/small-card contexts.
- `width` and `height` are required for rendered variants.
- `media_id` is the stable reference back to the media library.
- Stored image slots use `aspect_ratio`.
- Variant selection follows `docs/IMAGE_JSON_CONTRACT.md`: source media keeps the full set; article slots keep the variants needed by their render contexts and `srcset`.
- Hero slots should include `sm`, `md`, and `lg` when rendered responsively.
- Thumbnail/card slots usually need `sm` + `md`.
- Recipe step image slots usually need `sm` + `md`.
- Body image blocks own their own image slots inside `content_json`.
- `recipe_steps` keys must match `recipe_json.instructions[].steps[].image_ref`; `step.id` may be used as fallback when `image_ref` is omitted.
- `original` is required in `media.variants_json` for image media and should not be copied into normal article image snapshots.
- Pinterest generation uses `media.variants_json.original` as source input and stores the generated output on `pinterest_pins`.

## `recipe_json`

Canonical contract: `docs/RECIPE_JSON_CONTRACT.md`.

Purpose: complete recipe source data for `articles.type = "recipe"`.

The article table remains the source for:

- `headline`
- `short_description`
- `images_json`
- `author_id`
- `category_id`
- `slug`
- tags

`recipe_json` owns the full recipe payload used by the full recipe card renderer and save-time JSON-LD generation.

Short default shape:

```json
{
  "prep": null,
  "cook": null,
  "total": null,
  "servings": null,
  "recipe_yield": null,
  "recipe_category": null,
  "recipe_cuisine": null,
  "keywords": [],
  "suitable_for_diet": [],
  "difficulty": null,
  "cooking_method": null,
  "estimated_cost": null,
  "ingredients": [],
  "instructions": [],
  "tips": [],
  "nutrition": null,
  "aggregate_rating": null,
  "equipment": [],
  "video": null
}
```

Rules:

- `content_json` may include a `main_recipe` marker, but recipe data stays here.
- Full recipe rendering reads `recipe_json`, not `cached_recipe_json`.
- `jsonld_json` is generated from `recipe_json` at save time.
- `cached_recipe_json` is a lightweight derived snapshot for lists, cards, filters, roundup items, and related content.
- Do not store Schema.org-only timing fields (`prepTime`, `cookTime`, `totalTime`) in the canonical stored contract. Generate them for JSON-LD from numeric minutes.
Compatibility gaps for old local drafts are tracked in `docs/IMPLEMENTATION_GAPS.md`.

## `roundup_json`

Purpose: compatibility listicle data for `articles.type = "roundup"`.

Status: compatibility field.

Default:

```json
{
  "items": [],
  "list_type": "ItemList"
}
```

Direction:

- New editorial list items should move toward `content_json.blocks[]` using `roundup_item`.
- Do not add new features to `roundup_json` unless explicitly keeping it as a source of truth.

## `faqs_json`

Purpose: intermediate FAQ extraction cache used to generate `jsonld_json`.

Source:

- `content_json.blocks[]` where `type = "faq_section"`.

Cache shape:

```json
[
  { "question": "Can I freeze it?", "answer": "Yes." }
]
```

Rule:

- The canonical source block uses `question` and `answer`.
- New cache writes use `question` and `answer`.
- This is not the final JSON-LD payload. Final Schema.org output is stored in `jsonld_json`.
- Regenerate `jsonld_json` whenever `faqs_json` changes.

## Article Cache Fields

The canonical cached-fields contract is `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.

This document intentionally does not define cache shapes. `cached_*`, `faqs_json`, and `jsonld_json` are derived fields, and keeping their shapes in one document prevents drift.

## SEO and Config JSON

### `seo_json`

SEO overrides. Fallbacks come from article source fields.

```json
{
  "meta_title": null,
  "meta_description": null,
  "no_index": false,
  "canonical": null,
  "og_image": null,
  "og_title": null,
  "og_description": null,
  "twitter_card": "summary_large_image"
}
```

### `jsonld_json`

Final generated Schema.org JSON-LD cache.

Sources:

- article source fields
- `recipe_json`
- `faqs_json`
- `images_json`
- cached author/category snapshots

Rule:

- Public pages should read `jsonld_json` for SEO output instead of rebuilding structured data from `content_json`.

### `config_json`

Per-article behavior toggles.

```json
{
  "allow_comments": true,
  "show_table_of_contents": true,
  "manual_related_ids": [],
  "experiment_key": null,
  "experiment_variant": null
}
```
