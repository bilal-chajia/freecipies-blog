# Recipe JSON Contract

> **Last Updated:** 2026-05-13

This document is the canonical contract for `articles.recipe_json`.

`recipe_json` is the complete recipe payload. It is not a cache and it is not a card/listing snapshot.

For naming rules, use `docs/NAMING_CONTRACT.md`. Serialized `recipe_json`
must not mix contract names with older implementation names.

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

## Boundary With Article Fields

`recipe_json` must not duplicate article-level fields.

These fields are owned by the `articles` row and related article tables:

- `headline`
- `short_description`
- `slug`
- `images_json`
- `author_id`
- `category_id`
- tags through `articles_to_tags`
- publication/workflow fields

Recipe rendering combines article-level fields with `recipe_json` at SSR time.
`recipe_json` owns only recipe-specific data such as timings, servings,
ingredients, instructions, nutrition, equipment, recipe notes, and
recipe-specific classification.

## Relationship With `content_json`

`content_json` uses a `main_recipe` block when the recipe card is placed in the body:

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

These sections are represented with normal visible blocks such as `heading`,
`paragraph`, `list`, and `tip_box`.

FAQ section content belongs to `articles.faqs_json`. `content_json` stores only
the `main_faq` placement marker. `recipe_json` must not store FAQ headings,
FAQ introductions, FAQ explanations, or FAQ item data.

## Relationship With `images_json`

`recipe_json` references article image slots when recipe instructions need images, but it does not own image snapshots.

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

- If `step.image_ref` exists, resolve it against `images_json.recipe_steps`.
- If `step.image_ref` is absent, the step has no image.
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
- Listing/card/filter rendering uses `cached_recipe_json` to avoid parsing and moving the full recipe payload.
- Recipe-specific values such as total time and difficulty do not sync to
  top-level `articles` columns. They stay in `recipe_json` and the derived
  `cached_recipe_json` snapshot.
- `jsonld_json` is generated at save time from `recipe_json` plus article source fields and supporting snapshots.

## JSON-LD Dependencies

Recipe JSON-LD is generated at save time into `articles.jsonld_json`.

`recipe_json` provides recipe-specific fields, but a valid Google Recipe result
also depends on article-level, image-level, relationship, and site settings
fields.

| JSON-LD field | Source |
| --- | --- |
| `@context` | system constant: `https://schema.org` |
| `@type` | system constant: `Recipe` |
| `mainEntityOfPage` | canonical recipe page URL derived from `articles.slug` |
| `url` | canonical recipe page URL derived from `articles.slug` |
| `Recipe.name` | `articles.headline` |
| `Recipe.description` | `articles.short_description` |
| `Recipe.image` | `articles.images_json` recipe SEO image set |
| `Recipe.author` | `articles.cached_author_json` |
| `datePublished` | `articles.published_at` |
| `dateModified` | `articles.updated_at` |
| `recipeCategory` | `recipe_json.recipe_category`; when null, use `articles.cached_category_json` |
| `recipeCuisine` | `recipe_json.recipe_cuisine` |
| `keywords` | `recipe_json.keywords` plus `articles.cached_tags_json` |
| `suitableForDiet` | `recipe_json.suitable_for_diet` mapped to Schema.org diet URLs |
| `prepTime`, `cookTime`, `totalTime` | `recipe_json.prep`, `recipe_json.cook`, `recipe_json.total` converted to ISO-8601 durations |
| `recipeYield` | `recipe_json.recipe_yield`; when null, derive from `recipe_json.servings` |
| `recipeIngredient` | `recipe_json.ingredients` |
| `recipeInstructions` | `recipe_json.instructions` plus `articles.images_json.recipe_steps` for step images |
| `nutrition` | `recipe_json.nutrition` |
| `aggregateRating` | `recipe_json.aggregate_rating` |
| `video` | `recipe_json.video` |
| `publisher` | site organization settings |
| `isPartOf` | site organization settings |
| `FAQPage` | generated separately from `articles.faqs_json` |

Rules:

- `Recipe.image` uses crawlable public image URLs generated from
  `articles.images_json`, with `16:9`, `4:3`, and `1:1` outputs when those
  slots are available.
- `recipe_json` must not store canonical URLs, publisher data, article dates,
  author snapshots, category snapshots, tag snapshots, or image snapshots.
- `FAQPage` is not nested inside `Recipe`; it is generated as a separate
  Schema.org node from `articles.faqs_json`.
