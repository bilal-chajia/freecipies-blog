# BlockEditor Refactoring Plan v2 — Final

> **Goal:** Refactor the public rendering layer to (1) eliminate D1 read waste, (2) use cache columns for zero-join rendering, (3) clean up ContentRenderer monolith.
>
> **Use subagent-driven-development skill to implement task-by-task.**

## Architecture Context

**D1 Billing Reality:** Cloudflare D1 charges per read/write operation. Each page currently does:
- `getArticleBySlug()` = 1 read (+ `getTagsForArticleId` = 1 read)
- `getAuthorById()` = 1 read (articles + roundups pages) ← **WASTE: already in cached_author_json**
- `getCategoryById()` = 1 read (articles + roundups pages) ← **WASTE: already in cached_category_json**

**Total per page: 3-4 reads. Target: 2 reads (article + tags).**

The `hydrateArticle()` function already merges cache columns into the returned object. The problem is that pages still make extra queries for data that's already available.

### Zero-Join Rendering Architecture

```
getArticleBySlug(slug)
    ↓ (1 D1 read — returns ALL columns including cache_*)
hydrateArticle(row)
    ↓ (merges cached_author_json → .author, cached_category_json → .category, etc.)
    ↓ (returns flat object with everything needed for rendering)
Layout / ContentRenderer
    ↓ (reads .author, .category, .cachedTocJson directly from the article object)
    ↓ (ZERO additional D1 queries)
```

### Cache Columns Status

| Column | Generated at save? | Used in rendering? | Action needed |
|--------|-------------------|-------------------|---------------|
| `cached_author_json` | ✅ Yes | ❌ No (pages query authors table) | **Use it** |
| `cached_category_json` | ✅ Yes | ❌ No (pages query categories table) | **Use it** |
| `cached_toc_json` | ✅ Yes | ✅ Yes (TableOfContents.astro) | Keep |
| `cached_recipe_json` | ✅ Yes | Partial (filters only) | Keep |
| `cached_equipment_json` | ✅ Yes | ✅ Yes (EquipmentSection.astro) | Keep |
| `cached_rating_json` | ✅ Yes (on vote) | ✅ Yes | Keep |
| `cached_card_json` | ❌ Not generated | ❌ Not used | **Generate + use for related_content** |
| `cached_tags_json` | ✅ Yes | ✅ Yes | Keep |
| `faqs_json` | ❌ Not extracted | ✅ Yes (FAQSection, JSON-LD) | **Extract from content_json blocks** |
| `jsonld_json` | ❌ Not generated | ✅ Yes (SEO.astro) | **Generate at save** |

---

## Phase 4: Rendering Layer Refactoring

### Task 4.1: Eliminate author/category extra queries from pages

**Objective:** Remove `getAuthorById()` and `getCategoryById()` calls from article/roundup pages. Use `cached_author_json` / `cached_category_json` via `hydrateArticle()` instead.

**Impact:** -2 D1 reads per article/roundup page view.

**Files:**
- Modify: `src/pages/articles/[slug].astro` — remove lines 6, 9, 18-19, 53-57; replace `author`/`category` with `article.author`/`article.category`
- Modify: `src/pages/roundups/[slug].astro` — same pattern

**Current (articles/[slug].astro):**
```typescript
import { getAuthorById } from "@modules/authors/services/authors.service";
import { getCategoryById } from "@modules/categories/services/categories.service";

let author: Author | null = null;
let category: Category | null = null;

// ...
if (article.authorId) {
  author = await getAuthorById(env.DB, article.authorId);  // ← extra D1 read!
}
if (article.categoryId) {
  category = await getCategoryById(env.DB, article.categoryId);  // ← extra D1 read!
}
```

**After:**
```typescript
// author and category are already hydrated by getArticleBySlug → hydrateArticle
const author = (article as any).author || null;
const category = (article as any).category || null;
```

