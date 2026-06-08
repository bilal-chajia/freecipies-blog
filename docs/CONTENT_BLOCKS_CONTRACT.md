# Content Blocks Contract

> **Last Updated:** 2026-05-13

This document is the canonical contract for block types stored inside
`articles.content_json.blocks`.

For the container document contract, use `docs/CONTENT_JSON_CONTRACT.md`.
For naming rules, use `docs/NAMING_CONTRACT.md`.
For image snapshot shapes, use `docs/IMAGE_JSON_CONTRACT.md`.
For article image-slot ownership, use `docs/ARTICLE_JSON_CONTRACTS.md`.

## Scope

`content_json.blocks[]` stores the ordered editorial body structure for an
article, recipe, or roundup page.

It stores:

- visible prose and section structure
- lightweight placement markers
- references to article-owned source JSON
- references to image snapshots stored outside `content_json`

It does not store:

- BlockEditor framework payloads
- image snapshots
- recipe payload data
- roundup item payload data
- FAQ item payload data
- SEO metadata
- JSON-LD
- generated caches
- global settings

## Framework Boundary

The current admin editor uses BlockNote/AppBlock internally. That is an admin
implementation detail, not a persistence format.

| Layer | Format | Contract rule |
| --- | --- | --- |
| Admin editor | BlockNote/AppBlock plus custom TSX blocks | Never persisted directly. |
| Adapter layer | editor block adapters | Converts editor payloads to the stored contract and back. |
| Database/API | `ContentDocument.blocks[]` | Stores only canonical block names and fields from this document. |
| Site renderer | normalized `ContentDocument.blocks[]` | Renders canonical blocks only. |

Changing the editor framework must not change `content_json`.

Editor-only names and props are not contract names. Adapters must convert them
before save:

| Editor/internal example | Stored contract |
| --- | --- |
| `customImage` | `image` with `image_ref` only |
| `mainRecipe` | `main_recipe` |
| `roundupList` / editor roundup placeholder | `main_roundup` |
| `faqSection` | `main_faq` |
| `alert` | `tip_box` |
| `relatedContent` | `related_content` |
| `beforeAfter` | `before_after` |
| `simpleTable` | `table` |

Editor-only props such as `url`, `mediaId`, `variantsJson`, `creditJson`,
`width`, `height`, or display-only toolbar state must not be stored in
`content_json`.

Compatibility behavior for old drafts or editor names is documented in
`docs/IMPLEMENTATION_GAPS.md`, not in this contract.

## Stored Block Invariants

Every stored block must follow these rules:

- `id` is required.
- `id` is unique inside one `content_json.blocks[]` array.
- `type` is required.
- `type` is one official v1 stored block type from this document.
- Blocks are stored as a flat ordered array.
- Nested editor tree structures are not part of the stored v1 contract.
- Unknown block types are rejected by strict save validation.
- Reserved block types are rejected by strict save validation.
- Unknown fields are rejected unless the block contract lists them.
- Stored JSON uses `snake_case`.

## Official v1 Blocks

| Stored `type` | Purpose | Required fields | Optional fields | Source ownership |
| --- | --- | --- | --- | --- |
| `paragraph` | Body text | `id`, `text` | none | `content_json` |
| `heading` | Section heading and TOC source | `id`, `level`, `text` | none | `content_json` |
| `blockquote` | Editorial quote | `id`, `text` | `cite` | `content_json` |
| `list` | Ordered, unordered, or checklist list | `id`, `style`, `items` | none | `content_json` |
| `image` | Body image placement marker | `id`, `image_ref` | none | snapshot in `images_json.content_images` |
| `video` | Video embed reference | `id`, `provider`, `video_id`, `aspect_ratio` | none | `content_json` |
| `tip_box` | Tip, warning, info, or note box | `id`, `variant`, `text` | `title` | `content_json` |
| `divider` | Visual divider | `id` | none | `content_json` |
| `table` | Simple editorial table | `id`, `headers`, `rows` | none | `content_json` |
| `before_after` | Two-image comparison placement | `id`, `layout`, `before_image_ref`, `after_image_ref` | `before_label`, `after_label` | snapshots in `images_json.content_images` |
| `related_content` | Curated related-content block | `id`, `layout`, `items` | `title`, `limit` | Stores stable references plus copied `cached_card_json` snapshots. |
| `main_recipe` | Recipe card placement marker | `id` | none | `recipe_json` |
| `main_roundup` | Roundup list placement marker | `id` | none | `roundup_json` |
| `main_faq` | FAQ placement marker | `id` | none | `faqs_json` |

## Text Blocks

### `paragraph`

```json
{
  "id": "intro-copy",
  "type": "paragraph",
  "text": "Intro with **inline emphasis**."
}
```

Rules:

- `text` stores visible editorial text.
- Inline markdown-like syntax is allowed only when sanitized by render utilities.
- Raw unsafe HTML is not part of this contract.

### `heading`

```json
{
  "id": "why-this-works",
  "type": "heading",
  "level": 2,
  "text": "Why this recipe works"
}
```

Rules:

