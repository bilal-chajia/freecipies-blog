# Article Cached Fields Contract

> **Last Updated:** 2026-05-14

This document is the canonical contract for regenerable cached fields on the `articles` table.

For the full `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.
For source JSON fields, use `docs/ARTICLE_JSON_CONTRACTS.md` and `docs/CONTENT_JSON_CONTRACT.md`.
For naming rules, use `docs/NAMING_CONTRACT.md`.

## Core Rule

Cache and snapshot fields are derived output, not source of truth.

They exist to:

- avoid repeated D1 joins on public pages
- make cards, related content, and search cheaper to render
- store generated JSON-LD so public rendering injects it instead of rebuilding
  Schema.org during the request
- denormalize stable display data at article-save time

Every cache field must be regenerable from source tables or source JSON.

Stored cache JSON is an internal persistence shape. Public/admin rendered
payloads are resolved from it when needed, but must not be written back as
cache JSON without normalization.

If a source field and a cache disagree, the source field wins and the cache is
stale.

## Field Ownership

| Field | Regenerated from | Purpose |
| --- | --- | --- |
| `cached_tags_json` | selected `tags` rows at article save time | Tag display snapshot for article rendering. |
| `cached_category_json` | selected `categories` row at article save time | Category display snapshot for article rendering. |
| `cached_author_json` | selected `authors` row at article save time + `authors.images_json.avatar` | Author byline/card snapshot. |
| `cached_rating_json` | `recipe_json.aggregate_rating` | Rating display snapshot. |
| `cached_toc_json` | `content_json.blocks[]` `heading`, supported marker sections, `roundup_json.items[]` for roundup articles | Table of contents cache. |
| `cached_recipe_json` | `recipe_json` | Lightweight recipe snapshot for lists, cards, roundup items, related content, and filters. |
| `cached_card_json` | article source fields + image slot/media snapshot + relationship and recipe/rating caches | Zero-join card payload for listings, pickers, related content. |
| `jsonld_json` | article source fields + source JSON/caches including `recipe_json`, `roundup_json`, and `faqs_json` | Complete generated Schema.org JSON-LD graph for the page. |

Scalar mirrors:

| Field | Source | Purpose |
| --- | --- | --- |
| `reading_time_minutes` | visible reader text from article source fields, `content_json`, and visible marker payloads | Display and sorting helper. |

Recipe-only values such as total time and difficulty are intentionally not
top-level `articles` scalar columns. They stay in `recipe_json` as source data
and in `cached_recipe_json` for list/card rendering.

## `reading_time_minutes`

Source:

- visible article source text rendered on the page
- visible text blocks in `content_json`
- visible payload text rendered by supported marker blocks

Rules:

- `reading_time_minutes` is an integer scalar column, not JSON.
- Calculate it at article save/cache refresh time.
- Count text that is visible to the reader.
- Count visible article shell text when rendered on the page, such as
  `introduction`.
- Count visible `content_json` block text from `paragraph`, `heading`,
  `blockquote`, `list`, `tip_box`, and `table`.
- Count `image.caption` only when the rendered image displays a caption.
- Do not count image `alt`.
- For `main_recipe`, count visible recipe text rendered from `recipe_json` when
  the recipe card appears in the body.
- For `main_roundup`, count visible roundup item text rendered from
  `roundup_json.items[]` when the roundup list appears in the body.
- For `main_faq`, count visible FAQ text rendered from `faqs_json` when the FAQ
  section appears in the body.
- Do not count `seo_json`, `jsonld_json`, cache fields, `config_json`, `r2_key`,
  technical ids, slugs, hidden admin metadata, or private workflow fields.
- Minimum public display value is `1` when a rendered article has any visible
  reader text.
- Recalculate when any counted source field changes.
- Do not edit manually as editorial source.

## Regeneration Rules

- Regenerate caches on article save when source fields change.
- Regenerate relationship snapshots when related source rows change meaningfully.
- Never edit cache fields manually as editorial source.
- Public rendering reads caches directly only for the surfaces listed in the rendering matrix below.
- Admin editing treats caches as derived output.
- If a cache is missing or invalid, the app regenerates it from source instead of treating it as author-entered content.

## Public Rendering Matrix

Public rendering must choose the narrowest field that matches the surface. Caches are for cheap display surfaces, not for replacing full source payloads.

| Surface | Primary fields to read | Do not read from | Notes |
| --- | --- | --- | --- |
| Article detail shell | `headline`, `subtitle`, `short_description`, `introduction`, `images_json.hero`, `cached_author_json`, `cached_category_json`, `cached_tags_json` | `cached_card_json` for page truth | The page shell uses cached relationship snapshots for byline/category/tag display, but article identity and copy come from source columns. |
| Article body renderer | `content_json`, `images_json.content_images` | `cached_card_json`, `cached_recipe_json` | `content_json` is the body structure source. Image blocks store `image_ref`; body image snapshots are resolved from `images_json.content_images[image_ref]` at render time. |
| Full recipe card on `/recipes/{slug}` | `recipe_json`, plus `cached_rating_json`, `images_json.recipe_steps` when needed | `cached_recipe_json` for full recipe data | `recipe_json` owns timings, servings, ingredients, instructions, nutrition, tips, video, and the complete ordered equipment list including any saved equipment snapshots. |
| Recipe cards/lists/indexes | `cached_card_json`, `cached_recipe_json`, `cached_rating_json` | full `recipe_json`, top-level recipe-only scalar columns | Cards and archives use cache snapshots to avoid parsing the full recipe payload during normal rendering. |
| Article cards/listings/pickers | `cached_card_json` | `content_json` | `cached_card_json.image` derives from `images_json.thumbnail`; when `thumbnail` is absent, it derives from `images_json.hero`. No legacy `cover`. |
| Related content blocks | `cached_card_json` for referenced articles | referenced article `content_json` | Related blocks store references; displayed cards use regenerated card cache snapshots. |
| Roundup previews/items | `roundup_json` | `content_json` as item source, referenced article caches | `content_json.main_roundup` is only a placement marker. Roundup item data stays in `roundup_json`. Referenced article caches are used at roundup save time to build `roundup_json.items[]`, not during public request rendering. |
| Table of contents | `cached_toc_json` | ad hoc heading scans during normal render | Regenerate from content headings and supported marker data on save. Roundup articles also include item anchors from `roundup_json.items[]`. |
| FAQ display | `faqs_json` at the `content_json.main_faq` marker position | `content_json` as FAQ item source | `faqs_json` is source FAQ data, not a cache. |
| SEO JSON-LD | `jsonld_json` | rebuilding Schema.org from `content_json` during public render | `jsonld_json` is generated at save/cache refresh time from article source fields, `recipe_json`, `roundup_json`, `faqs_json`, `images_json`, relationship caches, and site organization settings. |
| Search indexing | article source columns, flattened `content_json`, `recipe_json`, `cached_tags_json`, `cached_author_json`, `cached_category_json` | public resolved payloads | Search flattens caches for labels/names, but must not index public image URLs as source state. |
| Admin edit forms | source columns, source JSON fields, relationship source tables | cached fields as editable source | Admin shows cache previews only as previews; save payloads must write source fields and regenerate caches. |
| Admin previews/pickers | `cached_card_json`, `cached_recipe_json`, relationship caches | full source payloads unless editing | Picker/list UIs use caches for speed. When opening an editor, load source fields. |

Cache Recovery Rules:

- Code paths that own cache regeneration regenerate missing or invalid caches
  from source fields before rendering.
- Code paths that do not own cache regeneration use the source field directly
  for that request and schedule/save a cache refresh.
- Never persist a resolved public/admin payload containing `url` back into stored cache JSON without converting it back to `r2_key`.
- Never let a cache override source content.

## Image Snapshot Rules

Image-bearing caches must follow `docs/IMAGE_JSON_CONTRACT.md`.

Rules:

- Stored cache JSON uses `r2_key`, not public `url`.
- Stored cache JSON uses `size_bytes`, not `sizeBytes`.
- Stored image slots use `aspect_ratio`, not `aspectRatio`.
- Public API/rendering converts `r2_key` to `url`.
- Public/admin resolved payloads must not expose `r2_key`.
- Do not store `original` in normal cache/card/related snapshots.
- Copy only variants needed by the render context.
- Image snapshots in caches keep `media_id`, `alt`, `placeholder`, and
  `variants`.
- Cache image snapshots store `caption` and `credit` only when their render
  context displays visible captions and credits.
- `credit` must remain an author credit snapshot object, not a free-form string.

## `cached_tags_json`

Source:

- selected `tags` rows at article save time

Shape:

```json
[
  {
    "id": 12,
    "label": "Quick",
    "slug": "quick",
    "color": "#10b981"
  },
  {
    "id": 18,
    "label": "Healthy",
    "slug": "healthy",
    "color": null
  }
]
```

Rules:

- `cached_tags_json` is a display snapshot for the article.
- Empty tag cache is `[]`.
- Each item must include:
  - `id`: referenced `tags.id`
  - `label`: copied from `tags.label`
  - `slug`: copied from `tags.slug`
  - `color`: copied from `tags.style_json.color` when present, otherwise `null`
- Public article rendering reads this cache for tag display.
- Do not store tag descriptions, SEO metadata, cached post counts, or private
  admin fields in this cache.
- Search indexing flattens `label`, not the full JSON object.
- Refresh this cache when selected article tags are saved or when a referenced
  tag `label`, `slug`, or `style_json.color` changes.

## `cached_category_json`

Source:

- selected `categories` row at article save time

Shape:

```json
{
  "id": 3,
  "slug": "desserts",
  "label": "Desserts",
  "color": "#ff6600ff"
}
```

Rules:

- `cached_category_json` is a display snapshot for the article.
- Empty category cache is `{}` only when the selected category cannot be
  resolved.
- `id` is copied from `categories.id`.
- `slug` is copied from `categories.slug`.
- `label` is copied from `categories.label`.
- `color` is copied from `categories.color`.
- Public article rendering reads this cache for category display.
- Do not store category description, SEO metadata, image snapshots, or private
  admin fields in this cache.
- Refresh this cache when the selected article category is saved or when the
  referenced category `slug`, `label`, or `color` changes.

## `cached_author_json`

Source:

- selected `authors` row at article save time
- selected author `authors.images_json.avatar`

Shape:

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

- `cached_author_json` is a public author display snapshot for the article
  byline and author box.
- Empty author cache is `{}` only when the selected author cannot be resolved.
- `id` is copied from `authors.id`.
- `slug` is copied from `authors.slug`.
- `name` is copied from `authors.name`.
- `job_title` is copied from `authors.job_title`.
- `bio` is copied from the public author bio field and is a string or `null`.
- `avatar` is required and is an object or `null`.
- `avatar` is copied from `authors.images_json.avatar`.
- `cached_author_json.avatar` does not store `credit`; the avatar is part of
  the author display snapshot.
- Avatar variants are stored with `r2_key`.
- Public props convert avatar variants to `url`.
- If the author has no avatar, store `avatar: null`; do not omit `avatar`.
- Do not invent a synthetic image object.
- `social_links` contains public social links displayed in the author box.
- `social_links[]` is copied from `authors.bio_json.socials[]` using
  `{ network, url, label }`.
- `social_links[]` must not use the older `platform` key.
- Use an empty array when no public social links are displayed.
- `cached_author_json` must not become a full author profile cache.
- `cached_author_json` must not store author email, auth role, admin status,
  login metadata, private profile fields, sort order, or moderation fields.
- Full author profile data remains in `authors`.
- Refresh this cache when the referenced author `name`, `slug`, `job_title`, or
  public bio, public social links, or `images_json.avatar` changes.

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
  "prep_time_minutes": 15,
  "cook_time_minutes": 20,
  "total_time_minutes": 35,
  "servings": 4,
  "recipe_yield": "4 servings",
  "difficulty": "Easy",
  "recipe_category": "Dinner",
  "recipe_cuisine": "Italian",
  "cooking_method": "Stovetop",
  "estimated_cost": "Budget",
  "calories_per_serving": 320,
  "protein_g": 14,
  "carbohydrate_g": 42,
  "fat_g": 12,
  "diet_labels": ["Vegetarian"],
  "keyword_labels": ["weeknight dinner", "one pot pasta"],
  "main_ingredients": ["Pasta", "Tomato"],
  "badges": {
    "is_quick": false,
    "is_budget": true,
    "is_healthy": true,
    "is_high_protein": false,
    "is_low_calorie": false,
    "is_vegetarian": true,
    "is_vegan": false,
    "is_gluten_free": false,
    "is_dairy_free": false
  }
}
```

