# JSON Dual Handling Elimination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove dead camelCase read fallbacks, duplicate nullish chains, and accidental camelCase serialized JSON outputs from article, recipe, author, category, and settings JSON flows while preserving legitimate compatibility paths explicitly listed in the spec keep-list.

**Architecture:** Keep the repo contract unchanged: SQL columns, stored JSON, API request bodies, and API response JSON use `snake_case`; local React/TypeScript state may keep camelCase only when it is not serialized or treated as persisted JSON. The work is split by data surface so each phase can be tested independently and reviewed against the keep-list.

**Tech Stack:** Astro 6, React 19 admin SPA, TypeScript strict, Zod, Drizzle ORM, Vitest, pnpm

---

## Spec Review

The spec direction is correct and matches `docs/NAMING_CONTRACT.md`: remove dual JSON handling instead of widening compatibility. The main risk is under-scoping. Inspection found additional same-class issues not called out directly by the spec:

- `src/admin/components/BlockEditor/blocks/roundup-serialization.ts` has a duplicate `article_id` nullish chain and belongs with the B cleanup.
- `src/site/components/RecipePreviewCard.astro` still reads `cachedRating.ratingValue`; this is a read-side camel fallback and should be audited with cached rating consumers.
- `src/modules/settings/types/settings.types.ts` normalizes TOC camel aliases in addition to `src/admin/features/settings/pages/Settings.tsx`.
- `src/shared/utils/hydration.ts` emits camel convenience fields for SEO, category config, and recipe ingredients. Those fields are currently consumed by UI code, so this cannot be solved by only deleting fallbacks; consumers must migrate first.
- `src/modules/articles/utils/article-json-contract.ts` contains both dead read fallbacks and editor/migration compatibility paths. Treat it carefully: remove duplicated/wrong chains and stored JSON camel aliases, but keep intentional legacy migration helpers only where the plan explicitly says so.
- Category config in `src/modules/categories/api/helpers.ts` appears broader than `docs/CATEGORIES_TABLE_CONTRACT.md` describes. Preserve existing runtime behavior while moving keys to `snake_case`; do not expand the contract.

---

## File Map

### Modify

- `src/modules/articles/utils/cached-fields.ts` — remove duplicate `reading_time_minutes` chain.
- `src/admin/components/BlockEditor/blocks/adapters/RelatedContentAdapter.ts` — remove duplicate `article_id` fallback; keep only approved source fallback if required.
- `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx` — remove duplicate cached field chains.
- `src/admin/components/BlockEditor/blocks/roundup-serialization.ts` — remove duplicate `article_id` chain.
- `src/site/utils/recipe-render.ts` — read only canonical `recipe_json` snake_case fields.
- `src/site/components/RecipePreviewCard.astro` — remove `cached_rating_json.ratingValue` fallback if cached rating is canonical snake_case.
- `src/modules/articles/api/helpers.ts` — remove SEO camel alias reads from `normalizeSeoJson`; decide whether flat camel request fields are still an API compatibility surface before deleting them.
- `src/modules/authors/api/helpers.ts` — remove SEO camel alias reads and `sizeBytes` variant fallback; migrate response helper away from camel SEO JSON aliases.
- `src/modules/authors/types/authors.types.ts` — change flattened SEO bridge types/helpers from `metaTitle`/`metaDescription` to canonical `meta_title`/`meta_description` where values become serialized JSON.
- `src/admin/features/authors/pages/AuthorEditor.tsx` — send `seo_json` with snake_case keys only; stop loading `seo.metaTitle` and sibling aliases.
- `src/admin/features/authors/components/AuthorSidebar/SEOSection.tsx` — accept/use the updated snake_case SEO shape or keep camel local form fields with an explicit conversion only at submit.
- `src/modules/categories/api/helpers.ts` — remove SEO/image camel fallbacks and change category config normalized output to snake_case keys.
- `src/pages/categories/[slug].astro` — consume category config snake_case fields.
- `src/site/components/CategoryHeader.astro` — consume category config snake_case fields.
- `src/site/components/ArticleGrid.astro` — consume category config snake_case fields.
- `src/admin/features/settings/pages/Settings.tsx` — remove TOC camel alias reads from API response.
- `src/modules/settings/types/settings.types.ts` — remove `LegacyTocSettings` and camel alias fallback normalization.
- `src/shared/utils/hydration.ts` — read snake_case SEO/config fields and stop emitting camel-only JSON convenience fields where downstream consumers can use snake_case.
- `src/modules/articles/types/recipes.types.ts` — migrate `RecipeJson`, defaults, formatting, and migration output from `recipeYield`, `suitableForDiet`, `aggregateRating`, `isOptional`, etc. to canonical snake_case where it represents stored recipe JSON.
- `src/site/components/content/PrintRecipeOverlay.astro` — consume `is_optional`.
- `src/site/components/content/IngredientsSection.astro` — consume `is_optional`.
- `src/admin/components/RecipeBuilder.tsx` — consume and emit recipe JSON snake_case keys.
- `src/modules/articles/utils/article-json-contract.ts` — remove dead camel aliases from normalizers; keep only intentional legacy migration helpers if still used by editor loading and clearly named as migration.

