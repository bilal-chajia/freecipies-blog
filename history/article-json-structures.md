# Article JSON Structures (Article, Recipe, Roundup)

Sources of truth:
- `db/schema.sql`
- `db/DATABASE_SCHEMA.md`
- `src/modules/articles/types/content-blocks.types.ts`
- `src/modules/articles/types/recipes.types.ts`
- `src/modules/articles/types/roundups.types.ts`

Notes:
- JSON fields are stored as TEXT in the database and must be valid JSON.
- Use `{}` or `[]` for empty values, never `null`.
- JSON keys are camelCase.

## Common JSON Fields (all article types)

### images_json
Used for cover, thumbnail, pinterest, and contentImages.
- `contentImages` stores images referenced in `content_json`.
- Shape follows `ImageSlot` and `ImageVariants` from `@shared/types/images`.
- Variants must include `xs`, `sm`, `md`, `lg` (original optional).

Example (partial):
```json
{
  "cover": {
    "media_id": 123,
    "alt": "Cover image",
    "caption": "Optional caption",
    "variants": {
      "xs": { "url": "...", "width": 360, "height": 203, "sizeBytes": 12345 },
      "sm": { "url": "...", "width": 720, "height": 405, "sizeBytes": 23456 },
      "md": { "url": "...", "width": 1200, "height": 675, "sizeBytes": 34567 },
      "lg": { "url": "...", "width": 2048, "height": 1152, "sizeBytes": 45678 }
    }
  }
}
```

### content_json
Block-based article body. Each block has `type` plus type-specific fields.
Text fields support Markdown.
Future work: implement a frontend renderer for `content_json` so blocks (including `video`) are displayed on article/recipe/roundup pages.

### faqs_json
SEO cache derived from `content_json` `faq_section` blocks.

Example:
```json
[
  { "q": "Question?", "a": "Answer." }
]
```

### seo_json
SEO overrides for the article (meta title, meta description, etc.).

### config_json
Per-article config (comments, TOC visibility, manual related IDs, experiments).

## Type: article (no recipe)

Required JSON:
- `content_json`: body blocks.
- `images_json`: optional but typical.
- `seo_json`: optional.

Not used:
- `recipe_json` (should be `{}` or the default in db).
- `roundup_json` (should be `{}` or the default in db).

Minimal example:
```json
{
  "content_json": [
    { "type": "paragraph", "text": "Intro paragraph..." },
    { "type": "heading", "level": 2, "text": "Section title" }
  ],
  "images_json": {},
  "faqs_json": []
}
```

## Type: recipe (article + recipe_json)

Required JSON:
- `content_json`
- `recipe_json`

### recipe_json (key fields)
```json
{
  "prep": 15,
  "cook": 25,
  "total": 40,
  "servings": 4,
  "recipeYield": "Serves 4",

  "recipeCategory": "Dessert",
  "recipeCuisine": "American",
  "keywords": ["chocolate", "cookies"],
  "suitableForDiet": ["VeganDiet", "GlutenFreeDiet"],

  "difficulty": "Easy",
  "cookingMethod": "Baking",
  "estimatedCost": "$",

  "prepTime": "PT15M",
  "cookTime": "PT25M",
  "totalTime": "PT40M",

  "ingredients": [
    {
      "group_title": "Dry Ingredients",
      "items": [
        {
          "id": "flour",
          "name": "all-purpose flour",
          "amount": 315,
          "unit": "grams",
          "notes": "sifted",
          "isOptional": false,
          "substitutes": [
            { "name": "whole wheat flour", "ratio": "1:1", "notes": "denser result" }
          ]
        }
      ]
    }
  ],

  "instructions": [
    {
      "section_title": "Preparation",
      "steps": [
        { "name": "Preheat", "text": "Preheat oven...", "timer": null, "image": null }
      ]
    }
  ],

  "tips": ["Let cookies cool for 5 minutes"],

  "nutrition": {
    "calories": 320,
    "fatContent": "15g",
    "carbohydrateContent": "40g",
    "proteinContent": "4g",
    "sugarContent": "12g",
    "sodiumContent": "220mg",
    "servingSize": "1 cookie (80g)"
  },

  "aggregateRating": { "ratingValue": 4.8, "ratingCount": 55 },
  "equipment": [{ "equipment_id": 1, "required": true }],
  "video": {
    "url": "https://www.youtube.com/watch?v=...",
    "name": "How to make it",
    "description": "Step-by-step tutorial",
    "thumbnailUrl": "https://cdn.example.com/video-thumb.jpg",
    "duration": "PT2M30S"
  }
}
```

## Type: roundup (listicle)

Required JSON:
- `content_json`
- `roundup_json`

### roundup_json
```json
{
  "listType": "ItemList",
  "items": [
    {
      "position": 1,
      "article_id": 123,
      "external_url": null,
      "title": "Best Lemon Biscuits",
      "subtitle": "Crisp edges, fluffy center",
      "note": "Great for brunch.",
      "cover": { "alt": "Lemon biscuits", "variants": { "xs": {}, "sm": {}, "md": {}, "lg": {} } }
    },
    {
      "position": 2,
      "article_id": null,
      "external_url": "https://example.com/recipe",
      "title": "External Recipe",
      "subtitle": "From another site",
      "note": "Affiliate link",
      "cover": { "alt": "External recipe", "variants": { "xs": {}, "sm": {}, "md": {}, "lg": {} } }
    }
  ]
}
```

