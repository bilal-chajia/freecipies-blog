# List-API & Hydrate snake_case Data-Key Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every camelCase data-key emitted by the article/list pipeline so serialized + in-process data keys are `snake_case` end to end, per `docs/NAMING_CONTRACT.md`.

**Architecture:** The single source of the camelCase aliases is `hydrateArticle` in `src/shared/utils/hydration.ts`. SSR `.astro` pages call `getArticles`/`getArticleBySlug` directly and read the hydrated object's props in-process; the admin SPA reads the same hydrated shape over `/api/articles`. We consolidate author/category data onto the **already-snake-compliant nested objects** (`article.author{}`, `article.category{}`) and delete the flat camelCase duplicates. Pagination shape (`totalPages`/`hasMore`) is renamed to `total_pages`/`has_more` everywhere. Each key-family is migrated end-to-end (source → every consumer) in one atomic phase so no consumer is left reading a removed key.

**Tech Stack:** Astro 6 SSR, React 19 admin SPA, TypeScript strict, Vitest, Drizzle/D1.

---

## Decisions (locked, from requirements gathering)

- **Author/Category:** keep nested `article.author{ name, slug, role, job_title, avatar, bio, social_links }` and `article.category{ label, color, slug }` (snake, already compliant). **Delete** the flat aliases `authorName`, `authorSlug`, `authorRole`, `authorJob`/`authorAvatar`, `categoryLabel`, `categoryColor`, `categorySlug`, and the `label`(=headline) alias. Migrate every read site to the nested object.
- **Pagination:** `totalPages` → `total_pages`, `hasMore` → `has_more`, everywhere (forced by contract).
- **Dead list endpoints** (`/api/roundups`, `/api/recipes`, `/api/content` GET): migrate them too (snake keys), do not delete.
- **Component prop names** (e.g. `RecipeAuthorCard`'s `authorName=` prop, `Pagination.astro`'s `totalPages` prop): **out of scope** — those are component contracts, not serialized/stored data keys. Only the *data-source reads* feeding them change.

## Explicitly OUT of scope (do not touch — documented to prevent false "you missed these")