Rules:

- Stored cache JSON uses `snake_case`.
- `cached_recipe_json` is a lightweight recipe metadata snapshot for cards,
  lists, roundups, related content, search facets, and filters.
- The full recipe card renderer must not depend on this cache.
- This cache must be fully regenerable from `recipe_json`.
- `cached_recipe_json` must not store full ingredients, instructions,
  nutrition objects, equipment lists, video data, tips, or aggregate rating.
- `is_recipe` is `true` only for `articles.type = "recipe"`.
- `prep_time_minutes` derives from `recipe_json.prep`.
- `cook_time_minutes` derives from `recipe_json.cook`.
- `total_time_minutes` derives from `recipe_json.total`; when null, derive from
  `recipe_json.prep + recipe_json.cook`.
- `servings` derives from `recipe_json.servings`.
- `recipe_yield` derives from `recipe_json.recipe_yield`.
- `difficulty` derives from `recipe_json.difficulty`.
- `recipe_category` derives from `recipe_json.recipe_category`.
- `recipe_cuisine` derives from `recipe_json.recipe_cuisine`.
- `cooking_method` derives from `recipe_json.cooking_method`.
- `estimated_cost` derives from `recipe_json.estimated_cost`.
- `calories_per_serving` derives from `recipe_json.nutrition.calories`.
- `protein_g` derives from `recipe_json.nutrition.protein_g`.
- `carbohydrate_g` derives from
  `recipe_json.nutrition.total_carbohydrate_g`.
