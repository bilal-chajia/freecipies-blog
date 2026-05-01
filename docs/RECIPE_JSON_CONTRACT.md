# Recipe JSON Contract

> **Last Updated:** 2026-04-29

This document is the canonical contract for `articles.recipe_json`.

`recipe_json` is the complete recipe payload. It is not a cache and it is not a card/listing snapshot.

## Ownership

`recipe_json` owns recipe-specific data only:

- preparation, cooking, and total time
- servings and yield
- recipe classification
- ingredients
- instructions
- recipe notes and tips
- nutrition
- aggregate rating
- equipment references or names
- recipe video metadata

The article table remains the source of truth for:

- `headline`
- `short_description`
- `slug`
- `images_json`
- `author_id`
- `category_id`
- tags through `articles_to_tags`
- publication/workflow fields

## Relationship With `content_json`

`content_json` may include a `main_recipe` block:

```json
{
  "id": "main-recipe",
  "type": "main_recipe"
}
```

This block is only a position marker. It tells the renderer where to display the full recipe card.

The marker must not duplicate ingredients, instructions, nutrition, equipment, rating, or video. The full recipe card renderer reads `articles.recipe_json`.

Editorial support sections for search, GEO, and AI answers belong in `content_json`, not as hidden top-level `recipe_json` fields.

Examples:

- storage notes
- make-ahead notes
- substitutions
- troubleshooting
- serving suggestions
- visible FAQs

These sections should be represented with normal visible blocks such as `heading`, `paragraph`, `list`, `tip_box`, and `faq_section`. This keeps the page consistent with Google structured-data rules: structured data and machine-readable summaries must match content that users can see.

## Relationship With `images_json`

`recipe_json` may reference article image slots, but it does not own image snapshots.

For recipe step images, store the image snapshot in `articles.images_json.recipe_steps` and reference it from the exact instruction step with `image_ref`.

```json
{
  "instructions": [
    {
      "section_title": "Cook the pasta",
      "steps": [
        {
          "id": "boil-water",
          "name": "Boil water",
          "text": "Bring a large pot of salted water to a boil.",
          "image_ref": "boil-water"
        }
      ]
    }
  ]
}
```