- `src/admin/components/BlockEditor/utils/blockHelpers.ts` & `editorStateManager.helpers.ts` `itemCount` — local function params for block labels ("List (3 items)"), not the roundup data key. Contract permits camelCase locals.
- `src/modules/articles/services/cache-builders.ts` `AuthorCacheInput`/`CategoryCacheInput` camelCase fields, and the matching SQL-select aliases in `syncCachedFields` (`articles.service.ts:584-597`). These are transient builder *inputs*; their **outputs** (`cached_*_json`) are already snake. Nothing camelCase is stored or serialized from this chain.
- `getArticleById` SQL-select aliases (`articles.service.ts:457-462`: `categoryLabel`, `authorName`, `authorImagesJson`, …). These are *inputs* to `hydrateArticle`; after Phase 2 they are destructured out of the hydrate output and never serialized. Leaving them avoids churn. (They are read by name inside hydrate — keep the names in sync with hydrate's input destructure.)

## Deferred to follow-up plans (hydrate-produced camelCase, but not part of the named list-key surface)

These are real but separable key-families. Migrating the author/category/pagination families end-to-end is complete on its own; these are tracked as their own future plans to keep this change reviewable:

- **Image aliases** from `extractImage` / `ExtractedImage`: `imageAlt`, `imageWidth`, `imageHeight`, `imageAspectRatio`, `imageObjectPosition`, `imageStyle` (spread into hydrate output; `image_url` is already snake). Consumed widely as local vars (fine) and as `article.imageAlt` (violation).
- **SEO aliases** from `extractSeo` / `ExtractedSeo`: `metaTitle`, `metaDescription`, `ogImage` (spread into hydrate + hydrateAuthor output; `canonical` already snake).

Create `docs/superpowers/plans/2026-06-1x-hydrate-image-seo-snakecase.md` for these after this plan lands.

---

## Phase 0: Branch + baseline

**Files:** none (setup)

- [ ] **Step 1: Create a feature branch**

```bash
git checkout -b refactor/list-api-snakecase
```

- [ ] **Step 2: Capture green baseline**

Run: `pnpm test`
Expected: PASS (record the count, e.g. "240 passed").

Run: `pnpm check:boundaries`
Expected: PASS (0 violations).

Run: `npx astro check` (project typecheck; if a `typecheck` script exists prefer `pnpm typecheck`)
Expected: 0 errors. Record the number — it is the gate for every later phase.

---

## Phase 1: Pagination shape → `total_pages` / `has_more`

This family is independent of the author/category work; land it first.

**Files:**
- Modify: `src/shared/utils/error-handler.ts:88-98` (the `formatSuccessResponse` pagination option type)
- Modify: `src/shared/types/api.types.ts:9-18` (`PaginatedResponse`)
- Modify: `src/pages/api/articles/index.ts:57`
- Modify: `src/pages/api/recipes/index.ts:107-108`
- Modify: `src/pages/api/roundups/index.ts:103-104`
- Modify: `src/pages/api/content/index.ts:141-142`
- Modify: `src/pages/api/media/index.ts` (grep `totalPages`/`hasMore` in-file)
- Modify: `src/admin/store/useStore.ts` (pagination state field + setters + initial value)
- Modify: `src/admin/components/shared/ContentListBase.tsx:197-198,597`
- Modify: `src/admin/features/media/pages/MediaLibrary.tsx`, `src/admin/features/media/hooks/useMediaAssets.ts`
- Inspect (data-read vs prop): `src/site/components/Pagination.astro`, `src/site/components/WebStoryViewer.astro`, `src/pages/recipes/index.astro`, `src/pages/roundups/index.astro`

- [ ] **Step 1: Rename the response/type contract**

In `error-handler.ts`, the `formatSuccessResponse` `pagination` option object: rename property `totalPages` → `total_pages`.

```ts
    pagination?: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
```

In `api.types.ts`:

```ts
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

- [ ] **Step 2: Rename at every endpoint that builds a pagination object**

At each endpoint listed above, in the `pagination: { … }` literal: `totalPages:` → `total_pages:` and `hasMore:` → `has_more:`. Example (`articles/index.ts`):

```ts
      pagination: {
        page,
        limit,
        total: articles.total,
        total_pages: Math.ceil(articles.total / limit)
      },
```

For `recipes`/`roundups`/`content`/`media` also rename the `hasMore: page * limit < result.total` line to `has_more: …`.

- [ ] **Step 3: Rename admin store + consumers**

In `useStore.ts`: the articles (and media, if separate) `pagination` slice — rename the `totalPages` field to `total_pages` in the type, initial state, and any `setPagination` merge logic.

In `ContentListBase.tsx`: `paginationData.totalPages` → `paginationData.total_pages` (read at ~line 197), `setPagination({ total: …, totalPages: … })` → `total_pages:`, and `pageCount={pagination.totalPages}` → `pageCount={pagination.total_pages}` (~line 597). Note: `DataTable`'s `pageCount` prop name stays — only the value source changes.

In `MediaLibrary.tsx` / `useMediaAssets.ts`: grep `totalPages`/`hasMore`; rename data-shape reads/writes to `total_pages`/`has_more`. Leave any DataTable/component prop *names* unchanged.

- [ ] **Step 4: Update SSR data-reads (keep component prop names)**

In `Pagination.astro` / `WebStoryViewer.astro` / `recipes/index.astro` / `roundups/index.astro`: if `totalPages`/`hasMore` is a **component prop name**, leave it. If it is a **read of API/`getArticles` pagination data** (e.g. `data.pagination.totalPages`), rename the read to `total_pages`/`has_more`. Decide per occurrence from context.

- [ ] **Step 5: Verify**

Run: `npx astro check` → 0 errors (a missed read site surfaces as a TS error on the renamed property).
Run: `pnpm test` → baseline count.
Run: `pnpm check:boundaries` → 0.

- [ ] **Step 6: Manual save→reload check (user-driven)**

Admin → any content list (Articles): pagination control still shows correct page count and paginates. Media library paginates. (PAUSE for user verification per working style.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(api): rename pagination keys totalPages/hasMore -> total_pages/has_more"
```

---

## Phase 2: Drop flat author/category aliases; consolidate on nested snake objects

The atomic core. Changing `hydrateArticle` breaks every consumer at compile time at once; fix them all, then verify, then commit.

### Task 2.1: Redesign `hydrateArticle` output

**Files:**
- Modify: `src/shared/utils/hydration.ts:230-346`
- Test: `src/shared/utils/__tests__/hydration.test.ts`

- [ ] **Step 1: Update the test first to assert the new shape**

In `hydration.test.ts`, for the `hydrateArticle` cases: replace assertions on flat aliases with nested assertions. Add/keep:

```ts
// nested objects are the single source of author/category data
expect(result.category).toEqual({ label: 'Desserts', color: '#ff6600', slug: 'desserts' });
expect(result.author?.name).toBe('Jane Doe');
expect(result.author?.slug).toBe('jane-doe');
expect(result.author?.role).toBe('Pastry Chef');
// flat camelCase aliases are gone
expect((result as Record<string, unknown>).categoryLabel).toBeUndefined();
expect((result as Record<string, unknown>).authorName).toBeUndefined();
expect((result as Record<string, unknown>).label).toBeUndefined();
```

Keep any existing assertions for `route`, `recipe_json`, `content_json`, `image_url`. (Leave `imageAlt`/`metaTitle` assertions as-is — deferred families.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shared/utils/__tests__/hydration.test.ts`
Expected: FAIL (flat aliases still present / nested fallback not populated on join path).

- [ ] **Step 3: Rewrite `hydrateArticle`**

Destructure the camelCase **join inputs** out of the spread so they never leak to output, keep them as locals to populate the nested objects when `cached_*_json` is absent (the admin `getArticleById` join path), and remove all flat-alias output spreads + the `label` alias.

```ts
export function hydrateArticle<T extends {
  images_json?: string | null;
  content_json?: string | null;
  recipe_json?: string | null;
  roundup_json?: string | null;
  faqs_json?: string | null;
  seo_json?: string | null;
  authorImagesJson?: string | null;
  cached_author_json?: string | null;
  cached_category_json?: string | null;
  cached_tags_json?: string | null;
  headline?: string;
  slug: string;
  type?: string;
  author?: { images_json?: string | null; name?: string | null; slug?: string | null; job_title?: string | null } | null;
  authorName?: string | null;   // join input (admin getArticleById) — consumed, not re-emitted
  authorSlug?: string | null;
  authorJob?: string | null;
  category?: { label?: string | null; color?: string | null; slug?: string | null } | null;
  categoryLabel?: string | null; // join input — consumed, not re-emitted
  categoryColor?: string | null;
  categorySlug?: string | null;
}>(article: T) {
  // Strip camelCase join inputs from the spread so they are never serialized.
  const {
    authorName: _authorName,
    authorSlug: _authorSlug,
    authorJob: _authorJob,
    categoryLabel: _categoryLabel,
    categoryColor: _categoryColor,
    categorySlug: _categorySlug,
    authorImagesJson: _authorImagesJson,
    ...articleRest
  } = article;

  const image = extractImage(article.images_json);

  const cachedAuthor = article.cached_author_json
    ? safeParseJson<any>(article.cached_author_json)
    : null;
  const cachedCategory = article.cached_category_json
    ? safeParseJson<any>(article.cached_category_json)
    : null;

  // Resolve author avatar URL (cards consume a URL; the slot stays in author.avatar)
  let authorAvatar = extractImage(article.authorImagesJson, 'avatar').image_url;
  if (!authorAvatar && cachedAuthor) {
    const avatarSlot = cachedAuthor?.avatar;
    if (typeof avatarSlot === 'string') {
      authorAvatar = avatarSlot;
    } else if (avatarSlot && typeof avatarSlot === 'object') {
      authorAvatar = resolveVariantUrl(avatarSlot.variants?.sm)
        || resolveVariantUrl(avatarSlot.variants?.xs)
        || (avatarSlot as any).url
        || null;
    }
  }
  if (!authorAvatar && article.author?.images_json) {
    authorAvatar = extractImage(article.author.images_json, 'avatar').image_url;
  }

  const authorName = _authorName ?? cachedAuthor?.name ?? article.author?.name;
  const authorSlug = _authorSlug ?? cachedAuthor?.slug ?? article.author?.slug;
  const authorRole = _authorJob ?? cachedAuthor?.job_title ?? cachedAuthor?.role ?? article.author?.job_title;

  const categoryLabel = _categoryLabel ?? cachedCategory?.label ?? article.category?.label;
  const categoryColor = _categoryColor ?? cachedCategory?.color ?? article.category?.color;
  const categorySlug = _categorySlug ?? cachedCategory?.slug ?? article.category?.slug;

  const tags = article.cached_tags_json
    ? safeParseJson<any[]>(article.cached_tags_json) || []
    : [];

  const seo = extractSeo(article.seo_json);
  const route = article.type === 'recipe'
    ? `/recipes/${article.slug}`
    : article.type === 'roundup'
      ? `/roundups/${article.slug}`
      : `/articles/${article.slug}`;

  // Nested objects are the single source of author/category data (snake-compliant).
  const author = (cachedAuthor || authorName || authorSlug || authorRole || authorAvatar)
    ? {
        ...(cachedAuthor ?? {}),
        name: authorName ?? null,
        slug: authorSlug ?? null,
        role: authorRole ?? null,
        job_title: authorRole ?? cachedAuthor?.job_title ?? null,
        avatar: cachedAuthor?.avatar ?? null,
        avatar_url: authorAvatar ?? null,
      }
    : null;

  const category = (cachedCategory || categoryLabel || categoryColor || categorySlug)
    ? {
        ...(cachedCategory ?? {}),
        label: categoryLabel ?? null,
        color: categoryColor ?? null,
        slug: categorySlug ?? null,
      }
    : null;

  return {
    ...articleRest,
    ...image,
    ...seo,
    content_json: safeParseJson(article.content_json),
    recipe_json: extractRecipe(article.recipe_json),
    recipe: extractRecipe(article.recipe_json), // Alias for RecipeContent.recipe
    roundup_json: safeParseJson(article.roundup_json),
    faqs_json: safeParseJson(article.faqs_json),
    route,
    author,
    category,
    tags,
  };
}
```

Notes:
- `avatar_url` (snake) is the resolved-URL convenience for card consumers; `avatar` keeps the slot object for srcset consumers. No flat `authorAvatar`/`label`/`category*`/`author*` keys remain.
- The `headline` field survives via `...articleRest` (the DB column). UI that used `label` switches to `headline`.

- [ ] **Step 4: Run hydration test to verify pass**

Run: `npx vitest run src/shared/utils/__tests__/hydration.test.ts`
Expected: PASS.

### Task 2.2: Update SSR layouts (×3)

**Files:** `src/site/layouts/ArticleLayout.astro`, `src/site/layouts/RecipeLayout.astro`, `src/site/layouts/RoundupLayout.astro`

Apply this mapping to **reads of the hydrated article** (`article.*` / `recipe.*`). Leave local-var names and component prop names (`authorName={…}`) unchanged — only change the value source.

| Old read | New read |
| --- | --- |
| `article.categoryLabel` / `recipe.categoryLabel` | `article.category?.label` / `recipe.category?.label` |
| `article.categorySlug` / `recipe.categorySlug` | `article.category?.slug` / `recipe.category?.slug` |
| `article.categoryColor` | `article.category?.color` |
| `article.authorName` / `recipe.authorName` | `article.author?.name` / `recipe.author?.name` |

The `const author = recipe.author` / `const category = recipe.category` destructures (in the slug pages) are unaffected — they already use the nested objects.

- [ ] **Step 1:** `RecipeLayout.astro` — badge label (~lines 147-153): `recipe.categoryLabel` → `recipe.category?.label`; `recipe.categorySlug` → `recipe.category?.slug`. Author byline (~line 187): `recipe.authorName` → `recipe.author?.name`.
- [ ] **Step 2:** `ArticleLayout.astro` — lines 131-137,156: same mapping.
- [ ] **Step 3:** `RoundupLayout.astro` — lines 104-110,129: same mapping.

### Task 2.3: Update site components + SSR pages

**Files & exact edits:**

- [ ] **Step 1:** `src/site/components/ArticleCard.astro`
  - Line 48: `const authorLabel = article.authorName || article.authorSlug || "Unknown";` → `article.author?.name || article.author?.slug || "Unknown"`
  - Line 171: `article.categoryColor` → `article.category?.color` (both occurrences)
  - Line 173: `article.categoryLabel || article.categorySlug?.replace(...)` → `article.category?.label || article.category?.slug?.replace(...)`

- [ ] **Step 2:** `src/site/components/PopularRecipes.astro`
  - Lines 41,46: `recipe.categoryLabel` → `recipe.category?.label`. (Confirm the `recipe` here is a hydrated article; if it comes from `getPopularRecipes` site-data presenter, see Task 3 — adjust to whatever that presenter exposes.)

- [ ] **Step 3:** `src/site/components/CategoryHeader.astro`
  - Line 49: `featuredArticle?.authorName || featuredArticle?.authorSlug` → `featuredArticle?.author?.name || featuredArticle?.author?.slug`
  - Line 54: `featuredArticle?.authorAvatar` → `featuredArticle?.author?.avatar_url`

- [ ] **Step 4:** `src/pages/index.astro`
  - Lines 125,127,174-175,220-222,230-235,389-391: `recipe.categoryLabel` → `recipe.category?.label`; `recipe.categorySlug` → `recipe.category?.slug` (the `getCategoryColor(recipe.categorySlug)` calls and `/categories/${recipe.categorySlug}` hrefs). Leave the local `authorName`/`authorSlug` at lines 314-316 (built from `featuredAuthor`, not the hydrated article) unchanged.

- [ ] **Step 5:** `src/pages/recipes/index.astro`
  - Line 265: `getBadgeColors(recipe.categoryColor)` → `recipe.category?.color`
  - Line 300: `recipe.categoryLabel` → `recipe.category?.label`
  - (Line 37 `categorySlug:` is a `getArticles` *query option* key — leave it; that is the service input API, not hydrate output.)

- [ ] **Step 6:** `src/pages/my-bookmarks.astro`
  - Lines 111-112: `article.categoryLabel || cachedCategory.label` → `article.category?.label || cachedCategory.label`; `article.categoryColor || cachedCategory.color` → `article.category?.color || cachedCategory.color`. (Local vars `categoryLabel`/`categoryColor` keep their names.)

- [ ] **Step 7:** `src/pages/api/preview/render.astro` (lines 103-115) — build nested objects to match the new hydrate shape instead of flat keys:

```ts
    category: (category || formData.categoryLabel) ? {
      label: category?.label ?? formData.categoryLabel ?? null,
      slug: category?.slug ?? formData.categorySlug ?? null,
      color: category?.color ?? formData.categoryColor ?? null,
    } : null,
    author: (author || formData.authorName) ? {
      name: author?.name ?? formData.authorName ?? null,
      slug: author?.slug ?? formData.authorSlug ?? null,
    } : null,
```

Remove the old flat `categoryLabel`/`categorySlug`/`authorName` output keys. (Leave `metaTitle`/`metaDescription` here — deferred SEO family. `formData.*` are admin-form fields, out of scope.)

### Task 2.4: Update admin consumers

**Files:** `src/admin/components/shared/ContentListBase.tsx`, `src/admin/features/dashboard/pages/Dashboard.tsx`

- [ ] **Step 1:** `ContentListBase.tsx`
  - `ContentListItem` type (lines 47-63): remove `categoryLabel`, `authorName`, `authorAvatar`, and `label` (replace `label` usage with `headline`); add `category?: { label?: string; color?: string; slug?: string }` and `author?: { name?: string; slug?: string; avatar?: unknown; avatar_url?: string }`.
  - Line 317 `item.imageAlt || item.label || item.headline` → keep `item.imageAlt` (deferred image family — leave), `item.label` → `item.headline`.
  - Lines 344 `{item.label}` → `{item.headline}`.
  - Line 348 `{item.categoryLabel}` → `{item.category?.label}`.
  - Lines 369 `toAdminImageUrl(item.authorAvatar)` → `toAdminImageUrl(item.author?.avatar_url)`.
  - Lines 371,374 `item.authorName` → `item.author?.name`.

- [ ] **Step 2:** `Dashboard.tsx`
  - Type (line 46) `categoryLabel?: string;` → `category?: { label?: string };`
  - Lines 399,460 `article.categoryLabel` → `article.category?.label`.

### Task 2.5: Update related-content + dead list endpoints (same hydrate keys)

**Files:** `src/admin/components/BlockEditor/components/block-settings/RelatedContentSettings.tsx`, `src/pages/api/roundups/index.ts`, `src/pages/api/recipes/index.ts`, `src/pages/api/content/index.ts`

- [ ] **Step 1:** `RelatedContentSettings.tsx:163` — drop the removed flat alias from the fallback chain:

```ts
categoryName: item.category?.label || item.categoryName || null,
```

(Remove `item.categoryLabel ||`. Keep `item.categoryName` — that is this component's own prop, not a hydrate key.) Also remove the now-dead `categoryLabel?` from its local item type (line 34) if present.

- [ ] **Step 2:** `roundups/index.ts` (lines 80-94) — rebuild the card object with snake keys sourced from nested objects:

```ts
            return {
                id: article.id,
                slug: article.slug,
                headline: article.headline,
                short_description: article.short_description,
                thumbnail,
                category: articleData.category ?? null,
                author: articleData.author ?? null,
                published_at: article.published_at,
                item_count: itemCount,
            };
```

Rename the local `itemCount` → keep local name, but the **output key** is `item_count`.

- [ ] **Step 3:** `recipes/index.ts` (lines 79-98) — same treatment: replace `categoryLabel/categorySlug/categoryColor/authorName/authorSlug` output keys with `category: article.category ?? null, author: article.author ?? null`. Rename recipe-specific output keys that are camelCase: `totalTime`→`total_time`, `prepTime`→`prep_time`, `cookTime`→`cook_time` (these are this endpoint's own derived keys; snake per contract). `difficulty`/`servings`/`rating` already snake-or-single-word.

- [ ] **Step 4:** `content/index.ts` (lines 116-132) — replace the flat `categoryLabel/...authorSlug` output keys with `category: articleData.category ?? null, author: articleData.author ?? null`.

### Task 2.6: Verify + commit Phase 2

- [ ] **Step 1:** Run: `npx astro check` → 0 errors. Any remaining `.categoryLabel`/`.authorName`/`.label` read on a hydrated object surfaces here.
- [ ] **Step 2:** Run: `pnpm test` → baseline count (hydration test updated).
- [ ] **Step 3:** Run: `pnpm check:boundaries` → 0.
- [ ] **Step 4:** Grep guard — expect **no** hydrate-output reads remain:

Run: `rg "\.(categoryLabel|categoryColor|categorySlug|authorName|authorSlug|authorRole|authorAvatar)\b" src` 
Expected: only the intentionally-excluded sites (cache-builders inputs, `getArticleById`/`syncCachedFields` SQL aliases, `getArticles` query-option `categorySlug`/`authorSlug` inputs, templates Task 5 if not yet done, `RecipeAuthorCard` prop names).

- [ ] **Step 5: Manual save→reload check (user-driven, PAUSE):**
  - Public: recipe page, article page, roundup page, home, `/recipes`, category page, bookmarks — category badge + author byline + avatar all render.
  - Admin: Articles/Recipes/Roundups lists show category + author + avatar columns; Dashboard recent list shows category.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(hydration): drop flat author/category camelCase aliases; consolidate on nested snake objects"
```

---

## Phase 3: `getPopularArticles` + `/api/stats/popular` snake fix

Fixes a live bug: `popular.ts` already reads `a.category_label`/`a.category_slug` (snake) but the service aliases them camelCase → currently always `undefined`.

**Files:** `src/modules/articles/services/articles.service.ts:716-740`, `src/pages/api/stats/popular.ts`, consumer of `dashboardAPI.getPopularArticles` (grep result: Dashboard popular widget).

- [ ] **Step 1:** `getPopularArticles` select (lines 730-731): `categoryLabel: categories.label` → `category_label: categories.label`; `categorySlug: categories.slug` → `category_slug: categories.slug`. (`label: articles.headline` stays.)

- [ ] **Step 2:** `popular.ts` (lines 45-47): the reads `a.category_label`/`a.category_slug` now resolve. Rename the **output** key `categorySlug` → `category_slug` (line 47). `category` and `title` stay.

```ts
            return {
                id: a.id,
                slug: a.slug,
                title: a.label,
                type: a.type,
                image_url,
                views: a.view_count || 0,
                category: a.category_label,
                category_slug: a.category_slug,
            };
```

- [ ] **Step 3:** Update the popular-widget consumer: `rg "categorySlug" src/admin/features/dashboard` (and anywhere reading the popular response). Rename the read `.categorySlug` → `.category_slug`. (If no consumer reads it, note that.)

- [ ] **Step 4:** Verify: `npx astro check` → 0; `pnpm test` → baseline; `pnpm check:boundaries` → 0.

- [ ] **Step 5: Manual check (PAUSE):** Admin Dashboard "popular" widget renders category labels (previously blank due to the bug).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(stats): align getPopularArticles aliases to snake_case (category was always undefined)"
```

---

## Phase 4: Templates data-binding paths

The resolver (`getValue` in `dataBinding.ts`) already supports nested dot-paths, so this is a path-string + type rename only.

**Files:** `src/modules/templates/utils/dataBinding.ts`, `src/modules/templates/utils/placeholders.ts`, `src/modules/templates/types/templates.types.ts`

- [ ] **Step 1:** `dataBinding.ts` `DATA_FIELD_SUGGESTIONS` (lines 13-14): `path: 'categoryLabel'` → `path: 'category.label'`; `path: 'authorName'` → `path: 'author.name'`.

- [ ] **Step 2:** `placeholders.ts` (lines 47-48): `'{{article.categoryLabel}}'` → `'{{article.category.label}}'`; `'{{article.authorName}}'` → `'{{article.author.name}}'`. (Check the placeholder→binding substitution code resolves these identically via `getValue`; the nested path works.)

- [ ] **Step 3:** `templates.types.ts` (lines 51-52): the article-data type used for binding — replace `categoryLabel?: string; authorName?: string;` with nested `category?: { label?: string; slug?: string; color?: string }; author?: { name?: string; slug?: string };` (match what the template canvas actually reads; if the canvas reads these via `getValue` path strings only, the type just needs to allow the nested shape).

- [ ] **Step 4:** Verify: `npx astro check` → 0; `pnpm test` → baseline; `pnpm check:boundaries` → 0.

- [ ] **Step 5: Manual check (PAUSE):** Template editor — bind a text element to "Category"/"Author Name"; preview renders the value (not blank). Existing saved templates referencing the old paths: confirm acceptable or add a one-time path migration note (templates store the path string; old `categoryLabel` paths would resolve to `undefined` after this — flag to user whether a data migration of stored templates is needed).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(templates): point data-binding paths at nested snake objects"
```

---

## Final Verification

- [ ] `pnpm test` → baseline count, all green.
- [ ] `pnpm check:boundaries` → 0.
- [ ] `npx astro check` → 0 errors.
- [ ] `rg "(totalPages|hasMore)" src` → no hits in app code (only deferred/external if any).
- [ ] `rg "\.(categoryLabel|authorName|authorAvatar)\b" src` → only the documented OUT-of-scope sites.
- [ ] Update `docs/NAMING_CONTRACT.md` "Migration status" line? **No** — contract edits require explicit permission (CLAUDE.md hard rule). Instead, note completion in the handoff and ask the user before touching `docs/`.
- [ ] Create the follow-up plan stub for the deferred image/seo alias families.

## Self-Review notes (author → reviewer)

- **Spec coverage:** pagination (`totalPages`/`hasMore`) ✓ Phase 1; `categoryLabel`/`categorySlug`/`categoryColor`/`authorName`/`authorSlug` ✓ Phase 2; `itemCount` (roundups endpoint) ✓ Task 2.5 (`item_count`); dead endpoints ✓ Task 2.5; popular bug ✓ Phase 3; templates ✓ Phase 4.
- **Population guarantee:** Task 2.1 builds nested objects from the join inputs (`_categoryLabel` etc.) when `cached_*_json` is null, so the admin `getArticleById` path keeps data parity with the old flat aliases.
- **Deferred, not dropped:** image (`imageAlt`…) and SEO (`metaTitle`…) camelCase families remain after this plan — each is internally consistent (migrated nowhere, read everywhere as before), so no half-migrated key. Tracked as a follow-up plan.
- **Risk:** stored templates referencing old binding paths (`categoryLabel`) resolve to `undefined` post-Phase-4 — surfaced to user in Task 4 Step 5.
