# Content JSON Contract

> **Last Updated:** 2026-04-29

This is the canonical contract for `articles.content_json`.

For the full `articles` table contract, use `docs/ARTICLE_TABLE_CONTRACT.md`.

## Stored Shape

`content_json` is stored as a versioned document object, never as a raw array.

```json
{
  "version": 1,
  "kind": "content_document",
  "blocks": []
}
```

`src/modules/content-blocks` is the source of truth for types, validation, normalization, and extraction helpers.

## Format Boundaries

| Layer | Format | Rule |
| --- | --- | --- |
| Admin editor | BlockNote/AppBlock | Never store directly in DB |
| Database/API | `ContentDocument` | Official persisted contract |
| Site renderer | normalized `ContentDocument.blocks` | Renderer reads canonical block names only |

Compatibility behavior for old drafts or editor names is documented in `docs/IMPLEMENTATION_GAPS.md`, not in this contract.

## Naming Rules

Use exactly these names by layer:

| Context | Correct name | Example |
| --- | --- | --- |
| SQL column / `schema.sql` / Drizzle column name | `content_json` | `articles.content_json` |
| JavaScript, TypeScript, API payloads, React props | `contentJson` | `{ contentJson: document }` |
| Stored block `type` values | snake_case | `roundup_item`, `main_recipe`, `tip_box` |
| BlockNote/admin block `type` values | snake_case | `roundup_item`, `main_recipe`, `faq_section` |

Never use misspelled, hybrid, or alternate block type names such as `contentjson`, `content_JSON`, `roundepitem`, `roundupItem`, `roundupList`, `mainRecipe`, `faqSection`, or `roundup_list` in new code.

## Canonical Block Names

The official `block.type` convention is `snake_case` across every surface: BlockEditor, API, DB, and renderer.

`main_recipe` is a position marker only. Recipe data remains in `recipe_json`.

## BlockEditor Agreement

This section is the working agreement between admin BlockEditor, APIs, DB, and the Astro renderer.

There is one official block vocabulary:

- **Canonical vocabulary**: `snake_case` `block.type` names used by BlockEditor, APIs, DB, and Astro renderer.

Only canonical `snake_case` block types are allowed in `articles.content_json`.

### Official v1 Supported Blocks

| Stored `type` | Purpose | Required fields | Optional fields | Notes |
| --- | --- | --- | --- | --- |
| `paragraph` | Body text | `id`, `text` | none | Markdown-like inline text is allowed, sanitized/rendered by site utilities. |
| `heading` | Section heading and TOC source | `id`, `level`, `text` | none | `level` is `2`, `3`, `4`, `5`, or `6`. |
| `blockquote` | Quote/callout quote | `id`, `text` | `cite` | Use for editorial quotes, not tips. |
| `list` | Ordered, unordered, or checklist list | `id`, `style`, `items` | none | `style` is `ordered`, `unordered`, or `checklist`. |
| `image` | Media image block | `id`, `media_id`, `alt` | `caption`, `credit`, `variants` | `credit` is an author snapshot object, not a bare string. Frontend must render with `width`, `height`, and lazy loading where applicable. |
| `video` | Video embed | `id`, `provider`, `video_id`, `aspect_ratio` | none | `provider` is `youtube`, `vimeo`, or `self`. |
| `tip_box` | Tip, warning, info, or note box | `id`, `variant`, `text` | `title` | Use for editorial tips, warnings, info, or notes. |
| `divider` | Visual divider | `id` | none | No content payload. |
| `table` | Simple table | `id`, `headers`, `rows` | none | `headers` is `string[]`, `rows` is `string[][]`. |
| `roundup_item` | One item inside a roundup article | `id` plus `article_id` or `external_url` + `title` | `subtitle`, `note`, `cover` | One stored block per roundup item. Do not store `roundup_list`. |
| `before_after` | Before/after comparison | `id`, `layout`, `before`, `after` | none | `layout` is `slider` or `side_by_side`. |
| `faq_section` | FAQ source block | `id`, `items` | `title` | `items` contains `{ "question": "...", "answer": "..." }`. |
| `related_content` | Related article/recipe/roundup block | `id`, `layout`, `items` | `title`, `mode`, `limit` | Stores compact snapshots so renderer does not read D1. |
| `main_recipe` | Position marker for the recipe card | `id` | none | Recipe data stays in `recipe_json`. |

Every official v1 block stored in `content_json.blocks` must include `id`. Strict save validation rejects missing IDs.

### Reserved Future Blocks

These names are reserved but not accepted by strict v1 save validation until they are supported end-to-end by admin, API, validation, and renderer:

