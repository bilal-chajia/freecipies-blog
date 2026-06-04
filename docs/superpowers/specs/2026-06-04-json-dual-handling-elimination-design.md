# Design — Eliminate residual JSON dual-handling (camelCase fallbacks)

**Date:** 2026-06-04
**Branch:** `migrate/recipe-equipment-canonical`
**Status:** Approved design — ready for implementation planning.
**Related:** `docs/NAMING_CONTRACT.md`, `.hermes/plans/2026-06-03_contract-audit-report.md` (#3),
`docs/superpowers/specs/2026-06-04-snake-case-all-resources-design.md`.

## Problem

The snake_case resource migration renamed Drizzle fields and direct row reads, but left widespread
`snake ?? camel` dual-handling in JSON-blob normalizers, serializers, and consumers. A blind
find-replace also snake-ified both sides of some pairs, producing dead `x ?? x` duplicates. The
`NAMING_CONTRACT` now states camelCase data keys are no longer tolerated and the audit confirms
stored blobs are already snake_case — so these fallbacks are dead code (or bugs), except a set of
legitimate non-casing fallbacks that must stay.

## Goal

Remove every camelCase dual-handling seam for app-owned JSON data keys (read AND write/output
sides), fix the `x ?? x` duplicate bugs, and keep the legitimate alternative-key fallbacks — so a
single repository scan for `snake ?? camel` returns only the documented keep-list.

## Categories (classification drives the work)

- **A — dead read-side camelCase fallbacks** (output already snake): the `?? *Camel` arm reads a
  casing that no longer exists in stored/incoming data. Remove the camelCase arm.
- **A′ — camelCase OUTPUT sites + their consumers**: code that *builds* a camelCase object
  (`metaTitle`, `isOptional`, category config) consumed downstream still in camelCase. Migrate the
  output shape to snake_case AND its consumers (types, site components, admin editors).
- **B — duplicate-key bugs** (`x ?? x`, same key both sides): pure dead redundancy from the
  mechanical migration. Collapse to a single read.
- **C — legitimate alternative-key fallbacks** (NOT casing): keep. Maintain an explicit keep-list.

## Scope (full: A + A′ + B; keep C)

### B — duplicate `x ?? x` bugs (collapse)
- `src/modules/articles/utils/cached-fields.ts:106` — `reading_time_minutes ?? reading_time_minutes`
- `src/admin/components/BlockEditor/blocks/adapters/RelatedContentAdapter.ts:61` —
  `item.article_id ?? item.article_id ?? item.id`
- `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx:149-155` —
  5× `item.cached_*_json ?? item.cached_*_json`

### A — dead read-side camelCase fallbacks (remove the camel arm; output stays snake)
- `src/site/utils/recipe-render.ts` — recipe_json read: `aggregate_rating ?? aggregateRating`,
  `recipe_yield ?? recipeYield`, full nutrition block (`total_fat_g ?? totalFat ?? fatContent`…),
  video (`content_url ?? contentUrl`…), rating (`rating_value ?? ratingValue`…)
- `src/modules/articles/api/helpers.ts:44-51` — incoming SEO normalize `meta_title ?? metaTitle`, …
- `src/modules/authors/api/helpers.ts:103-110,136-137` — SEO + `size_bytes ?? sizeBytes`
- `src/modules/categories/api/helpers.ts:71-72,114-121` — SEO + `size_bytes ?? sizeBytes`
- `src/admin/features/settings/pages/Settings.tsx:325-328` — TOC `default_open ?? defaultOpen`,
  `show_jump_button ?? showJumpButton`, `accent_color ?? accentColor`, `max_depth ?? maxDepth`
- `src/shared/utils/hydration.ts` and `src/modules/articles/utils/article-json-contract.ts` —
  `is_optional ?? isOptional` read arms (see A′ for the output side)

### A′ — camelCase OUTPUT chains (migrate output + consumers, one area each)
1. **Author SEO** — `src/modules/authors/types/authors.types.ts:160-161` builds
   `metaTitle`/`metaDescription`. Consumers: `src/admin/features/authors/pages/AuthorEditor.tsx`,
   `src/admin/features/authors/components/AuthorSidebar/SEOSection.tsx`, site author pages. Migrate
   the built shape to `meta_title`/`meta_description` and update consumers.
2. **Recipe item `isOptional`** — `src/modules/articles/types/recipes.types.ts:964` and
   `src/shared/utils/hydration.ts` output `isOptional`. Consumers:
   `src/site/components/content/PrintRecipeOverlay.astro`,
   `src/site/components/content/IngredientsSection.astro`,
   `src/admin/components/RecipeBuilder.tsx`. Migrate to `is_optional` end to end.
3. **Category config** — `src/modules/categories/api/helpers.ts:133-142` builds `postsPerPage`,
   `layout`/`layoutMode`, `showFeaturedRecipe`, `showHeroCta`, `featuredArticleId`. Consumers:
   `src/pages/categories/[slug].astro`, `src/site/components/CategoryHeader.astro`,
   `src/site/components/ArticleGrid.astro`. Migrate config shape to snake_case + consumers.

> Note: the rg output mangles camelCase identifiers to `n` in this environment — the implementer
> MUST open each file with the editor/Read to get exact identifiers before editing.

### C — keep-list (legitimate alternative-key fallbacks, DO NOT touch)
- `src/shared/images/image-contract.ts:663` `images.thumbnail ?? images.hero` (different slots)
- `src/site/components/content/blocks/Image.astro:44` `variants.md ?? variants.lg ?? variants.sm`
- `src/server/cloudflare/env.ts:24` `SETTINGS_CACHE ?? SESSION` (different bindings)
- `src/shared/validation/schemas/media.ts:43` `upload_key ?? r2_key` (two contract names, documented)
- `src/modules/menus/services/menus.service.ts:438` `location ?? getMenuLocation(key)` (derived)
- `src/modules/articles/services/cache-builders.ts:118` `category_id_value ?? category_id` (verify: distinct fields)
- `src/admin/features/templates/components/editor/TemplateEditor.tsx:300-301`
  `width ?? canvas_width`, `height ?? canvas_height` (verify: distinct fields)
- `src/modules/content-blocks/normalize/normalize-content-document.ts` and
  `src/shared/images/image-contract.ts` editor→stored conversion arms (`imageRef`, `aspectRatio`,
  `mediaId`, `media_id ?? mediaId`, `recipe_steps ?? recipeSteps`, `content_images ?? contentImages`)
  — sanctioned conversion boundary (block-editor camelCase props → stored snake), `NAMING_CONTRACT`
  L229. **Verify** each of these reads an on-save editor payload, not stored data; if it only reads
  stored data, reclassify to A.

## Data-uniformity precondition (risk control)

Removing a read-side fallback (A, recipe-render) is safe only if no stored row uses the old casing.
Before A removals, run `node scripts/local-contract-audit.mjs --summary` and a targeted scan of the
relevant stored columns to confirm zero camelCase. Dev D1 is already verified snake (audit §2). For
production, the same audit must be run; if any camelCase rows exist, a one-shot data migration
(mirroring `scripts/migrate-credit-avatar-r2key.mts`) precedes the read-fallback removal.

## Verification

- After each phase: `pnpm typecheck && pnpm test && pnpm check:boundaries`.
- Final: a repository scan
  `rg --pcre2 "(\w+)\.\w+\s*\?\?\s*\1\.\w+" src --glob '!**/*.test.*'` returns only the C keep-list.
- `node scripts/local-contract-audit.mjs --summary`: no new camelCase violations.

## Out of scope

- The AI subsystem (separately migrated).
- Pre-existing camelCase in `GeneratedContent`/`usage` (`promptTokens`, `prepTime`) — AI-owned,
  tracked with the AI work.
- Any behavior change beyond casing (the cleanup must be behavior-preserving for snake_case data).

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Removing a read fallback breaks an un-migrated stored row | Data-uniformity audit before A; data migration if any camelCase rows |
| Misclassifying a C (editor→stored boundary) as A | Per-site verification: does it read an on-save payload or stored data? |
| A′ consumer missed → runtime undefined | Grep each output key's consumers; typecheck must stay green |
| rg mangles identifiers in this env | Implementer opens each file via Read/editor for exact names |