```json
{
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

Renderer rule:

- resolve `step.image_ref` against `images_json.recipe_steps`.
- if `image_ref` is missing, `step.id` may be used as fallback.
- generate public URLs at the render/API boundary.
- never expose `r2_key` in public props.
- use the resolved step image when generating `HowToStep.image` in `jsonld_json`.

## Relationship With `cached_recipe_json`

`recipe_json` and `cached_recipe_json` have different jobs.

| Field | Role | Consumer |
| --- | --- | --- |
| `recipe_json` | Complete recipe source data | full recipe card renderer, save-time JSON-LD generation |
| `cached_recipe_json` | Lightweight derived snapshot | recipe lists, roundup items, related cards, filters |

Rules:

- `recipe_json` is the source of truth.
- `cached_recipe_json` is regenerable from `recipe_json`.
- Full recipe rendering must not depend on `cached_recipe_json`.
- Listing/card/filter rendering should prefer `cached_recipe_json` to avoid parsing and moving the full recipe payload.
- `jsonld_json` is generated at save time from `recipe_json` plus article source fields and supporting snapshots.

## JSON-LD Dependencies

Recipe JSON-LD is generated at save time into `articles.jsonld_json`.

`recipe_json` provides recipe-specific fields, but a valid Google Recipe result also depends on article-level and image-level fields:

| JSON-LD field | Source |
| --- | --- |
| `Recipe.name` | `articles.headline` |
| `Recipe.description` | `articles.short_description` |
| `Recipe.image` | `articles.images_json` hero/thumbnail/SEO image slots |
| `Recipe.author` | `cached_author_json` |
| `datePublished` | `articles.published_at` |
| `dateModified` | `articles.updated_at` |
| `prepTime`, `cookTime`, `totalTime` | generated from `recipe_json.prep`, `cook`, `total` |
| `recipeIngredient` | generated from `recipe_json.ingredients` |
| `recipeInstructions` | generated from `recipe_json.instructions` |
| `nutrition` | generated from `recipe_json.nutrition` |
| `aggregateRating` | generated from `recipe_json.aggregate_rating` |
| `video` | generated from `recipe_json.video` |
| FAQ schema | generated from visible `content_json` FAQ blocks via `faqs_json` |

Google image guidance for Recipe rich results prefers multiple crawlable high-resolution images with `16:9`, `4:3`, and `1:1` aspect ratios. Those variants/slots belong to `images_json` and media contracts, not inside `recipe_json`.

## Canonical Shape

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

## Timing

Canonical stored fields:

```json
{
  "prep": 15,
  "cook": 25,
  "total": 40
}
```

Rules:

- Values are minutes.
- `total` may be null; if null, derive it as `prep + cook` when possible.
- Do not store Schema.org ISO duration fields such as `prepTime`, `cookTime`, or `totalTime` in the canonical contract.
- JSON-LD generation converts minutes to ISO-8601 at save time.
- `total` or derived total syncs to `articles.total_time_minutes`.

Optional future passive-time fields may be added only if the recipe card UI renders them:

```json
{
  "rest": 30,
  "chill": null
}
```

If added, `total` should remain the complete user-facing time and include active plus passive time.

## Servings and Yield

```json
{
  "servings": 4,
  "recipe_yield": "4 servings"
}
```

Rules:

- `servings` is numeric and used by the recipe card for ingredient scaling.
- `recipe_yield` is human-readable and used for display/Schema.org.
- If `recipe_yield` is null and `servings` is present, JSON-LD may emit `"4 servings"`.

## Classification

```json
{
  "recipe_category": "Dinner",
  "recipe_cuisine": "Italian",
  "keywords": ["quick pasta", "weeknight dinner", "one pot pasta"],
  "suitable_for_diet": ["VegetarianDiet"],
  "difficulty": "Easy",
  "cooking_method": "Stovetop",
  "estimated_cost": "Budget"
}
```

Rules:

- `difficulty` values: `Easy`, `Medium`, `Hard`.
- `estimated_cost` values: `Budget`, `Moderate`, `Premium`.
- `suitable_for_diet` stores Schema.org RestrictedDiet suffix values such as `VeganDiet` or `GlutenFreeDiet`.
- `keywords` stores specific search phrases and recipe angles, not duplicated category/cuisine values.
- Do not put `recipe_category` or `recipe_cuisine` values in `keywords`.
- Good `keywords`: `quick pasta`, `weeknight dinner`, `one pot pasta`.
- Bad `keywords`: `Italian`, `Dinner` when those values already live in `recipe_cuisine` and `recipe_category`.
- `difficulty` syncs to `articles.difficulty_label`.
- `estimated_cost = "Budget"` may derive `cached_recipe_json.is_budget = true`.

## Ingredients

```json
[
  {
    "group_title": "Sauce",
    "items": [
      {
        "id": "ingredient-tomato",
        "amount": 2,
        "unit": "cups",
        "name": "tomato sauce",
        "prep": null,
        "notes": "preferably homemade",
        "is_optional": false,
        "substitutes": [
          {
            "name": "crushed tomatoes",
            "ratio": "1:1",
            "notes": "simmer longer"
          }
        ]
      }
    ]
  }
]
```

Rules:

- Ingredients are grouped.
- `amount` is numeric for serving scaling.
- `unit` may be an empty string for count-based or freeform items.
- `name` is required.
- `id` is recommended for stable UI behavior.
- JSON-LD generation flattens grouped ingredients into `recipeIngredient`.
- Search indexing may extract ingredient names from this field.

## Instructions

```json
[
  {
    "section_title": "Cook the pasta",
    "steps": [
      {
        "id": "boil-water",
        "name": "Boil water",
        "text": "Bring a large pot of salted water to a boil.",
        "image_ref": "boil-water",
        "timer": 10,
        "tip": "Use more salt than you think."
      }
    ]
  }
]
```

Rules:

- Instructions are grouped into sections.
- Each step should include a stable unique `id`.
- `text` is required for each step.
- `timer` is stored in minutes.
- Step images are referenced with `image_ref` and resolved from `images_json.recipe_steps`.
- `image_ref` should normally match a key in `images_json.recipe_steps`; if absent, the renderer may try `step.id` as fallback.
- JSON-LD generation converts sections/steps into `HowToSection` and `HowToStep`.
- JSON-LD step URLs can be generated from the step `id`, for example `/recipes/easy-pasta#boil-water`.
- Do not include UI labels such as "Step 1" inside `text`; keep numbering and labels in the renderer.

## Tips

```json
[
  "Reserve pasta water before draining.",
  "Finish the sauce with the pasta in the pan."
]
```

Rules:

- Top-level `tips` are recipe-level notes.
- Step-specific tips belong in `instructions[].steps[].tip`.

## Nutrition

```json
{
  "serving_size": "1 bowl",
  "servings_per_recipe": 4,
  "calories": 320,
  "fat_content": 12,
  "saturated_fat_content": 3,
  "unsaturated_fat_content": 8,
  "trans_fat_content": 0,
  "carbohydrate_content": 42,
  "sugar_content": 6,
  "fiber_content": 5,
  "protein_content": 14,
  "sodium_content": 520,
  "cholesterol_content": 20
}
```

Rules:

- `nutrition` may be `null`.
- Numeric nutrient values are stored as numbers.
- JSON-LD generation adds units.
- If any nutrition value is present, `serving_size` should be present for Google rich result quality.
- `calories` may derive `cached_recipe_json.calories_per_serving`.

## Aggregate Rating

```json
{
  "rating_value": 4.8,
  "rating_count": 55
}
```

Rules:

- `aggregate_rating` may be `null`.
- Rating values are recipe source data.
- `cached_rating_json` may duplicate a lightweight snapshot for UI speed.
- JSON-LD includes aggregate rating only when `rating_value` is present.

## Equipment

`recipe_json.equipment` is the complete list of tools needed to prepare the recipe.

