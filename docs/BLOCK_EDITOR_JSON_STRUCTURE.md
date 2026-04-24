# Block Editor JSON Structure

> JSON schema reference for all content blocks stored in `content_json`

---

## Overview

Content blocks are stored as a JSON array in the `content_json` column. Each block has a `type` discriminator and type-specific properties.

```typescript
type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | BlockquoteBlock
  | ListBlock
  | ImageBlock
  | VideoBlock
  | TipBoxBlock
  | EmbedBlock
  | ProductCardBlock
  | DividerBlock
  | SpacerBlock
  | AdSlotBlock
  | TableBlock
  | RoundupItemPlaceholderBlock
  | BeforeAfterBlock
  | IngredientSpotlightBlock
  | FAQSectionBlock
  | RelatedContentBlock;
```

---

## Text Blocks

### Paragraph

```json
{
  "type": "paragraph",
  "text": "This is **markdown** enabled text content."
}
```

| Property | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| `type`   | string | Yes      | Always `"paragraph"`            |
| `text`   | string | Yes      | Markdown-enabled content       |

---

### Heading

```json
{
  "type": "heading",
  "level": 2,
  "text": "Introduction",
  "id": "introduction"
}
```

| Property | Type          | Required | Description                           |
|----------|---------------|----------|---------------------------------------|
| `type`   | string        | Yes      | Always `"heading"`                    |
| `level`  | 2 \| 3 \| 4 \| 5 \| 6 | Yes      | Heading level (H1 reserved for headline) |
| `text`   | string        | Yes      | Heading text                          |
| `id`     | string        | No       | Auto-generated anchor ID              |

---

### Blockquote

```json
{
  "type": "blockquote",
  "text": "This is a memorable quote.",
  "cite": "Famous Chef, 2024"
}
```

| Property | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| `type`   | string | Yes      | Always `"blockquote"`          |
| `text`   | string | Yes      | Quote text (Markdown enabled)   |
| `cite`   | string | No       | Attribution / source           |

---

### List

```json
{
  "type": "list",
  "style": "unordered",
  "items": [
    "First item",
    "Second item",
    "Third item"
  ]
}
```

| Property | Type                      | Required | Description          |
|----------|---------------------------|----------|----------------------|
| `type`   | string                    | Yes      | Always `"list"`      |
| `style`  | `"ordered"` \| `"unordered"` \| `"checklist"` | Yes | List style    |
| `items`  | string[]                  | Yes      | List items (Markdown enabled) |

---

## Media Blocks

### Image

```json
{
  "type": "image",
  "media_id": 123,
  "alt": "Delicious chocolate cake",
  "caption": "Rich triple chocolate layer cake",
  "credit": "Photo by Jane Doe",
  "variants": {
    "thumbnail": { "url": "...", "width": 150, "height": 150 },
    "medium": { "url": "...", "width": 600, "height": 400 },
    "large": { "url": "...", "width": 1200, "height": 800 }
  }
}
```

| Property   | Type          | Required | Description                          |
|------------|---------------|----------|--------------------------------------|
| `type`     | string        | Yes      | Always `"image"`                     |
| `media_id` | number        | Yes      | Reference to media table             |
| `alt`      | string        | Yes      | Alt text                             |
| `caption`  | string        | No       | Optional caption                     |
| `credit`   | string        | No       | Optional credit/attribution          |
| `variants` | ImageVariants | No       | Responsive image variants            |

---

### Video

```json
{
  "type": "video",
  "provider": "youtube",
  "videoId": "dQw4w9WgXcQ",
  "aspectRatio": "16:9"
}
```

| Property     | Type                                    | Required | Description          |
|--------------|-----------------------------------------|----------|----------------------|
| `type`       | string                                  | Yes      | Always `"video"`     |
| `provider`   | `"youtube"` \| `"vimeo"` \| `"self"`      | Yes      | Video platform       |
| `videoId`    | string                                  | Yes      | Video ID             |
| `aspectRatio`| `"16:9"` \| `"4:3"` \| `"1:1"` \| `"9:16"` | Yes      | Display aspect ratio |