### Verify Before Editing

- `src/shared/images/image-contract.ts` — keep approved editor-to-stored conversion arms from spec C.
- `src/modules/menus/**` — keep location fallback from spec C.
- `src/modules/settings/**` — keep `SETTINGS_CACHE ?? SESSION` from spec C if found.
- `src/pages/api/media/upload-variant.ts` and media upload helpers — do not touch transport-specific multipart camel fields unless a separate media plan asks for it.
- `docs/**` — do not edit contracts without explicit user permission; note stale examples separately.

### Tests / Search Targets

- Existing focused tests under `src/modules/articles/**/__tests__`, `src/shared/images/**/__tests__`, `src/admin/components/BlockEditor/**/__tests__`, and settings/category tests if present.
- Add regression tests next to touched normalizers when no focused test exists.
- Use `rg --pcre2` scans for the forbidden patterns listed in Task 8.

---

## Tasks

### Task 1: Baseline Audit And Keep-List

**Files:**
- Read: `docs/NAMING_CONTRACT.md`
- Read: `docs/ARTICLE_JSON_CONTRACTS.md`
- Read: `docs/RECIPE_JSON_CONTRACT.md`
- Read: `docs/CATEGORIES_TABLE_CONTRACT.md`
- Create temporary notes only if needed; do not commit notes.

- [ ] Run targeted scans:

```powershell
rg --pcre2 "\?\?\s*\w+\.\w*[A-Z]\w*" src
rg --pcre2 "\b(metaTitle|metaDescription|canonicalUrl|ogImage|ogTitle|ogDescription|twitterCard|noIndex)\b" src
rg --pcre2 "\b(recipeYield|recipeCategory|recipeCuisine|suitableForDiet|cookingMethod|estimatedCost|aggregateRating|ratingValue|ratingCount|isOptional)\b" src
rg --pcre2 "\b(postsPerPage|layoutMode|cardStyle|showSidebar|showPagination|featuredArticleId|showFeaturedRecipe|showHeroCta|heroCtaText|heroCtaLink)\b" src
```

- [ ] Classify each hit as one of: remove now, migrate output+consumer, approved keep-list, or unrelated local variable.
- [ ] Re-check the spec C keep-list before deleting any fallback.

**Commit:** none yet.

---

### Task 2: Remove Duplicate Nullish Chains

**Files:**
- Modify: `src/modules/articles/utils/cached-fields.ts`
- Modify: `src/admin/components/BlockEditor/blocks/adapters/RelatedContentAdapter.ts`
- Modify: `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx`
- Modify: `src/admin/components/BlockEditor/blocks/roundup-serialization.ts`

- [ ] Replace exact duplicates like `x ?? x` with a single canonical read.
- [ ] For related/roundup article references, keep only `article_id` plus an explicitly justified non-JSON UI fallback such as `id` if the UI object is not persisted JSON.
- [ ] Add or update a focused test if a touched adapter already has a nearby test.
- [ ] Verify:

```powershell
pnpm typecheck
pnpm test
pnpm check:boundaries
```

