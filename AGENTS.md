# Agent Instructions

## AI Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

Best Practice: Use a dedicated directory for these ephemeral files

Recommended approach:
- Create a history/ directory in the project root
- Store ALL AI-generated planning/design docs in history/
- Keep the repository root clean and focused on permanent project files
- Only access history/ when explicitly asked to review past planning

Example .gitignore entry (optional):
```
# AI planning documents (ephemeral)
history/
```

Benefits:
- Clean repository root
- Clear separation between ephemeral and permanent documentation
- Easy to exclude from version control if desired
- Preserves planning history for archeological research
- Reduces noise when browsing the project

## Database Schema (Source of Truth)

> **CRITICAL:** `db/schema.sql` is the **SINGLE SOURCE OF TRUTH** for the database schema.

- **Source of truth:** `db/schema.sql`
- **Documentation:** `db/DATABASE_SCHEMA.md`
- **Drizzle schemas:** `src/modules/*/schema/*.schema.ts` (keep in sync with `db/schema.sql`)

When modifying the database:
1. Edit `db/schema.sql` first
2. Update `db/DATABASE_SCHEMA.md` documentation
3. Update the related Drizzle schemas in `src/modules/*/schema/*.schema.ts` to match

## TypeScript Content Types

For the `articles` module, we use polymorphic types to distinguish between content kinds.

- **Source of Truth:** `src/modules/articles/types/articles.types.ts`
- **Generics:** Use `AnyContent` (alias `HydratedArticle`) for lists containing mixed types.
- **Specifics:** Use `RecipeContent` or `RoundupContent` when the type is known.
- **Do NOT** use the raw DB `Article` type for frontend components; use the hydrated types.

## Image Types (Unified)

> **CRITICAL:** Import ALL image types from `@shared/types/images` (single source of truth).

**Public Types (Consumer code, API responses):**
```typescript
import type { 
  ImageVariant,      // url, width, height, sizeBytes
  ImageVariants,     // xs, sm, md, lg, original
  ImageSlot,         // Full slot: media_id, alt, caption, variants, etc.
  ArticleImagesJson, // { cover?, thumbnail?, pinterest?, contentImages? }
  ContentImageBlock, // { type: 'image', media_id, alt, variants, ... }
} from '@shared/types/images';
```

**Storage Types (Media module ONLY - never expose to frontend):**
```typescript
import type { 
  StorageVariant,    // Extends ImageVariant with r2_key
  MediaVariantsJson, // { variants: StorageVariants, placeholder }
} from '@shared/types/images';
```

**Utility Functions:**
- `getBestVariantUrl(slot)` - Get best available URL
- `getSrcSet(slot)` - Generate srcset string
- `stripStorageKeys(variants)` - Remove r2_key for API responses

**DO NOT:**
- Create new image type definitions
- Import from `modules/articles/types/images.types.ts` (re-exports only)
- Expose `r2_key` to frontend code

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Cache Rebuild Triggers (Articles Table)

When saving an article, rebuild these cached fields in the API/Worker:

| Cached Field | Rebuild When |
|--------------|--------------|
| `faqs_json` | content_json changes (scan for faq_section blocks) |
| `cached_toc_json` | content_json changes (scan for heading blocks) |
| `cached_tags_json` | articles_to_tags changes |
| `cached_category_json` | category_id changes OR category table updates |
| `cached_author_json` | author_id changes OR authors table updates |
| `cached_equipment_json` | recipe_json.equipment changes OR equipment table updates |
| `cached_rating_json` | recipe_json.aggregateRating changes |
| `cached_recipe_json` | recipe_json changes |
| `reading_time_minutes` | content_json changes |
| `jsonld_json` | Any SEO-relevant field changes |

**Implementation Pattern:**
```javascript
// In article save handler:
async function saveArticle(articleData) {
  // 1. Rebuild all caches before save
  articleData.faqs_json = extractFAQs(articleData.content_json);
  articleData.cached_toc_json = generateTOC(articleData.content_json);
  articleData.cached_author_json = await getAuthorSnapshot(articleData.author_id);
  articleData.cached_category_json = await getCategorySnapshot(articleData.category_id);
  // ... other caches
  
  // 2. Save to database
  await db.insert(articles).values(articleData);
  
  // 3. Purge CDN cache for this article
  await purgeCache(`/recipes/${articleData.slug}`);
}
```

## Drizzle Query Patterns

Optimized field selection for different use cases:

```typescript
// --------------------------------------------------------------------
// LISTING PAGES (Minimal fields for cards)
// --------------------------------------------------------------------
const listingFields = {
  slug: articles.slug,
  headline: articles.headline,
  images_json: articles.images_json,
  cached_recipe_json: articles.cached_recipe_json,
  cached_author_json: articles.cached_author_json,
  cached_category_json: articles.cached_category_json,
  cached_tags_json: articles.cached_tags_json,
  published_at: articles.published_at,
};

const recipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    isNull(articles.deleted_at)
  ))
  .orderBy(desc(articles.published_at))
  .limit(20);

// --------------------------------------------------------------------
// ARTICLE PAGE (Full data)
// --------------------------------------------------------------------
const article = await db
  .select()
  .from(articles)
  .where(eq(articles.slug, slug))
  .get();

// --------------------------------------------------------------------
// FILTERED RECIPES (By time, difficulty)
// --------------------------------------------------------------------
const quickRecipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    lte(articles.total_time_minutes, 30),
    eq(articles.type, 'recipe')
  ))
  .orderBy(articles.total_time_minutes);
```

## Content Block Types Reference

Valid block types for `content_json`:

| Category | Types |
|----------|-------|
| **Text** | `paragraph`, `heading`, `blockquote`, `list` |
| **Media** | `image`, `video` |
| **Callouts** | `tip_box` |
| **Embeds** | `embed`, `recipe_card`, `product_card` |
| **Layout** | `divider`, `spacer`, `ad_slot`, `table` |
| **Food Blog** | `before_after`, `ingredient_spotlight`, `faq_section` |

## Image Breakpoints

Standard responsive sizes (pixels):

| Variant | Width | Use Case |
|---------|-------|----------|
| `xs` | 360 | Mobile thumbnails |
| `sm` | 720 | Mobile full-width |
| `md` | 1200 | Tablet / small desktop |
| `lg` | 2048 | Full desktop / retina |
| `original` | >2048 | Optional, hero images only |

**Avatar exception:** 50, 100, 200, 400 (smaller for profile images)