**Note:** `recipes/[slug].astro` already uses this pattern (line 49-50). Only articles and roundups need fixing.

**Commit:**
```
refactor(pages): eliminate 2 extra D1 reads by using cache columns for author/category
```

---

### Task 4.2: Simplify ContentRenderer props to single article object

**Objective:** ContentRenderer receives the full hydrated article and extracts everything from it. No more separate `recipeJson`/`roundupJson`/`faqsJson` props.

**Files:**
- Modify: `src/components/ContentRenderer.astro` (frontmatter only, lines 1-239)

**Current props:**
```typescript
const { content, faqsJson, settings, article, recipeJson, roundupJson, author, category } = Astro.props;
```

**New props:**
```typescript
interface Props {
  /** Full hydrated article from getArticleBySlug + hydrateArticle */
  article: Record<string, any>;
  /** TOC settings (global, not per-article) */
  settings?: TocSettings;
}
const { article, settings } = Astro.props as Props;
```

**Internal extraction (replaces separate props):**
```typescript
// Content blocks
const parsed = (() => {
  const raw = article.contentJson;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const json = JSON.parse(raw); return Array.isArray(json) ? json : []; }
    catch { return []; }
  }
  return [];
})();

// Recipe data from cached column (already parsed by hydrateArticle or raw column)
const recipeJson = article.recipeJson
  ? (typeof article.recipeJson === 'string' ? JSON.parse(article.recipeJson) : article.recipeJson)
  : null;

// FAQs from dedicated column
const faqsJson = article.faqsJson
  ? (typeof article.faqsJson === 'string' ? JSON.parse(article.faqsJson) : article.faqsJson)
  : [];

// Roundup from dedicated column
const roundupJson = article.roundupJson
  ? (typeof article.roundupJson === 'string' ? JSON.parse(article.roundupJson) : article.roundupJson)
  : null;

// Author/category from cache columns (already resolved by hydrateArticle)
const author = (article as any).author || null;
const category = (article as any).category || null;
```

**Commit:**
```
refactor(renderer): simplify ContentRenderer to single article prop
```

---

### Task 4.3: Extract block renderers into `content/blocks/` partials

**Objective:** Each block type gets its own Astro partial. ContentRenderer becomes a thin dispatcher.

**Files to create:**
```
src/components/content/blocks/
├── Alert.astro         (tip_box / alert blocks)
├── BeforeAfter.astro   (delegates to BeforeAfter.astro)
├── Blockquote.astro    (simple)
├── Divider.astro       (simple)
├── FaqSection.astro    (reads faqsJson from article)
├── Heading.astro       (numbering + slug ID)
├── Image.astro         (responsive variants + srcset)
├── List.astro          (ordered/unordered)
├── MainRecipe.astro    (reads recipeJson from article)
├── Paragraph.astro     (inline markdown)
├── RelatedContent.astro (delegates to RelatedContent.astro)
├── RoundupList.astro   (reads roundupJson from article)
├── Table.astro         (delegates to TableBlock.astro)
└── Video.astro         (embed URL + iframe)
```

**Shared utilities to extract:**
```
src/components/utils/
├── markdown.ts         (renderInlineMarkdown + renderMarkdownText)
└── embed.ts            (getEmbedUrl)
```

**Key patterns:**

*Simple blocks (paragraph, blockquote, divider, list):*
```astro
---
// src/components/content/blocks/Paragraph.astro
import { renderInlineMarkdown } from '../../utils/markdown';
const { block } = Astro.props as { block: { type: 'paragraph'; text: string } };
---
<p set:html={renderInlineMarkdown(block.text)} />
```

*Marker blocks (mainRecipe, faqSection, roundupList):*
```astro
---
// src/components/content/blocks/MainRecipe.astro
import RecipeCard from '../../RecipeCard.astro';
const { block, article, recipeJson, author, category } = Astro.props;
if (!article || !recipeJson) return null;
---
<RecipeCard article={article} recipeJson={recipeJson} author={author} category={category} embedded={true} />
```