- `fat_g` derives from `recipe_json.nutrition.total_fat_g`.
- `diet_labels` derives from `recipe_json.suitable_for_diet`, converted to
  display labels.
- `keyword_labels` derives from `recipe_json.keywords`.
- `main_ingredients` derives from visible ingredient names in
  `recipe_json.ingredients`.
- `badges` are derived product flags from recipe time, cost, nutrition, and
  diet data.
- `total_time_minutes` must not sync to a top-level `articles` column.
- `difficulty` must not sync to a top-level `articles` column.

## `cached_card_json`

Source:

- article source fields
- `images_json.thumbnail` or `images_json.hero`
- `cached_category_json`
- `cached_author_json`
- `cached_tags_json`
- `cached_recipe_json` when `type = "recipe"`
- `cached_rating_json` when a rating snapshot exists

Default shape:

```json
{
  "id": 42,
  "type": "recipe",
  "slug": "easy-pasta",
  "headline": "Easy Pasta",
  "short_description": "A quick weeknight pasta.",
  "image": {
    "media_id": 55,
    "alt": "Bowl of pasta",
    "placeholder": "data:image/jpeg;base64,...",
    "variants": {
      "xs": { "r2_key": "media/easy-pasta-xs.webp", "width": 360, "height": 240 },
      "sm": { "r2_key": "media/easy-pasta-sm.webp", "width": 720, "height": 480 }
    }
  },
  "category": {
    "id": 3,
    "slug": "dinner",
    "label": "Dinner",
    "color": "#ff6600ff"
  },
  "author": {
    "id": 5,
    "slug": "jane-doe",
    "name": "Jane Doe",
    "job_title": "Recipe Developer",
    "avatar": {
      "media_id": 22,
      "alt": "Jane Doe",
      "placeholder": "data:image/jpeg;base64,...",
      "variants": {
        "xs": { "r2_key": "media/jane-avatar-xs.webp", "width": 50, "height": 50 },
        "sm": { "r2_key": "media/jane-avatar-sm.webp", "width": 100, "height": 100 }
      }
    }
  },
  "tags": [
    {
      "id": 12,
      "label": "Quick",
      "slug": "quick",
      "color": "#10b981"
    }
  ],
  "recipe": {
    "total_time_minutes": 35,
    "difficulty": "Easy",
    "calories_per_serving": 320,
    "badges": {
      "is_quick": false,
      "is_budget": true
    }
  },
  "rating": {
    "rating_value": 4.8,
    "rating_count": 55
  }
}
```