---

## Callout Blocks

### Tip Box

```json
{
  "type": "tip_box",
  "variant": "tip",
  "title": "Pro Tip",
  "text": "Use room temperature ingredients for better mixing."
}
```

| Property | Type                                    | Required | Description              |
|----------|-----------------------------------------|----------|--------------------------|
| `type`   | string                                  | Yes      | Always `"tip_box"`       |
| `variant`| `"tip"` \| `"warning"` \| `"info"` \| `"note"` | Yes  | Visual style/severity   |
| `title`  | string                                  | No       | Optional heading         |
| `text`   | string                                  | Yes      | Content (Markdown enabled)|

---

## Embed Blocks

### Embed (Social)

```json
{
  "type": "embed",
  "provider": "instagram",
  "url": "https://instagram.com/p/ABC123/",
  "html": "<blockquote class=\"instagram-media\"..."
}
```

| Property  | Type                                                | Required | Description                |
|-----------|-----------------------------------------------------|----------|----------------------------|
| `type`    | string                                              | Yes      | Always `"embed"`           |
| `provider`| `"instagram"` \| `"pinterest"` \| `"tiktok"` \| `"twitter"` | Yes | Social platform      |
| `url`     | string                                              | Yes      | Original URL               |
| `html`    | string                                              | No       | Pre-rendered HTML (for SSR)|

---

---

### Product Card

```json
{
  "type": "product_card",
  "name": "KitchenAid Stand Mixer",
  "url": "https://amazon.com/...",
  "price": "$299.99",
  "image": { "id": 101, "url": "https://...", "alt": "Mixer" },
  "affiliate": true
}
```

| Property    | Type       | Required | Description                    |
|-------------|------------|----------|--------------------------------|
| `type`      | string     | Yes      | Always `"product_card"`         |
| `name`      | string     | Yes      | Product name                   |
| `url`       | string     | Yes      | Affiliate/product URL          |
| `price`     | string     | No       | Price display                  |
| `image`     | ImageSlot  | No       | Product image                   |
| `affiliate` | boolean    | No       | Is affiliate link (default: false)|

---

## Layout Blocks

### Divider

```json
{
  "type": "divider"
}
```

| Property | Type   | Required | Description          |
|----------|--------|----------|----------------------|
| `type`   | string | Yes      | Always `"divider"`    |

---

### Spacer

```json
{
  "type": "spacer",
  "size": "md"
}
```