- `level` must be `2`, `3`, `4`, `5`, or `6`.
- H1 belongs to `articles.headline`, not `content_json`.
- TOC generation reads heading blocks from `content_json.blocks[]`.

### `blockquote`

```json
{
  "id": "quote-1",
  "type": "blockquote",
  "text": "Good dough feels soft, not sticky.",
  "cite": "Chef note"
}
```

Rules:

- `cite` is optional display text.
- Use `tip_box`, not `blockquote`, for tips, warnings, and procedural notes.

### `list`

```json
{
  "id": "storage-list",
  "type": "list",
  "style": "checklist",
  "items": ["Cool **completely**", "Store airtight", "Reheat gently"]
}
```

Rules:

- `style` must be `ordered`, `unordered`, or `checklist`.
- `items` is an ordered array of visible strings.
- Each item can use the same sanitized inline markdown-like syntax as
  `paragraph.text`.
- Raw unsafe HTML is not part of this contract.
- Per-item rich objects, nested lists, and checked state are outside v1.

## Image Placement Blocks

### `image`

Normal article body images use a placement marker in `content_json.blocks[]`.
The image snapshot lives in `articles.images_json.content_images[image_ref]`.

```json
{
  "id": "body-image-block-1",
  "type": "image",
  "image_ref": "body-image-1"
}
```

Rules:

- `image_ref` must match a key in `articles.images_json.content_images`.
- The same `media_id` used twice in the body must use two different
  `image_ref` values when the context, caption, credit, crop, or variants differ.
- The block must not contain `media_id`, `alt`, `caption`, `credit`,
  `placeholder`, `variants`, `url`, or `r2_key`.
- Rendering resolves `image_ref` to `images_json.content_images[image_ref]`,
  then converts stored `r2_key` values to URLs.

### `before_after`

`before_after` is a comparison placement block. It also references snapshots in
`articles.images_json.content_images`.

```json
{
  "id": "before-after-1",
  "type": "before_after",
  "layout": "slider",
  "before_image_ref": "dough-before",
  "after_image_ref": "dough-after",
  "before_label": "Before",
  "after_label": "After"
}
```

Rules:

- `layout` must be `slider` or `side_by_side`.
- `before_image_ref` and `after_image_ref` must each match a key in
  `articles.images_json.content_images`.
- Labels are optional display text.
- The block must not store image snapshots directly.

## Media Embed Blocks

### `video`

```json
{
  "id": "video-1",
  "type": "video",
  "provider": "youtube",
  "video_id": "abc123",
  "aspect_ratio": "16:9"
}
```

Rules:

- `provider` must be `youtube`, `vimeo`, or `self`.
- `aspect_ratio` must be `16:9`, `4:3`, `1:1`, or `9:16`.
- Raw iframe HTML, scripts, and provider embed blobs are not stored.

## Editorial Utility Blocks

### `tip_box`

```json
{
  "id": "tip-1",
  "type": "tip_box",
  "variant": "tip",
  "title": "Make ahead",
  "text": "The sauce keeps well for **three days**."
}
```

Rules:

- `variant` must be `tip`, `warning`, `info`, or `note`.
- `title` is mandatory.
- `text` stores visible editorial copy and can use the same sanitized inline markdown-like syntax as
  `paragraph.text`.
- Raw unsafe HTML is not part of this contract.

### `divider`

```json
{
  "id": "divider-1",
  "type": "divider"
}
```

Rules:

- No additional payload is stored.

### `table`

```json
{
  "id": "table-1",
  "type": "table",
  "headers": ["Ingredient", "Amount"],
  "rows": [
    ["**Flour**", "2 cups"],
    ["Water", "_1 cup_"]
  ]
}
```

Rules:

- `headers` is an ordered string array.
- `rows` is an ordered array of string arrays.
- Each row must match the header count.
- Header and cell strings can use the same sanitized inline markdown-like
  syntax as `paragraph.text`.
- Markdown-table source text is not part of this contract.
- Raw unsafe HTML is not part of this contract.
- Complex spreadsheet formulas, merged cells, and nested blocks are outside v1.

## Source Placement Markers

Marker blocks contain position only. They must not duplicate source data.

### `main_recipe`

```json
{
  "id": "main-recipe",
  "type": "main_recipe"
}
```

Rules:

- Recipe data stays in `articles.recipe_json`.
- A recipe article contains at most one `main_recipe` marker.
- The marker controls where the full recipe card renders.

### `main_roundup`

```json
{
  "id": "main-roundup",
  "type": "main_roundup"
}
```

Rules:

- Roundup item data stays in `articles.roundup_json`.
- A roundup article contains at most one `main_roundup` marker.
- The marker controls where the roundup list renders.

### `main_faq`

```json
{
  "id": "main-faq",
  "type": "main_faq"
}
```

Rules:

- FAQ heading, intro, explanation, and item data stay in
  `articles.faqs_json`.
- An article contains at most one `main_faq` marker.
- The marker controls where the FAQ section renders.

## Related Content