Rules:

- Used by listings, pickers, `related_content`, and write-time roundup
  resolution.
- `cached_card_json` is a zero-join card payload, not article source data.
- `id`, `type`, `slug`, `headline`, and `short_description` derive from article
  source fields.
- `image` derives from `images_json.thumbnail`; when `thumbnail` is absent, it
  derives from `images_json.hero`.
- `image` must not store `caption` or `credit`.
- `category` derives from `cached_category_json`.
- `author` derives from `cached_author_json`.
- `author.avatar` is required and is either the compact `xs` + `sm` avatar
  snapshot copied from `cached_author_json.avatar`, or `null` when the author
  has no avatar.
- `tags` derives from `cached_tags_json`.
- `recipe` derives from `cached_recipe_json` when `type = "recipe"`.
- `rating` derives from `cached_rating_json` when a rating snapshot exists.
- Store card image variants `xs` and `sm`.
- Do not store `original`.
- Do not use legacy `cover` in this contract.

## `cached_toc_json`

Source:

- `content_json.blocks[]` headings
- supported marker sections in `content_json.blocks[]`
- `roundup_json.items[]` when `articles.type = "roundup"`

Shape:

```json
[
  {
    "id": "ingredients",
    "text": "Ingredients",
    "level": 2,
    "number": "1",
    "parent_id": null,
    "source_type": "heading"
  },
  {
    "id": "roundup-item-1",
    "text": "Avocado Toast",
    "level": 3,
    "number": "2.1",
    "parent_id": "main-roundup",
    "source_type": "roundup_item",
    "position": 1
  }
]
```