*Complex blocks (Alert, Image, Video):* Move the full rendering logic from ContentRenderer into the partial.

**Commit:**
```
refactor(renderer): extract 14 block partials + shared markdown/embed utils
```

---

### Task 4.4: Rewrite ContentRenderer as thin dispatcher

**Objective:** ContentRenderer frontmatter becomes minimal. Template is a clean switch/case loop.

**Target: ~60 lines frontmatter + ~40 lines template + CSS unchanged.**

**New ContentRenderer.astro structure:**

```astro
---
import { env } from "cloudflare:workers";
import type { TocSettings } from "@modules/settings/services/settings.service";

// Block partials
import Alert from "./content/blocks/Alert.astro";
import BlockBlock from "./content/blocks/Blockquote.astro";
import BeforeAfter from "./content/blocks/BeforeAfter.astro";
import Divider from "./content/blocks/Divider.astro";
import FaqSection from "./content/blocks/FaqSection.astro";
import Heading from "./content/blocks/Heading.astro";
import Image from "./content/blocks/Image.astro";
import List from "./content/blocks/List.astro";
import MainRecipe from "./content/blocks/MainRecipe.astro";
import Paragraph from "./content/blocks/Paragraph.astro";
import RelatedContent from "./content/blocks/RelatedContent.astro";
import RoundupList from "./content/blocks/RoundupList.astro";
import TableBlock from "./content/blocks/Table.astro";
import Video from "./content/blocks/Video.astro";

const { article, settings } = Astro.props as {
  article: Record<string, any>;
  settings?: TocSettings;
};

// Parse content blocks
const parsed = /* same parsing logic */;
const recipeJson = /* extract from article */;
const faqsJson = /* extract from article */;
const roundupJson = /* extract from article */;
const author = (article as any).author || null;
const category = (article as any).category || null;

// Heading numbering
const numberingEnabled = settings?.numbering ?? true;
let h2 = 0, h3 = 0, h4 = 0;
const processedBlocks = parsed.map((block: any) => {
  if (block?.type === 'heading') { /* add headingNumber */ }
  return block;
});

// Standalone roundup fallback
let globalRoundupIndex = 1;
const hasRoundupList = processedBlocks.some((b: any) => b.type === 'roundupList' || b.type === 'roundup_list');
const standaloneRoundup = !hasRoundupList && roundupJson?.items?.length > 0;
---

<div class="content-blocks">
  {processedBlocks.map((block: any) => {
    if (!block?.type) return null;
    switch (block.type) {
      case 'paragraph': return <Paragraph block={block} />;
      case 'heading': return <Heading block={block} />;
      case 'list': return <List block={block} />;
      case 'blockquote': return <BlockBlock block={block} />;
      case 'alert': case 'tip_box': return <Alert block={block} />;
      case 'image': return <Image block={block} />;
      case 'video': return <Video block={block} />;
      case 'divider': return <Divider block={block} />;
      case 'table': return <TableBlock block={block} />;
      case 'before_after': return <BeforeAfter block={block} />;
      case 'related_content': return <RelatedContent block={block} />;
      case 'roundupList': case 'roundup_list': {
        const idx = globalRoundupIndex;
        const items = typeof block.itemsJson === 'string' ? JSON.parse(block.itemsJson) : block.items || [];
        globalRoundupIndex += items.length;
        return <RoundupList block={block} roundupJson={roundupJson} db={env.DB} startNumber={idx} />;
      }
      case 'main_recipe': return <MainRecipe block={block} article={article} recipeJson={recipeJson} author={author} category={category} />;
      case 'faq_section': return <FaqSection block={block} faqsJson={faqsJson} />;
      default: return null;
    }
  })}
  {standaloneRoundup && (
    <div class="standalone-roundup-list">
      <div class="standalone-header"><h2 class="standalone-title">Featured Recipes</h2></div>
      <RoundupList roundup={roundupJson} db={env.DB} />
    </div>
  )}
</div>

<style>
  /* ALL existing CSS preserved exactly as-is — no changes */
</style>
```