**Commit:** `fix: remove duplicate json fallback chains`

---

### Task 3: Remove Dead Read-Side Camel Fallbacks

**Files:**
- Modify: `src/site/utils/recipe-render.ts`
- Modify: `src/site/components/RecipePreviewCard.astro`
- Modify: `src/modules/articles/api/helpers.ts`
- Modify: `src/modules/authors/api/helpers.ts`
- Modify: `src/modules/categories/api/helpers.ts`
- Modify: `src/admin/features/settings/pages/Settings.tsx`
- Modify: `src/modules/settings/types/settings.types.ts`

- [ ] In render/read helpers, keep only snake_case JSON keys for `recipe_json`, `seo_json`, cached rating, TOC, and image variant `size_bytes`.
- [ ] In article/author/category API helpers, remove camel alias reads inside JSON object normalizers.
- [ ] Do not remove explicitly flat admin form fields unless they are serialized JSON fields; if a flat camel UI field remains, convert it once into snake_case at the API boundary.
- [ ] Remove `LegacyTocSettings` and camel TOC API response support.
- [ ] Add regression tests for `normalizeTocSettings`, SEO parsing, or recipe render normalization if nearby tests exist; otherwise add minimal tests for the highest-risk helper.
- [ ] Verify:

```powershell
pnpm typecheck
pnpm test
pnpm check:boundaries
```

**Commit:** `fix: remove dead camel json read fallbacks`

---

### Task 4: Migrate Author SEO Output To Snake Case

**Files:**
- Modify: `src/modules/authors/types/authors.types.ts`
- Modify: `src/admin/features/authors/pages/AuthorEditor.tsx`
- Modify: `src/admin/features/authors/components/AuthorSidebar/SEOSection.tsx`
- Inspect/modify: site author page consumers under `src/pages/authors/**` and `src/site/**author**`

- [ ] Decide the UI boundary: either make the author SEO form state snake_case or keep camel local state and convert once before writing `seo_json`.
- [ ] Ensure any `seo_json` produced by author admin contains only `meta_title`, `meta_description`, `canonical`, `og_image`, `og_title`, `og_description`, `twitter_card`, and `no_index`.
- [ ] Stop `seoJsonToFlat` from returning camel JSON aliases; if flat UI fields remain, name them as UI-only fields and never stringify them directly.
- [ ] Update author sidebar/page consumers to the chosen shape.
- [ ] Add a test or fixture proving `deprecated camel SEO input` is not read from `seo_json` after this change.
- [ ] Verify:

```powershell
pnpm typecheck
pnpm test
pnpm check:boundaries
```

**Commit:** `fix: write author seo json in snake case`

---

### Task 5: Migrate Recipe JSON Types And Consumers

**Files:**
- Modify: `src/modules/articles/types/recipes.types.ts`
- Modify: `src/shared/utils/hydration.ts`
- Modify: `src/modules/articles/utils/article-json-contract.ts`
- Modify: `src/admin/components/RecipeBuilder.tsx`
- Modify: `src/site/components/content/PrintRecipeOverlay.astro`
- Modify: `src/site/components/content/IngredientsSection.astro`
- Inspect/modify: recipe public components and JSON-LD generators that read `recipeYield`, `aggregateRating`, `isOptional`, or other camel recipe fields.

- [ ] Change stored `RecipeJson` interfaces/defaults to snake_case keys for recipe classification, diet, method/cost, aggregate rating, video upload/content/embed URLs, and ingredient `is_optional`.
- [ ] Update `formatIngredient`, `flattenIngredients`, and Schema.org output helpers to read snake_case stored keys and output Schema.org names only in JSON-LD objects.
- [ ] Update `RecipeBuilder.tsx` to emit snake_case recipe JSON. Keep any legacy migration function clearly named and isolated to editor load if still needed.
- [ ] Update hydration to avoid mapping stored `is_optional` back to `isOptional`.
- [ ] Update public components to consume `is_optional`.
- [ ] Remove camel read fallbacks from `normalizeRecipeJson` except explicitly named legacy migration helpers, if those helpers are still required for editor-only old drafts.
- [ ] Add tests for one recipe with camel aliases rejected/ignored and one canonical snake_case recipe rendering correctly.
- [ ] Verify:

