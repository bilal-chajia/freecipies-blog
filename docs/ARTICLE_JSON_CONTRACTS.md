# Article JSON Contracts

This document covers JSON fields stored on `articles`, except `content_json`.

For the complete `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.
For cached fields on `articles`, use `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`.
For `articles.content_json`, use `docs/CONTENT_JSON_CONTRACT.md`.
For the complete `media` table contract, use `docs/MEDIA_TABLE_CONTRACT.md`.
For media/image variant rules, use `docs/MEDIA_IMAGE_CONTRACT.md`.

## Naming

- SQL column names use `snake_case`: `recipe_json`, `cached_card_json`.
- JS/API property names use `camelCase`: `recipeJson`, `cachedCardJson`.
- JSON payloads may use existing project conventions per field; do not mix spellings inside one contract.

## `images_json`

Purpose: article-level image slots.

`articles.images_json` is not the media library. It stores editorial image slots for the article and may include render-ready snapshots copied from `media.variants_json`. The complete variant set remains in the `media` table.

Common slots:

- `cover`: hero/featured image.
- `thumbnail`: card/list thumbnail, if different from cover.
- `pinterest`: Pinterest-optimized image.
- `contentImages`: images referenced from body content.
- `recipe_steps`: step images referenced by `recipe_json.instructions[].steps[].image_ref`.

Shape:

```json
{
  "cover": {
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
          "xs": { "r2_key": "media/jane-avatar-xs.webp", "width": 50, "height": 50 }
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
- `credit.avatar` should include only `xs` for a simple lightweight avatar.
- `width` and `height` are required for rendered variants.
- `media_id` is the stable reference back to the media library.
- Stored image slots use `aspect_ratio`. Legacy `aspectRatio` may be normalized when read, but new writes should use `aspect_ratio`.
- Variant selection follows `docs/MEDIA_IMAGE_CONTRACT.md`: source media keeps the full set; article slots keep the variants needed by their render contexts and `srcset`.
- Cover/hero slots should include `sm`, `md`, and `lg` when rendered responsively.
- Thumbnail/card slots usually need `sm` + `md`.
- Recipe step image slots usually need `sm` + `md`.
- `recipe_steps` keys must match `recipe_json.instructions[].steps[].image_ref`; `step.id` may be used as fallback when `image_ref` is omitted.
- `original` is required in `media.variants_json` for image media, but should not be copied into normal article image snapshots unless the `pinterest` slot explicitly needs it.

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
- Do not store Schema.org-only timing fields (`prepTime`, `cookTime`, `totalTime`) in the target canonical contract. Generate them for JSON-LD from numeric minutes.
- Current code still has camelCase fields and legacy defaults; normalize those during refactor instead of treating them as the long-term contract.

## `roundup_json`

Purpose: legacy listicle data for `articles.type = "roundup"`.

Current status: compatibility field.

Default:

```json
{
  "items": [],
  "listType": "ItemList"
}
```

Direction:

- New editorial list items should move toward `content_json.blocks[]` using `roundup_item`.
- Existing code may still read `roundup_json` as fallback for old drafts, standalone roundup rendering, and item counts.
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
- Legacy cache values using `q` and `a` may be normalized when read, but new cache writes should use `question` and `answer`.
- This is not the final JSON-LD payload. Final Schema.org output is stored in `jsonld_json`.
- Regenerate `jsonld_json` whenever `faqs_json` changes.

## Article Cache Fields

The canonical cached-fields contract is `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md`. This section only keeps a short index for discoverability.

### `cached_tags_json`

Display/search cache of minimal tag snapshots.

Source of truth:

- `articles_to_tags`
- `tags`

Minimum shape:

```json
[
  { "id": 12, "label": "Quick", "slug": "quick" }
]
```

### `cached_category_json`

Category snapshot for cards and listings.

Minimum shape:

```json
{
  "id": 3,
  "slug": "desserts",
  "label": "Desserts",
  "color": "#ff6600ff"
}
```

### `cached_author_json`

Author snapshot for cards and bylines.

Minimum shape:

```json
{
  "id": 5,
  "slug": "jane-doe",
  "name": "Jane Doe",
  "job_title": "Recipe Developer",
  "avatar": "/api/images/media/avatar-lg.webp",
  "avatar_alt": "Jane Doe"
}
```

### `cached_recipe_json`

Lightweight recipe summary for listing filters, recipe cards in lists, roundup items, and related content.

This is not the full recipe. The complete recipe remains in `recipe_json`.

Owns:

- `is_recipe`
- `total_time_minutes`
- `difficulty`
- `servings`
- `calories_per_serving`
- `primary_diet_labels`
- `primary_occasion_labels`
- `main_ingredients`
- `is_quick`
- `is_healthy`
- `is_budget`

Source:

- `recipe_json`

Rules:

- Regenerable from `recipe_json`.
- Used for compact listing/filter UI.
- Must not become the source of truth for full recipe rendering.

### `cached_card_json`

Zero-join article card snapshot for related content, pickers, and listings.

This is a render cache, not a media source of truth. It should be regenerable from `articles` plus the linked `media` row.

Default mobile-first shape:

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
  }
}
```

Rules:

- Stored card snapshots should keep `r2_key`, not absolute URLs.
- Public/API/rendered card payloads must convert `r2_key` to URLs and must not expose `r2_key`.
- `related_content` blocks should copy a compact snapshot from this field.
- This field exists to reduce D1 reads in public rendering.
- It should not contain every variant from `media.variants_json`.
- Use `sm` + `md` by default for normal cards.
- Use `xs` + `sm` only for tiny UI.
- Add `lg` only for components that render wide cards or hero-like visuals.
- Do not store `original` in card snapshots.

### `cached_toc_json`

Generated from `content_json.blocks[]` headings.

Shape:

```json
[
  { "id": "ingredients", "text": "Ingredients", "level": 2 }
]
```

### `cached_equipment_json`

Snapshot of equipment used by a recipe.

Source:

- `recipe_json.equipment[*].equipment_id`
- `equipment` table

Rules:

- `recipe_json.equipment` is the complete checklist of tools needed for the recipe.
- Items that map to the `equipment` table should store `equipment_id`.
- Items that do not map to the table still remain in `recipe_json.equipment` and render as simple bullet/checklist items.
- Affiliate and product display fields live in the `equipment` table and derived `cached_equipment_json`, not in `recipe_json`.

### `cached_rating_json`

Optional rating snapshot.

Source:

- `recipe_json.aggregate_rating`

## SEO and Config JSON

### `seo_json`

SEO overrides. Fallbacks come from article source fields.

```json
{
  "metaTitle": null,
  "metaDescription": null,
  "noIndex": false,
  "canonical": null,
  "ogImage": null,
  "ogTitle": null,
  "ogDescription": null,
  "twitterCard": "summary_large_image"
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
  "allowComments": true,
  "showTableOfContents": true,
  "manualRelatedIds": [],
  "experimentKey": null,
  "experimentVariant": null
}
```
