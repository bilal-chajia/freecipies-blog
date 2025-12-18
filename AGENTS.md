# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
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
// ─────────────────────────────────────────────────────────────────────
// LISTING PAGES (Minimal fields for cards)
// ─────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────
// ARTICLE PAGE (Full data)
// ─────────────────────────────────────────────────────────────────────
const article = await db
  .select()
  .from(articles)
  .where(eq(articles.slug, slug))
  .get();

// ─────────────────────────────────────────────────────────────────────
// FILTERED RECIPES (By time, difficulty)
// ─────────────────────────────────────────────────────────────────────
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
| **Media** | `image`, `gallery`, `video` |
| **Callouts** | `tip_box`, `cta_button` |
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