`related_content` stores curated placement plus copied `cached_card_json`
snapshots. This keeps normal public rendering zero-join for related cards.

Each item stores:

- stable reference fields for refresh and integrity
- a compact render snapshot copied from the referenced article
  `cached_card_json`

```json
{
  "id": "related-1",
  "type": "related_content",
  "title": "More easy dinners",
  "layout": "grid",
  "limit": 3,
  "items": [
    {
      "article_id": 123,
      "snapshot": {
        "id": 123,
        "type": "recipe",
        "slug": "easy-pasta",
        "headline": "Easy Pasta",
        "short_description": "A quick weeknight pasta.",
        "image": {
          "media_id": 55,
          "alt": "Bowl of easy pasta",
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
          "avatar": null
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
          "total_time_minutes": 25,
          "difficulty": "Easy"
        },
        "rating": {
          "rating_value": 4.8,
          "rating_count": 55
        }
      }
    },
    {
      "article_id": 456,
      "snapshot": {
        "id": 456,
        "type": "article",
        "slug": "how-to-store-pasta",
        "headline": "How to Store Pasta",
        "short_description": "Keep cooked pasta fresh without losing texture.",
        "image": {
          "media_id": 78,
          "alt": "Stored pasta in a glass container",
          "placeholder": "data:image/jpeg;base64,...",
          "variants": {
            "xs": { "r2_key": "media/stored-pasta-xs.webp", "width": 360, "height": 240 },
            "sm": { "r2_key": "media/stored-pasta-sm.webp", "width": 720, "height": 480 }
          }
        },
        "category": {
          "id": 4,
          "slug": "guides",
          "label": "Guides",
          "color": "#276749"
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
        "tags": [],
        "recipe": null,
        "rating": null
      }
    }
  ]
}
```

Rules:

- `layout` must be `grid`, `carousel`, or `list`.
- `items[].article_id` must reference an active, non-deleted `articles.id`.
- `items[].snapshot` is required and is copied from the referenced article
  `cached_card_json`.
- `items[].snapshot.id` must match `items[].article_id`.
- `items` order is editorial order.
- Normal public rendering uses the stored item snapshot directly and must not
  read D1 per related item.
- Item snapshots are refreshed from referenced article `cached_card_json` when
  the referenced article changes meaningfully.
- `snapshot.image` stores a compact snapshot with `r2_key`, never public `url`.
- `snapshot.image.variants` stores `xs` and `sm`.
- `snapshot.image` must not store `caption` or `credit`.
- Public/admin/rendered output converts related image `r2_key` values to URLs
  and must not expose `r2_key`.
- `snapshot.image` must not store `original`.
- The current article ID must not be included in `items`.

## Recipe Support Sections

Recipe support content that readers and AI systems need to understand belongs
in visible `content_json` blocks, not hidden top-level recipe fields.

Examples:

- storage notes
- make-ahead guidance
- substitutions
- troubleshooting
- serving suggestions

Use official v1 blocks:

- `heading` for the section title.
- `paragraph` for explanatory copy.
- `list` for grouped guidance.
- `tip_box` for editorial notes or warnings.

FAQ section content is not a recipe support block. Its heading, intro,
explanation, and items belong to `articles.faqs_json`; `main_faq` controls only
where that FAQ section renders.

Do not add top-level `recipe_json.storage`, `recipe_json.make_ahead`,
`recipe_json.substitutions`, `recipe_json.troubleshooting`, or
`recipe_json.serving_suggestions` unless the product intentionally makes those
fields part of the full recipe card UI.

## Extraction Rules

Derived systems read only the fields they own:

| Derived output | Source blocks |
| --- | --- |
| `cached_toc_json` | `heading`, supported marker section labels, and `roundup_json.items[]` for roundup item anchors |
| Search text | visible text blocks: `paragraph`, `heading`, `blockquote`, `list`, `tip_box`, `table` |
| FAQ display position | `main_faq` |
| Recipe card position | `main_recipe` |
| Roundup list position | `main_roundup` |
| Body image render position | `image`, `before_after` image refs |

Extraction must not treat editor-only names as stored contract names.

## Reserved Blocks

These names are reserved but not accepted by strict v1 save validation until
they are supported end-to-end by admin, API, validation, and renderer:

| Reserved `type` | Reason |
| --- | --- |
| `embed` | Needs sanitizer and provider policy before becoming official. |
| `product_card` | Needs affiliate/product data policy before becoming official. |
| `ingredient_spotlight` | Needs renderer/admin parity before becoming official. |
| `spacer` | System/layout strategy is not part of editorial content v1. |
| `ad_slot` | Advertising placement strategy is not part of editorial content v1. |

## Save Validation Checklist

Strict save validation must reject:

- missing `id`
- duplicate block IDs
- missing `type`
- unsupported block types
- reserved block types
- editor-only block type names
- editor-only props
- image snapshots inside `content_json`
- recipe payload fields inside `main_recipe`
- roundup item payload fields inside `main_roundup`
- FAQ arrays inside `main_faq`
- full article payloads or non-compact snapshots inside `related_content`
- unknown fields not listed by the block contract