| Property | Type                            | Required | Description      |
|----------|---------------------------------|----------|------------------|
| `type`   | string                          | Yes      | Always `"spacer"` |
| `size`   | `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | Yes      | Spacing size     |

---

### Ad Slot

```json
{
  "type": "ad_slot",
  "variant": "in-content"
}
```

| Property  | Type                                      | Required | Description        |
|-----------|-------------------------------------------|----------|--------------------|
| `type`    | string                                    | Yes      | Always `"ad_slot"`  |
| `variant` | `"in-content"` \| `"newsletter"` \| `"sidebar"` | Yes    | Ad placement type  |

---

### Table

```json
{
  "type": "table",
  "headers": ["Ingredient", "Amount", "Unit"],
  "rows": [
    ["Flour", "2", "cups"],
    ["Sugar", "1", "cup"],
    ["Salt", "1/2", "tsp"]
  ]
}
```

| Property | Type     | Required | Description        |
|----------|----------|----------|--------------------|
| `type`   | string   | Yes      | Always `"table"`    |
| `headers`| string[] | Yes      | Column headers      |
| `rows`   | string[][]| Yes     | Table rows          |

---

### Roundup Item (Placeholder)

```json
{
  "type": "roundup_item",
  "article_id": 123,
  "external_url": "https://example.com",
  "title": "Best Sourdough Recipe",
  "subtitle": "From Bread Baker's Weekly",
  "note": "Perfect crust and chewy interior.",
  "cover": "https://example.com/image.jpg"
}
```

| Property      | Type    | Required | Description                    |
|---------------|---------|----------|--------------------------------|
| `type`        | string  | Yes      | Always `"roundup_item"`        |
| `article_id`  | number? | No       | Internal article reference      |
| `external_url`| string | No       | External link                   |
| `title`       | string  | No       | Item title                      |
| `subtitle`    | string  | No       | Subtitle/source                 |
| `note`        | string  | No       | Editorial note                  |
| `cover`       | string  | No       | Cover image URL                 |

---

## Food Blog Blocks

### Before/After

```json
{
  "type": "before_after",
  "layout": "slider",
  "before": {
    "media_id": 201,
    "alt": "Bread dough before rising",
    "label": "Before"
  },
  "after": {
    "media_id": 202,
    "alt": "Fully risen dough",
    "label": "After"
  }
}
```

| Property | Type     | Required | Description                    |
|----------|----------|----------|--------------------------------|
| `type`   | string   | Yes      | Always `"before_after"`        |
| `layout` | `"slider"` \| `"side_by_side"` | Yes | Comparison layout |
| `before` | BeforeAfterImage | Yes | Before image data      |
| `after`  | BeforeAfterImage | Yes | After image data       |

#### BeforeAfterImage

| Property   | Type          | Required | Description                    |
|------------|---------------|----------|--------------------------------|
| `media_id` | number        | Yes      | Media reference ID             |
| `alt`      | string        | Yes      | Alt text                        |
| `label`    | string        | No       | Label (e.g., "Before", "After") |
| `variants` | ImageVariants | No       | Responsive variants             |

---

### Ingredient Spotlight

```json
{
  "type": "ingredient_spotlight",
  "name": "Brioche",
  "description": "A rich French bread with butter and eggs.",
  "image": { "id": 301, "url": "https://...", "alt": "Brioche" },
  "tips": "Best when sliced thick and toasted.",
  "substitutes": ["Challah", "Egg bread"],
  "link": "/ingredients/brioche"
}
```

| Property      | Type      | Required | Description                    |
|---------------|-----------|----------|--------------------------------|
| `type`        | string    | Yes      | Always `"ingredient_spotlight"`|
| `name`        | string    | Yes      | Ingredient name                |
| `description` | string    | Yes      | Description text               |
| `image`       | ImageSlot | No       | Ingredient image               |
| `tips`        | string    | No       | Usage tips                     |
| `substitutes` | string[]  | No       | Substitutes list               |
| `link`        | string    | No       | Internal link to ingredient page |

---

### FAQ Section

```json
{
  "type": "faq_section",
  "title": "Common Questions",
  "items": [
    {
      "q": "Can I substitute butter with oil?",
      "a": "Yes, use **melted** coconut oil in equal amounts."
    },
    {
      "q": "How do I store leftovers?",
      "a": "Keep in an airtight container at room temperature for **3 days**."
    }
  ]
}
```

| Property | Type      | Required | Description                    |
|----------|-----------|----------|--------------------------------|
| `type`   | string    | Yes      | Always `"faq_section"`          |
| `title`  | string    | No       | Optional section title          |
| `items`  | FAQItem[] | Yes      | FAQ items                       |

#### FAQItem

| Property | Type   | Required | Description                    |
|----------|--------|----------|--------------------------------|
| `q`      | string | Yes      | Question                       |
| `a`      | string | Yes      | Answer (Markdown enabled)      |

---

### Related Content

```json
{
  "type": "related_content",
  "title": "You Might Also Like",
  "layout": "grid",
  "mode": "auto",
  "limit": 4,
  "recipes": [
    {
      "id": 501,
      "slug": "chocolate-chip-cookies",
      "headline": "Classic Chocolate Chip Cookies",
      "thumbnail": { "id": 502, "url": "https://...", "alt": "Cookies" },
      "total_time": 45,
      "difficulty": "Easy",
      "reading_time": 5
    }
  ],
  "articles": [],
  "roundups": []
}
```

| Property   | Type                  | Required | Description                    |
|------------|-----------------------|----------|--------------------------------|
| `type`     | string                | Yes      | Always `"related_content"`      |
| `title`    | string                | No       | Section heading                |
| `layout`   | `"grid"` \| `"carousel"` \| `"list"` | Yes | Display layout |
| `mode`     | `"manual"` \| `"auto"`  | No       | Selection mode (default: `"auto"`) |
| `limit`    | number                | No       | Max items per type             |
| `recipes`  | RelatedArticleCard[]  | No       | Related recipes                |
| `articles` | RelatedArticleCard[]  | No       | Related articles               |
| `roundups` | RelatedArticleCard[]  | No       | Related roundups               |

#### RelatedArticleCard

| Property      | Type       | Required | Description                    |
|---------------|------------|----------|--------------------------------|
| `id`          | number     | Yes      | Article ID                     |
| `slug`        | string     | Yes      | URL slug                        |
| `headline`    | string     | Yes      | Article headline               |
| `thumbnail`   | ImageSlot  | No       | Thumbnail image                |
| `total_time`  | number     | No       | Total time in minutes          |
| `difficulty`  | string     | No       | Difficulty level               |
| `reading_time`| number     | No       | Reading time in minutes         |
| `item_count`  | number     | No       | Item count (for roundups)       |

---

## BlockNote Editor Props

Some blocks store additional metadata in BlockNote's prop schema for editor functionality:

### Roundup List Block (Editor Props)

```json
{
  "type": "roundupList",
  "title": "Best Bread Recipes",
  "description": "Our top picks for homemade bread.",
  "itemsJson": "[\"{\\\"title\\\": \\\"Sourdough\\\", ...}\"]",
  "showStats": true
}
```

| Property     | Type    | Required | Description                    |
|-------------|---------|----------|--------------------------------|
| `type`      | string  | Yes      | Always `"roundupList"`         |
| `title`     | string  | No       | Group title                    |
| `description`| string | No       | Group description               |
| `itemsJson` | string  | No       | JSON stringified items array   |
| `showStats` | boolean | No       | Show stats on items (default: true) |

---

## Type Guards

```typescript
import {
  isHeadingBlock,
  isFAQSectionBlock,
  isImageBlock,
  extractHeadings,
  extractFAQs,
  generateTOC
} from '@/modules/articles/types/content-blocks.types';

// Check block type
if (isHeadingBlock(block)) {
  console.log(block.level, block.text);
}

// Generate table of contents
const toc = generateTOC(content);

// Extract FAQs for JSON-LD
const faqs = extractFAQs(content);
```

---

## Shared Types

### ImageSlot

```typescript
interface ImageSlot {
  id: number;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}
```

### ImageVariants

```typescript
interface ImageVariants {
  thumbnail?: ImageVariant;
  small?: ImageVariant;
  medium?: ImageVariant;
  large?: ImageVariant;
  full?: ImageVariant;
}

interface ImageVariant {
  url: string;
  width: number;
  height: number;
}
```

---

## Example Full Document

```json
[
  {
    "type": "heading",
    "level": 2,
    "text": "Introduction",
    "id": "introduction"
  },
  {
    "type": "paragraph",
    "text": "Welcome to this **delicious** recipe!"
  },
  {
    "type": "image",
    "media_id": 101,
    "alt": "Finished dish",
    "caption": "The final presentation"
  },
  {
    "type": "faq_section",
    "title": "FAQ",
    "items": [
      { "q": "Can I freeze it?", "a": "Yes, for up to **2 months**." }
    ]
  }
]
```