**Commit:**
```
refactor(renderer): rewrite ContentRenderer as thin block dispatcher (239 → ~60 lines logic)
```

---

### Task 4.5: Update Layouts to use simplified ContentRenderer API

**Objective:** All 3 Layouts pass `{ article, settings }` only to ContentRenderer. No more `recipeJson`/`roundupJson`/`faqsJson`/`content`/`author`/`category` props.

**Files:**
- Modify: `src/layouts/ArticleLayout.astro` — line 179
- Modify: `src/layouts/RecipeLayout.astro` — equivalent ContentRenderer call
- Modify: `src/layouts/RoundupLayout.astro` — line 167

**Before (RoundupLayout):**
```astro
<ContentRenderer
  content={contentBlocks}
  faqsJson={article.faqsJson}
  settings={tocSettings}
  article={article}
  roundupJson={parsedRoundupJson}
  author={author}
  category={category}
/>
```

**After:**
```astro
<ContentRenderer article={article} settings={tocSettings} />
```

**Layout-specific details:**

*ArticleLayout:*
- Remove `contentBlocks` variable (ContentRenderer parses from `article.contentJson`)
- Keep `FAQSection` call (dedicated section outside content area) — but read `faqsJson` from `article.faqsJson` instead of separate prop
- Keep TOC — read from `article.cachedTocJson` directly (already done)

*RecipeLayout:*
- Keep the IngredientsSection/InstructionsSection/EquipmentSection/NutritionFacts fallback — this is a layout decision
- Keep `FAQSection` call — read from `article.faqsJson`
- Remove `parsedRoundupJson` and `contentBlocks` local variables

*RoundupLayout:*
- Remove `parsedRoundupJson` — ContentRenderer reads from `article.roundupJson`
- Remove `contentBlocks` variable

**Commit:**
```
refactor(layouts): simplify ContentRenderer calls, remove duplicate JSON parsing
```

---

### Task 4.6: Generate `faqs_json` at save time from content_json

**Objective:** Extract all `faq_section` blocks from `content_json` and aggregate them into `faqs_json` at save time. This column is used by FAQSection.astro and JSON-LD generation.

**Files:**
- Modify: `src/modules/articles/services/articles.service.ts` — add to `refreshArticleCaches()` function

**Logic (add after TOC extraction, ~line 570):**
```typescript
// Extract FAQs from contentJson faq_section blocks
if (article.contentJson) {
  const contentBlocks = safeParseJson<any[]>(article.contentJson) || [];
  const faqs = contentBlocks
    .filter((b: any) => b.type === 'faq_section')
    .flatMap((b: any) => b.items || []);
  if (faqs.length > 0) {
    (updateData as any).faqsJson = JSON.stringify(faqs);
  } else {
    (updateData as any).faqsJson = '[]';
  }
}
```

**Commit:**
```
feat(articles): generate faqs_json cache from content_json at save time
```

---

### Task 4.7: Generate `cached_card_json` at save time

**Objective:** Pre-compute card data for related_content blocks and listing pages. Eliminates the need for additional queries when rendering related article cards.

**Files:**
- Modify: `src/modules/articles/services/articles.service.ts` — add to `refreshArticleCaches()`