It is not limited to affiliate/product-card equipment. Simple tools such as bowls, spoons, parchment paper, or a knife may belong here even when they do not exist in the `equipment` table.

```json
[
  {
    "equipment_id": 12,
    "label": "Stand mixer",
    "required": true,
    "notes": "A hand mixer also works."
  },
  {
    "label": "Large mixing bowl",
    "required": true,
    "notes": null
  }
]
```

The `equipment` table is the source of truth for kitchen tools, affiliate links, brand, product image, category, price display, and provider metadata.

Rules:

- `recipe_json.equipment` stores the complete recipe equipment checklist.
- `equipment_id` is optional but should be used when the item maps to a row in the `equipment` table.
- `label` is required as the human-readable fallback for the checklist.
- `required` and `notes` stay in `recipe_json` because they are recipe-specific.
- `cached_equipment_json` contains only the rich card snapshots for matching active rows in the `equipment` table.
- The frontend equipment section renders rich cards from `cached_equipment_json`.
- `recipe_json.equipment` items missing from `cached_equipment_json` are still rendered as simple bullet/checklist items using `label`, `required`, and `notes`.
- Do not put `affiliate_url`, `affiliate_provider`, `affiliate_note`, `price_display`, `brand`, `description`, `category`, or product image fields directly in `recipe_json`.
- If an equipment item is updated in the `equipment` table, affected article `cached_equipment_json` values must be refreshed.
- If an equipment item is inactive or missing, it should not appear in `cached_equipment_json`, but the recipe can still render the plain checklist item from `recipe_json.equipment`.
- Regeneration is handled by application/service logic, not by SQL triggers that rebuild JSON.

## Video

```json
{
  "name": "How to make easy pasta",
  "description": "Step-by-step pasta tutorial.",
  "thumbnail": {
    "media_id": 77,
    "alt": "Easy pasta video thumbnail",
    "variants": {
      "sm": { "r2_key": "media/pasta-video-sm.webp", "width": 720, "height": 405 },
      "md": { "r2_key": "media/pasta-video-md.webp", "width": 1200, "height": 675 }
    }
  },
  "content_url": null,
  "embed_url": "https://www.youtube.com/embed/abc123",
  "duration": "PT2M30S",
  "upload_date": "2026-04-29T10:00:00-04:00"
}
```

Rules:

- `video` may be `null`.
- `name`, `thumbnail`, and `upload_date` are required for strong Google VideoObject eligibility when video is present.
- `duration` is ISO-8601 because video platforms and Schema.org already use that format.
- Prefer `content_url` for self-hosted videos when Googlebot can fetch the actual video file.
- Use `embed_url` for YouTube/Vimeo/player embeds.
- `thumbnail` follows the image snapshot rules: stored data keeps `r2_key`, public rendering converts to URLs.
- Recipe timing fields use numeric minutes; do not copy this ISO rule to `prep`, `cook`, or `total`.

## Editorial Quality Signals

Recipe reliability should be visible to readers, not hidden in machine-only fields.

If the editorial workflow needs proof that a recipe was tested, reviewed, or adjusted, prefer visible article blocks in `content_json` plus normal article metadata. Do not add invisible GEO-only fields to `recipe_json`.

Allowed future `recipe_json` fields only if they affect the actual recipe card UI:

```json
{
  "tested": true,
  "tested_by_author_id": 7,
  "tested_at": "2026-04-29"
}
```

Rules:

- These fields are optional and should not be required for publishing v1.
- If shown in JSON-LD or used as a trust signal, they must also be visible on the page.
- Do not store AI-only summaries in `recipe_json`.

## Publish Validation Recommendations

Before publishing `type = "recipe"`, validation should require or strongly warn on:

- `articles.headline` present for `Recipe.name`.
- `articles.short_description` present for `Recipe.description`.
- at least one crawlable recipe image from `images_json`.
- at least one ingredient group with one ingredient item.
- at least one instruction section with one step.
- every instruction step has stable `id` and non-empty `text`.
- if a step has `image_ref`, the referenced key exists in `images_json.recipe_steps`.
- if any nutrition value is present, `serving_size` is present.
- if `nutrition.calories` is present, `recipe_yield` or `servings` is present.
- if `aggregate_rating.rating_value` is present, `aggregate_rating.rating_count` is greater than zero and the rating is visible on the page.
- if `video` is present, it has `name`, `thumbnail`, `upload_date`, and either `content_url` or `embed_url`.

## Save-Time Derived Outputs

When a recipe article is saved, the app should derive:

- `articles.total_time_minutes` from `recipe_json.total` or `prep + cook`
- `articles.difficulty_label` from `recipe_json.difficulty`
- `articles.cached_recipe_json` as the lightweight recipe snapshot
- `articles.cached_equipment_json` from `recipe_json.equipment[*].equipment_id` plus active `equipment` table rows
- `articles.cached_rating_json` from `recipe_json.aggregate_rating`
- `articles.jsonld_json` from `recipe_json` plus article source fields and snapshots
- `HowToStep.image` and step URLs from `recipe_json.instructions` plus `images_json.recipe_steps`