Rules:

- Only headings level `2` through `6` are included from `content_json`.
- H1 belongs to `headline`, not `content_json`.
- `number` is generated at save/cache refresh time.
- `parent_id` points to the closest parent TOC entry, or `null` for top-level entries.
- Marker blocks such as `main_recipe`, `main_roundup`, and `main_faq` are included when they render a visible section heading.
- For `articles.type = "roundup"`, the TOC must include entries for `roundup_json.items[]` so the reader can navigate directly to each listed item.
- Roundup item TOC entries use anchors generated from `roundup_json.items[].position` and item title.
- Roundup item TOC entries must not copy the full roundup item snapshot.
- Roundup item TOC entries store only navigation fields: `id`, `text`, `level`, `number`, `parent_id`, `source_type`, and `position`.
- The public renderer must not read referenced recipe rows to build roundup item TOC entries.
- `config_json.show_table_of_contents = false` disables TOC rendering even when this cache is present.
- TOC display settings such as collapsed state, minimum item count, and mobile behavior belong to `site_settings.toc_settings`, not this cache.

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
- `cached_rating_json` is an optional display snapshot.
- Empty rating cache is `{}`.
- When present, `rating_value` is a number.
- When present, `rating_count` is an integer greater than zero.
- `rating_value` and `rating_count` come only from
  `recipe_json.aggregate_rating`.