**Logic:**
```typescript
// Generate cached_card_json for zero-join card rendering
const thumbnail = (() => {
  const images = safeParseJson<any>(article.imagesJson);
  const cover = images?.cover?.variants;
  if (!cover) return null;
  return {
    alt: images?.cover?.alt || article.headline,
    variants: {
      xs: cover.xs ? { url: resolveVariantUrl(cover.xs), width: cover.xs.width } : undefined,
      sm: cover.sm ? { url: resolveVariantUrl(cover.sm), width: cover.sm.width } : undefined,
      md: cover.md ? { url: resolveVariantUrl(cover.md), width: cover.md.width } : undefined,
      lg: cover.lg ? { url: resolveVariantUrl(cover.lg), width: cover.lg.width } : undefined,
    }
  };
})();

const card: Record<string, any> = {
  id: article.id,
  type: article.type,
  slug: article.slug,
  headline: article.headline,
  short_description: article.shortDescription,
  thumbnail,
};

if (article.type === 'recipe' && recipe) {
  card.total_time = recipe.total ?? ((recipe.prep ?? 0) + (recipe.cook ?? 0)) || null;
  card.difficulty = recipe.difficulty ?? null;
  card.servings = recipe.servings ?? null;
  card.rating = article.cachedRatingJson ? safeParseJson<any>(article.cachedRatingJson) : null;
} else if (article.type === 'article') {
  card.reading_time = article.readingTimeMinutes || null;
  card.category = cachedCategory?.label || null;
} else if (article.type === 'roundup') {
  card.item_count = (safeParseJson<any>(article.roundupJson)?.items?.length) ?? 0;
}

(updateData as any).cachedCardJson = JSON.stringify(card);
```

**Commit:**
```
feat(articles): generate cached_card_json at save time for zero-join card rendering
```

---

## Phase 5: Cleanup & Tests

### Task 5.1: Delete dead code

**Files to clean:**
- Remove stale `import { getAuthorById }` and `import { getCategoryById }` from pages that no longer use them
- Remove `Author` type imports where no longer needed
- Remove `contentBlocks` local variables from layouts where they only fed ContentRenderer

**Verification:**
```bash
grep -rn "getAuthorById\|getCategoryById" src/pages/ src/layouts/
```
Should return zero results in pages/layouts (may still exist in admin/API routes).

**Commit:**
```
chore: remove dead imports and stale JSON parsing from layouts/pages
```

---

### Task 5.2: Round-trip tests for all 14 adapters

**Files:**
- Create: `src/admin/components/BlockEditor/blocks/adapters/__tests__/all-adapters.test.ts`

Test each adapter: DB block → editor block → DB block. Verify type preserved, required fields present.

**Commit:**
```
test(blockeditor): add round-trip tests for all 14 block adapters
```

---

## Execution Order & D1 Impact

| Task | D1 Reads Saved | Risk | Depends on |
|------|---------------|------|------------|
| 4.1 (eliminate author/cat queries) | **-2 per article/roundup page** | LOW | None |
| 4.2 (simplify ContentRenderer props) | 0 (prep for 4.4) | MEDIUM | None |
| 4.3 (extract block partials) | 0 (prep for 4.4) | LOW | 4.2 |
| 4.4 (rewrite as dispatcher) | 0 | MEDIUM | 4.2 + 4.3 |
| 4.5 (update layouts) | 0 | LOW | 4.4 |
| 4.6 (generate faqs_json) | **-1 per FAQ render** | LOW | None |
| 4.7 (generate cached_card_json) | **-N per related_content block** | MEDIUM | None |
| 5.1 (dead code cleanup) | 0 | LOW | 4.1-4.5 |
| 5.2 (adapter tests) | 0 | NONE | None |

**Tasks 4.1, 4.6, 4.7 can be done in parallel** (independent files).
**Tasks 4.2 → 4.3 → 4.4 → 4.5 must be sequential** (each builds on the previous).

---

## Files NOT Modified (Explicitly)

- `db/schema.sql` — no schema changes
- `src/shared/utils/hydration.ts` — already works correctly
- `src/modules/articles/schema/articles.schema.ts` — all cache columns already mapped
- `src/admin/` — admin side is not touched (different concern)
- SEO/JSON-LD generation — deferred (needs cached_card_json + faqs_json first)
- `useContentEditor.js` — admin hook, out of scope

---

*Plan v2 final — D1 cost optimization + ContentRenderer refactoring.*