## content_json Block Catalog

Text:
- `paragraph`: `{ type, text }` (one block per paragraph; `text` supports Markdown, including links. Common examples: `**bold**`, `_italic_`, `` `code` ``, `[link](https://...)`. Lists like `- item` or `1.` should stay in a single block if you keep them here.)
- `heading`: `{ type, level: 2|3|4|5|6, text, id? }`
- `blockquote`: `{ type, text, cite? }`
- `list`: `{ type, style: 'ordered'|'unordered'|'checklist', items }`

Media:
- `image`: `{ type, media_id, alt, caption?, credit?, variants? }`
- `video`: `{ type, provider: 'youtube'|'vimeo'|'self', videoId, aspectRatio }`

Callouts:
- `tip_box`: `{ type, variant: 'tip'|'warning'|'info'|'note', title?, text }`

Tip box usage (food/recipes):
```json
{
  "type": "tip_box",
  "variant": "tip",
  "title": "Tip",
  "text": "Rest the dough for 10 minutes before baking."
}
```
```json
{
  "type": "tip_box",
  "variant": "warning",
  "title": "Safety",
  "text": "Use a thermometer: chicken should reach 165F internally."
}
```
```json
{
  "type": "tip_box",
  "variant": "info",
  "title": "Substitution",
  "text": "Swap yogurt for buttermilk (1:1)."
}
```
```json
{
  "type": "tip_box",
  "variant": "note",
  "title": "Note",
  "text": "Keeps well in the fridge for 3 days."
}
```

Multiple points inside one tip box (Markdown list in `text`):
```json
{
  "type": "tip_box",
  "variant": "tip",
  "title": "Tip",
  "text": "- Use room-temp eggs\n- Whisk until foamy\n- Rest batter 10 min"
}
```

Embeds:
- `embed`: `{ type, provider: 'instagram'|'pinterest'|'tiktok'|'twitter', url, html? }`

Example (Instagram):
```json
{
  "type": "embed",
  "provider": "instagram",
  "url": "https://www.instagram.com/p/ABC123/",
  "html": "<blockquote class=\"instagram-media\">...</blockquote>"
}
```

Example (TikTok):
```json
{
  "type": "embed",
  "provider": "tiktok",
  "url": "https://www.tiktok.com/@chef/video/1234567890"
}
```
- `recipe_card`: `{ type, article_id, headline, cover? }`
- `product_card`: `{ type, name, url, price?, image?, affiliate? }`

Layout:
- `divider`: `{ type }`
- `spacer`: `{ type, size: 'sm'|'md'|'lg'|'xl' }`
- `ad_slot`: `{ type, variant: 'in-content'|'newsletter'|'sidebar' }`
- `table`: `{ type, headers, rows }`

Spacer sizes (suggested usage):
```json
{ "type": "spacer", "size": "sm" }
```
- `sm`: small breathing room between paragraphs
- `md`: standard separation between sections
- `lg`: before a major section (e.g., Instructions)
- `xl`: big break before an important block (e.g., FAQ or conclusion)

Food blog:
- `before_after`: `{ type, layout: 'slider'|'side_by_side', before, after }`
- `ingredient_spotlight`: `{ type, name, description, image?, tips?, substitutes?, link? }`
- `faq_section`: `{ type, title?, items: [{ q, a }] }`
- `related_content`: `{ type, title?, layout: 'grid'|'carousel'|'list', recipes?, articles?, roundups? }`

Example (related_content):
```json
{
  "type": "related_content",
  "title": "You may also like",
  "layout": "grid",
  "recipes": [
    {
      "id": 123,
      "slug": "easy-pasta",
      "headline": "Easy Pasta",
      "thumbnail": { "variants": { "xs": {}, "sm": {}, "md": {}, "lg": {} } },
      "total_time": 25,
      "difficulty": "easy"
    }
  ],
  "articles": [],
  "roundups": []
}
```

Example (article item):
```json
{
  "type": "related_content",
  "title": "Related articles",
  "layout": "list",
  "articles": [
    {
      "id": 301,
      "slug": "how-to-season-cast-iron",
      "headline": "How to Season a Cast-Iron Skillet",
      "reading_time": 6,
      "thumbnail": { "variants": { "xs": {}, "sm": {}, "md": {}, "lg": {} } }
    }
  ]
}
```

Example (recipe item):
```json
{
  "type": "related_content",
  "title": "Related recipes",
  "layout": "grid",
  "recipes": [
    {
      "id": 512,
      "slug": "lemon-olive-oil-cake",
      "headline": "Lemon Olive Oil Cake",
      "total_time": 45,
      "difficulty": "medium",
      "thumbnail": { "variants": { "xs": {}, "sm": {}, "md": {}, "lg": {} } }
    }
  ]
}
```

RelatedArticleCard structure (per item):
All three arrays (`recipes`, `articles`, `roundups`) use the same item shape.
Required fields: `id`, `slug`, `headline`.
Optional fields depend on the content type:
- Recipes: `total_time`, `difficulty`
- Articles: `reading_time`
- Roundups: `item_count`
`thumbnail` is optional for any type.

```json
{
  "id": 123,
  "slug": "easy-pasta",
  "headline": "Easy Pasta",
  "thumbnail": { "variants": { "xs": {}, "sm": {}, "md": {}, "lg": {} } },
  "total_time": 25,
  "difficulty": "easy",
  "reading_time": 6,
  "item_count": 10
}
```