- `jsonld_json` is the stored generated output. Public rendering reads
  `articles.jsonld_json` instead of rebuilding Recipe JSON-LD during the
  request.

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

Rules:

- This shape intentionally excludes article identity, URLs, images,
  author/category/tag snapshots, publisher data, FAQ content, and editorial
  support sections.
- Article identity and workflow fields belong to the `articles` row.
- Images belong to `articles.images_json`.
- Author, category, and tag display snapshots belong to article cached fields.
- FAQ section content belongs to `articles.faqs_json`.
- Editorial support sections belong to `articles.content_json`.

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
- `total` is nullable; if null, derive it as `prep + cook` when possible.
- Do not store Schema.org ISO duration fields such as `prepTime`, `cookTime`, or `totalTime` in the canonical contract.
- JSON-LD generation converts minutes to ISO-8601 at save time.
- `total` or derived total syncs to `cached_recipe_json.total_time_minutes`.

Future passive-time fields are allowed only if the recipe card UI renders them:

```json
{
  "rest": 30,
  "chill": null
}
```

If added, `total` remains the complete user-facing time and includes active plus passive time.

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
- If `recipe_yield` is null and `servings` is present, JSON-LD emits `"4 servings"`.

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
- `difficulty` syncs to `cached_recipe_json.difficulty`.
- `estimated_cost = "Budget"` derives `cached_recipe_json.is_budget = true`.

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
- `group_title` is a visible group label or `null` when the recipe has no
  visible ingredient group label.
- `items` must contain at least one ingredient item for published recipes.
- `id` is required and stable inside the recipe.
- `amount` is numeric for serving scaling.
- `unit` is an empty string for count-based or freeform items.
- `name` is required.
- `prep` is `null` or a short preparation phrase such as `diced` or
  `room temperature`.
- `notes` is `null` or short visible ingredient guidance.
- `is_optional` is required and boolean.
- `substitutes` is an array; use an empty array when there are no substitutes.
- JSON-LD generation flattens grouped ingredients into `recipeIngredient`.
- Search indexing extracts ingredient names from this field.

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
- `section_title` is a visible section label or `null` when the recipe has no
  visible instruction section label.
- `steps` must contain at least one step for published recipes.
- Each step must include a stable unique `id`.
- `text` is required for each step.
- `timer` is `null` or a positive number of minutes.
- `tip` is `null` or a short note tied to that exact step.
- Step images are referenced with `image_ref` and resolved from `images_json.recipe_steps`.
- If `image_ref` exists, it must match a key in `images_json.recipe_steps`.
- If `image_ref` is absent, the step renders without an image.
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

- Top-level `tips` are short recipe-level notes rendered in the recipe card.
- Step-specific tips belong in `instructions[].steps[].tip`.
- Use `instructions[].steps[].tip` when the note helps the user complete one
  exact step.
- Use top-level `tips` when the note applies to the whole recipe.
- Long editorial tips, SEO/GEO guidance, troubleshooting sections, and rich
  explanatory content belong in `content_json`, not `recipe_json.tips`.

## Nutrition

`recipe_json.nutrition` stores final validated nutrition values only.

Nutrition calculation details, ingredient-to-food matches, USDA/FoodData
Central IDs, formulas, and confidence scores do not live in `recipe_json`.
Those belong to a future nutrition calculation service/module.

```json
{
  "basis": "per_serving",
  "serving_size": {
    "label": "1 bowl",
    "grams": 320
  },
  "servings_per_recipe": 4,
  "calories": 320,
  "total_fat_g": 12,
  "saturated_fat_g": 3,
  "trans_fat_g": 0,
  "cholesterol_mg": 20,
  "sodium_mg": 520,
  "total_carbohydrate_g": 42,
  "dietary_fiber_g": 5,
  "total_sugars_g": 6,
  "added_sugars_g": 0,
  "protein_g": 14,
  "vitamin_d_mcg": 0,
  "calcium_mg": 120,
  "iron_mg": 2.1,
  "potassium_mg": 510,
  "status": "validated"
}
```

Rules:

- `nutrition` is `null` or a final per-serving Nutrition Facts payload.
- `basis` must be `per_serving`.
- `status` must be `validated` for published recipes when `nutrition` is not
  null.
- `servings_per_recipe` must match `recipe_json.servings`.
- `serving_size.label`, `serving_size.grams`, `servings_per_recipe`,
  `calories`, `total_fat_g`, `total_carbohydrate_g`, `protein_g`, and
  `sodium_mg` are required when `nutrition` is not null.