| Reserved `type` | Reason |
| --- | --- |
| `embed` | Needs sanitizer and provider policy before becoming official. |
| `product_card` | Needs affiliate/product data policy before becoming official. |
| `ingredient_spotlight` | Needs renderer/admin parity before becoming official. |

### Reserved System/Layout Blocks

`spacer` and `ad_slot` are reserved for a future system/layout strategy. They are not editorial content blocks in v1 and strict save validation must reject them.

### Roundup Decision

`roundup_item` is the only stored roundup block name.

Do not introduce:

- `roundupList` in new BlockEditor code or stored JSON.
- `roundup_list` in new BlockEditor code or stored JSON.
- `roundupItem` or misspelled variants such as `roundepitem`.

If the editor needs one visual "roundup list" UI, that grouping is a component concern, not a `block.type`. The DB still stores one `roundup_item` block per item so search, rendering, and APIs can reason about each item consistently.

### Main Recipe Decision

`main_recipe` is a canonical stored block, but it is only positional.

Allowed:

```json
{
  "id": "main-recipe",
  "type": "main_recipe"
}
```

Not allowed:

```json
{
  "id": "main-recipe",
  "type": "main_recipe",
  "ingredients": [],
  "instructions": []
}
```

Recipe payload stays in `articles.recipe_json`.

### Recipe Support Sections for SEO/GEO/AI

Recipe support content that readers and AI systems should understand belongs in visible `content_json` blocks, not hidden top-level fields in `recipe_json`.

Examples:

- storage notes
- make-ahead guidance
- substitutions
- troubleshooting
- serving suggestions
- visible FAQs

Use existing official v1 blocks:

- `heading` for the section title.
- `paragraph` for explanatory copy.
- `list` for grouped guidance.
- `tip_box` for editorial notes or warnings.
- `faq_section` for question/answer content.

Do not add top-level `recipe_json.storage`, `recipe_json.make_ahead`, `recipe_json.substitutions`, `recipe_json.troubleshooting`, or `recipe_json.serving_suggestions` unless the product intentionally makes those part of the full recipe card UI. For v1, they remain article body content.

### Related Content Snapshot

`related_content` stores a minimal renderable snapshot plus stable references. It does not replace the `media` table.

The complete image variant set stays in `media.variants_json`. The `related_content.image` snapshot copies only the variants needed to render the related card without an extra D1/media read. The stored snapshot keeps `r2_key` instead of absolute URLs so domain/CDN changes do not require DB migrations. The public renderer must use this snapshot directly, convert image keys to public URLs, and must not read D1 to render related cards.

```json
{
  "id": "related-1",
  "type": "related_content",
  "layout": "grid",
  "mode": "manual",
  "items": [
    {
      "content_type": "recipe",
      "article_id": 123,
      "slug": "easy-pasta",
      "title": "Easy Pasta",
      "description": "A quick weeknight pasta.",
      "image": {
        "media_id": 55,
        "alt": "Bowl of easy pasta",
        "variants": {
          "sm": {
            "r2_key": "media/easy-pasta-sm.webp",
            "width": 720,
            "height": 480
          },
          "md": {
            "r2_key": "media/easy-pasta-md.webp",
            "width": 1200,
            "height": 800
          }
        }
      }
    }
  ]
}
```

`related_content.image` must not store absolute URLs. Public responses and final frontend props must not expose `r2_key`; they should expose generated relative URLs.

Variant policy:

- Default related cards: store `sm` + `md`.
- Tiny related UI: `xs` + `sm` is allowed.
- Wide carousel or large visual related cards: `md` + `lg` is allowed.
- Do not store `original` in `related_content`.
- Keep all variants in `media.variants_json`; do not copy all of them into every block snapshot.
- `srcset` for related cards is generated from the variants present in the snapshot after converting `r2_key` to public URLs.
- If a related-content component needs wider responsive rendering, change the snapshot policy for that component explicitly instead of treating `related_content.image` as a full media record.

## Minimum Examples

```json
{
  "version": 1,
  "kind": "content_document",
  "blocks": [
    {
      "id": "intro",
      "type": "paragraph",
      "text": "Intro with **markdown**."
    },
    {
      "id": "recipe",
      "type": "main_recipe"
    },
    {
      "id": "faq",
      "type": "faq_section",
      "title": "FAQ",
      "items": [
        { "question": "Can I freeze it?", "answer": "Yes." }
      ]
    }
  ]
}
```

## Implementation Rules

- API create/update validates `contentJson` before saving.
- DB triggers and search indexes read blocks from `$.blocks`.
- Cached TOC and FAQ data are extracted through `src/modules/content-blocks`.
- Visual components must not invent stored block names.
- Documentation that describes `content_json` as `ContentBlock[]` is obsolete.