- `cached_rating_json` must not calculate ratings independently.
- `cached_rating_json` must not store review text, reviewer identity, vote
  history, or moderation state.
- Public rating display reads this cache for list/card/summary surfaces.
- JSON-LD generation includes `aggregateRating` only when both `rating_value`
  and `rating_count` are present.
- Regenerate this cache when `recipe_json.aggregate_rating` changes.
- Full recipe source data remains `recipe_json.aggregate_rating`.

## `jsonld_json`

Source:

- article source fields
- `images_json`
- `recipe_json`
- `faqs_json`
- `roundup_json`
- `cached_author_json`
- `cached_category_json`
- `cached_tags_json`
- site organization settings

Shape:

```json
[
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": "https://example.com/recipes/easy-pasta#article"
  },
  {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "@id": "https://example.com/recipes/easy-pasta#recipe"
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": "https://example.com/recipes/easy-pasta#faq"
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": "https://example.com/recipes/easy-pasta#breadcrumb"
  }
]
```

Rules:

- Generated at save/cache refresh time.
- `jsonld_json` contains every Schema.org JSON-LD node emitted by the page.
- Store a JSON array, even when the page emits only one node.
- The public renderer injects `jsonld_json` as the complete JSON-LD payload for
  the page.
- Public rendering must not rebuild or append extra Schema.org nodes during the
  request.
- `Article`/`BlogPosting` nodes are generated for normal article content.
- Recipe pages generate a `Recipe` node from `recipe_json` plus article source
  fields, `images_json`, cached relationship snapshots, and site organization
  settings.
- Recipe JSON-LD includes `url` and `mainEntityOfPage` derived from the
  canonical public recipe URL.
- Recipe JSON-LD includes `publisher` and `isPartOf` from site organization
  settings.
- Recipe JSON-LD maps `recipe_json.suitable_for_diet` to Schema.org diet URLs.
- Recipe JSON-LD generates `recipeYield` from `recipe_json.recipe_yield`; when
  null, it derives `recipeYield` from `recipe_json.servings`.
- Recipe JSON-LD generates `recipeInstructions` from `recipe_json.instructions`
  and attaches step images from `images_json.recipe_steps` when `image_ref`
  exists.
- Roundup pages generate an `ItemList` node from `roundup_json.items[]`.
- Roundup pages must not embed complete `Recipe` nodes for every listed item.
  Complete `Recipe` JSON-LD belongs on each canonical recipe page.
- FAQ pages or article pages with visible FAQs generate an `FAQPage` node from
  `faqs_json`.
- `BreadcrumbList` is generated when breadcrumb data is available from routing,
  category, or article source fields.
- Site-level `Organization`/`WebSite` nodes are included when this page is the
  configured owner of those nodes; otherwise page nodes reference them by
  stable `@id`.
- FAQPage data comes from source `faqs_json`; the frontend must not rebuild FAQ JSON-LD from `content_json`.
- Public rendering can inject it directly after escaping/serialization rules.
- Do not hand-edit as source content.
- Schema.org keys such as `@context`, `@type`, `datePublished`, and `image` follow the external JSON-LD vocabulary and are an explicit exception to the app stored-JSON `snake_case` rule.

Generation chain:

```txt
article source fields
  + images_json
  + recipe_json when type = recipe
  + roundup_json when type = roundup
  + faqs_json when visible FAQs exist
  + relationship caches
  + site organization settings
  -> jsonld_json
  -> public SEO rendering
```