- Numeric nutrient values are stored as numbers in the units declared by their
  field names.
- Gram fields use `_g`.
- Milligram fields use `_mg`.
- Microgram fields use `_mcg`.
- Values are final validated estimates per serving. Without laboratory testing,
  recipe nutrition is calculated nutrition, not a laboratory analysis.
- Calculation must happen before save/publish using normalized ingredient
  weights and a trusted food composition source such as USDA FoodData Central.
- Admin or editorial review validates the final values before publish.
- `recipe_json.nutrition` must not store calculation inputs, USDA IDs, matched
  food rows, confidence scores, or per-ingredient nutrient breakdowns.
- JSON-LD generation maps this payload to Schema.org `NutritionInformation`.
- `calories` derives `cached_recipe_json.calories_per_serving`.

Schema.org mapping:

| Stored field | Schema.org field |
| --- | --- |
| `serving_size.label` | `servingSize` |
| `calories` | `calories` |
| `total_fat_g` | `fatContent` |
| `saturated_fat_g` | `saturatedFatContent` |
| `trans_fat_g` | `transFatContent` |
| `cholesterol_mg` | `cholesterolContent` |
| `sodium_mg` | `sodiumContent` |
| `total_carbohydrate_g` | `carbohydrateContent` |
| `dietary_fiber_g` | `fiberContent` |
| `total_sugars_g` | `sugarContent` |
| `protein_g` | `proteinContent` |

Additional Nutrition Facts fields such as `added_sugars_g`, `vitamin_d_mcg`,
`calcium_mg`, `iron_mg`, and `potassium_mg` are rendered in the Nutrition Facts
UI but are not part of the core Schema.org `NutritionInformation` mapping.

Current implementation drift:

- Existing code stores older camelCase nutrition keys such as `servingSize`,
  `fatContent`, `carbohydrateContent`, `proteinContent`, and `sodiumContent`.
- Existing admin inputs are manual and do not calculate values from USDA/FoodData
  Central.
- Existing JSON-LD formatting maps the older keys to Schema.org. Code must be
  migrated to this contract later.

## Aggregate Rating

```json
{
  "rating_value": 4.8,
  "rating_count": 55
}
```

Rules:

- `aggregate_rating` is nullable.
- Rating values are recipe source data.
- `cached_rating_json` stores a lightweight duplicate snapshot for UI speed.
- JSON-LD includes aggregate rating only when `rating_value` is present.

## Equipment

`recipe_json.equipment` is the complete list of tools needed to prepare the recipe.

It is not limited to affiliate/product-card equipment. Simple tools such as bowls, spoons, parchment paper, or a knife belong here even when they do not exist in the `equipment` table.

Mapped catalog tools copy their render snapshot into `recipe_json.equipment[]`
at article save time. The public recipe renderer must not join the `equipment`
table to render the equipment section.

```json
[
  {
    "id": "eq-stand-mixer",
    "equipment_id": 12,
    "label": "Stand mixer",
    "required": true,
    "notes": "A hand mixer also works.",
    "source_type": "catalog",
    "snapshot": {
      "slug": "stand-mixer",
      "name": "Stand Mixer",
      "brand": "KitchenAid",
      "description": "Useful for whipping and kneading.",
      "category": "appliances",
      "image": {
        "media_id": 77,
        "alt": "Stand mixer on a kitchen counter",
        "placeholder": "data:image/jpeg;base64,...",
        "variants": {
          "xs": { "r2_key": "media/stand-mixer-xs.webp", "width": 360, "height": 240 },
          "sm": { "r2_key": "media/stand-mixer-sm.webp", "width": 720, "height": 480 }
        }
      },
      "affiliate_url": "https://example.com",
      "affiliate_provider": "amazon",
      "affiliate_note": null
    }
  },
  {
    "id": "eq-large-bowl",
    "equipment_id": null,
    "label": "Large mixing bowl",
    "required": true,
    "notes": null,
    "source_type": "manual",
    "snapshot": null
  }
]
```

The `equipment` table is the source of truth for kitchen tools, affiliate links, brand, product image, category, and provider metadata.

Rules:

- `recipe_json.equipment` stores the complete recipe equipment checklist.
- Item order is the rendering order.
- `id` is required and stable inside the recipe editor.
- `equipment_id` is required and is either an active `equipment.id` or `null`.
- Use `equipment_id` when the item maps to a row in the `equipment` table.
- Use `equipment_id: null` for plain checklist tools that do not map to the
  `equipment` table.