```powershell
pnpm typecheck
pnpm test
pnpm check:boundaries
```

**Commit:** `fix: make recipe json snake case end to end`

---

### Task 6: Migrate Category Config Output And Consumers

**Files:**
- Modify: `src/modules/categories/api/helpers.ts`
- Modify: `src/shared/utils/hydration.ts`
- Modify: `src/pages/categories/[slug].astro`
- Modify: `src/site/components/CategoryHeader.astro`
- Modify: `src/site/components/ArticleGrid.astro`
- Inspect/modify: category admin/editor consumers under `src/admin/features/categories/**`

- [ ] Change category config normalized output from `postsPerPage`, `layoutMode`, `featuredArticleId`, `showFeaturedRecipe`, `showHeroCta`, etc. to `posts_per_page`, `layout_mode`, `featured_article_id`, `show_featured_recipe`, `show_hero_cta`, etc.
- [ ] Keep the current behavior and defaults; do not add config fields beyond what existing code already uses.
- [ ] Update site category page/components to read the snake_case config/hydrated fields.
- [ ] Remove camel fallback reads from category SEO/image/config normalizers except approved keep-list items.
- [ ] Add or update category helper tests proving snake_case config is emitted and camel aliases are not accepted from stored JSON.
- [ ] Verify:

```powershell
pnpm typecheck
pnpm test
pnpm check:boundaries
```

**Commit:** `fix: make category config json snake case`

---

### Task 7: Guard Approved Keep-List

**Files:**
- Inspect only unless a regression is found:
  - `src/shared/images/image-contract.ts`
  - `src/modules/menus/**`
  - `src/modules/settings/**`
  - `src/admin/features/templates/**`
  - `src/modules/content-blocks/**`

- [ ] Confirm these remain intact where applicable:
  - `images.thumbnail ?? images.hero`
  - image variant fallback order
  - `SETTINGS_CACHE ?? SESSION`
  - `upload_key ?? r2_key`
  - menu location fallback
  - cache-builder category id fallback
  - TemplateEditor width/height UI fallback
  - editor-to-stored conversion arms for content blocks and image contracts
- [ ] If a scan flags these patterns, document them in code review notes rather than deleting them.

**Commit:** include with previous task only if no code changes; otherwise `test: document json fallback keep list`.

---

### Task 8: Final Audit And Verification

**Files:**
- All touched files.

- [ ] Run forbidden-pattern scans and manually classify any remaining hits:

```powershell
rg --pcre2 "\?\?\s*\w+\.\w*[A-Z]\w*" src
rg --pcre2 "\b(metaTitle|metaDescription|canonicalUrl|ogImage|ogTitle|ogDescription|twitterCard|noIndex)\b" src
rg --pcre2 "\b(recipeYield|recipeCategory|recipeCuisine|suitableForDiet|cookingMethod|estimatedCost|aggregateRating|ratingValue|ratingCount|isOptional)\b" src
rg --pcre2 "\b(postsPerPage|layoutMode|cardStyle|showSidebar|showPagination|featuredArticleId|showFeaturedRecipe|showHeroCta|heroCtaText|heroCtaLink)\b" src
```

- [ ] Confirm remaining camel hits are local UI state, third-party Schema.org output names, or spec C keep-list items.
- [ ] Run full allowed verification:

```powershell
pnpm typecheck
pnpm test
pnpm check:boundaries
```

- [ ] Do not run `pnpm build` unless the user explicitly approves.
- [ ] Prepare a short review note listing remaining intentional camelCase local variables and keep-list exceptions.

**Commit:** `test: verify json snake case cleanup`

---

## Execution Notes

- Keep changes surgical. Do not rename unrelated local variables just because they are camelCase.
- Do not edit `docs/` contracts in this implementation. If stale docs/examples are found, report them separately.
- Prefer tests at the contract boundary: parser/helper input-output tests are higher value than snapshot churn.
- If a type migration touches many public recipe components, finish the whole recipe phase before running broad cleanup scans; partial casing changes will produce noisy type errors.