- `label` is required as the human-readable checklist text.
- `required` is required and boolean.
- `notes` is required and is either a short recipe-specific note or `null`.
- `source_type` is required and is either `catalog` or `manual`.
- `snapshot` is required and is either a copied catalog snapshot object or `null`.
- `required` and `notes` stay in `recipe_json` because they are
  recipe-specific.
- `source_type = "catalog"` requires `equipment_id` and `snapshot`.
- `source_type = "manual"` requires `equipment_id: null` and `snapshot: null`.
- Catalog snapshots are copied from the selected active `equipment` row at
  article save time.
- Catalog snapshots include `slug`, `name`, `brand`, `description`,
  `category`, `image`, `affiliate_url`, `affiliate_provider`,
  and `affiliate_note`.
- Snapshot images store internal `r2_key` values and public props resolve them
  to `url`.
- If an equipment row changes later, affected article `recipe_json.equipment[]`
  snapshots must be refreshed by application/service logic.
- If a catalog equipment item becomes inactive or deleted after save, the saved
  recipe item still renders from its stored snapshot until the article is
  refreshed.
- `cached_equipment_json` is not part of the v1 article contract.
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

- `video` is `null` or a recipe-specific `VideoObject` source.
- `name`, `description`, `thumbnail`, and `upload_date` are required when
  `video` is not null.
- At least one of `content_url` or `embed_url` is required when `video` is not
  null.
- `content_url` stores a crawlable self-hosted video file URL.
- `embed_url` stores a YouTube, Vimeo, or player embed URL.
- `duration` is `null` or ISO-8601 because video platforms and Schema.org
  already use that format.
- `thumbnail` follows the image snapshot rules: stored data keeps `r2_key`,
  public rendering converts to URLs.
- `recipe_json.video` stores one primary recipe video, not a gallery.
- Long transcripts, chapters, and editorial video commentary belong in
  visible `content_json` blocks unless the product intentionally renders them
  inside the recipe card.
- Recipe timing fields use numeric minutes; do not copy this ISO rule to `prep`, `cook`, or `total`.

## Editorial Quality Signals

Recipe reliability is visible to readers, not hidden in machine-only fields.

If the editorial workflow needs proof that a recipe was tested, reviewed, or
adjusted, use visible article blocks in `content_json` plus normal article
metadata. Do not add invisible GEO-only fields to `recipe_json`.

Allowed future `recipe_json` fields only if they affect the actual recipe card UI:

```json
{
  "tested": true,
  "tested_by_author_id": 7,
  "tested_at": "2026-04-29"
}
```

Rules:

- These fields are future optional fields and are not required for publishing
  v1.
- If shown in JSON-LD or used as a trust signal, they must also be visible on the page.
- Do not store AI-only summaries in `recipe_json`.

## Publish Validation

Before publishing `type = "recipe"`, validation enforces:

- `articles.headline` present for `Recipe.name`.
- `articles.short_description` present for `Recipe.description`.
- at least one crawlable recipe image from `images_json`.
- at least one ingredient group with one ingredient item.
- at least one instruction section with one step.
- every instruction step has stable `id` and non-empty `text`.
- if a step has `image_ref`, the referenced key exists in `images_json.recipe_steps`.
- if `nutrition` is present, all required `nutrition` fields are present and
  `nutrition.status = "validated"`.
- if `nutrition.calories` is present, `recipe_yield` or `servings` is present.
- if `aggregate_rating.rating_value` is present, `aggregate_rating.rating_count` is greater than zero and the rating is visible on the page.
- if `video` is present, it has `name`, `description`, `thumbnail`,
  `upload_date`, and either `content_url` or `embed_url`.

## Save-Time Derived Outputs

When a recipe article is saved, the app derives:

- `cached_recipe_json.total_time_minutes` from `recipe_json.total` or `prep + cook`
- `cached_recipe_json.difficulty` from `recipe_json.difficulty`
- `articles.cached_recipe_json` as the lightweight recipe snapshot
- `articles.cached_rating_json` from `recipe_json.aggregate_rating`
- `articles.jsonld_json` from `recipe_json` plus article source fields and snapshots
- `HowToStep.image` and step URLs from `recipe_json.instructions` plus `images_json.recipe_steps`
