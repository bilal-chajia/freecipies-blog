# snake_case End-to-End Migration (All Resources) Implementation Plan

> **STATUS — 2026-06-04: ✅ COMPLETED & VERIFIED.** All 9 Drizzle resources (settings, articles_to_tags, tags, templates, redirects, equipment, categories, authors, pinterest, articles) migrated to snake_case end to end; NAMING_CONTRACT migration-status note updated. Verified: typecheck 0 · tests green · boundaries ✅ · contract audit no camelCase data violations.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 9 remaining Drizzle-backed resources to snake_case end to end (data keys only — type 2), removing camelCase field aliases, conversion seams, and dual-handling, closing Contract Audit #3.

**Architecture:** Each resource is migrated in one coherent commit covering every layer (Drizzle schema → service → API handler → validation → serializer → admin/site consumers → types → tests). Drizzle column names are already snake_case; only the JS property names change. The existing Vitest suite + `check:boundaries` + `local-contract-audit.mjs` act as the regression harness — this is a pure rename refactor, so the gate is "all existing checks stay green," not new TDD tests.

**Tech Stack:** Drizzle ORM, Zod, Astro API routes, React admin SPA, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-04-snake-case-all-resources-design.md`

---

## Scope notes (read once)

- **Type 2 only.** Migrate *data keys* (DB rows, JSON payloads, API request/response bodies). Do
  NOT touch: CSS/DOM style props (`aspectRatio`, `objectPosition`, `fetchPriority`), local
  variables, function names, or React component/form state — `NAMING_CONTRACT` L21 allows those in
  camelCase.
- **Do NOT touch stored JSON blob contents.** Columns like `content_json`, `images_json`,
  `recipe_json`, `seo_json`, and `cached_*_json` already store snake_case keys (audit §2). Only the
  Drizzle *field name* that points at the column changes (e.g. `imagesJson` → `images_json`), not
  the JSON inside.
- **`jsonld_json`** content follows external Schema.org camelCase (allowed exception) — rename only
  the Drizzle field (`jsonldJson` → `jsonld_json`), never the JSON keys inside it.
- **Co-migration rule (the `e2e6bfc` lesson):** never land a partial-layer commit. Schema +
  service + serializer + consumers move together, or Drizzle returns camelCase rows while a
  snake_case reader gets `undefined`.

---

## Generic Migration Procedure (parameterized — every resource task invokes this)

Inputs each task supplies: `<RES>` (resource label), `<SCHEMA_GLOB>`, the **field rename map**, and
the **commit message**.

- [ ] **G1: Snapshot the green baseline**

Run: `pnpm test && pnpm check:boundaries && node scripts/local-contract-audit.mjs --summary`
Expected: tests PASS, "Boundary check passed.", and note the current violation count (baseline).

- [ ] **G2: Rename the Drizzle field names in the schema**

In `<SCHEMA_GLOB>`, for every entry in the field rename map, change only the JS property name to
match its column literal. Example transform:

```ts
// before
sortOrder: integer('sort_order').default(0),
// after
sort_order: integer('sort_order').default(0),
```

Also update every in-file reference: `(table) => [...]` index/constraint builders
(e.g. `index('idx_x').on(table.sortOrder)` → `.on(table.sort_order)`) and any `relations(...)`
`fields`/`references` arrays in the same file.

- [ ] **G3: Find every downstream reference to the old names**

Run (one alternation of all OLD camelCase names from the map):
`rg -n "\.(oldName1|oldName2|...)\b" src --glob '!**/*.test.ts' --glob '!**/*.test.tsx'`
Also run without the leading dot to catch object-literal keys and destructuring:
`rg -n "\b(oldName1|oldName2|...)\b" src/modules/<RES> src/admin/features/<RES> src/pages/api/<RES> src/shared`
Expected: a list of files to fix in G4. Ignore matches that are CSS/DOM props, local variables, or
JSON-blob string contents (per Scope notes).

- [ ] **G4: Update every data-key reference to snake_case**

For each file from G3, rename the data-key usages to snake_case: service queries
(`where`/`orderBy`/`with`), API handler payload construction, Zod schema keys (drop any
`x.fooBar ?? x.foo_bar` fallback — keep snake only), serializers, admin SPA reads, `src/shared/types`
type members, and test fixtures. Leave CSS/DOM/local-variable camelCase untouched.

- [ ] **G5: Re-grep to confirm zero residual data-key seams**

Run: `rg -n "\b(oldName1|oldName2|...)\b" src --glob '!**/*.test.ts'`
Expected: only CSS/DOM props, local variables, or JSON-blob string literals remain (no Drizzle row
field, payload key, or type member). No `x ?? x` / `x || x` dedup remnants.

- [ ] **G6: Run the full regression gate**

Run: `pnpm test && pnpm check:boundaries && node scripts/local-contract-audit.mjs --summary`
Expected: tests PASS, "Boundary check passed.", and violation count **≤ G1 baseline** (no new
camelCase violation for `<RES>`).

- [ ] **G7: Commit**

```bash
git add -A
git commit -m "<COMMIT MESSAGE>"
```

---

## Task 1: Migrate `settings`

**Files:**
- Modify: `src/modules/settings/schema/settings.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/settings/services/*`, `src/pages/api/settings/*`, `src/admin/features/settings/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map:** `sortOrder`→`sort_order`, `updatedAt`→`updated_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(sortOrder|updatedAt)`
  - G7 commit message:
    `refactor(settings): migrate data shapes to snake_case end to end (audit #3)`

## Task 2: Migrate `articles_to_tags`

**Files:**
- Modify: `src/modules/articles/schema/articles-to-tags.schema.ts`
- Modify (downstream, confirm via G3): article tag-link services/handlers that read the join row.

**Field rename map:** `articleId`→`article_id`, `tagId`→`tag_id`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(articleId|tagId)` — NOTE: `articleId`/`tagId` are common names; scope the
    grep to join-row usage (`articlesToTags`, `article_tags`) and verify each hit is the join row,
    not an unrelated local. Do not rename unrelated `articleId` locals.
  - G7 commit message:
    `refactor(articles-to-tags): migrate join-row fields to snake_case (audit #3)`

## Task 3: Migrate `tags`

**Files:**
- Modify: `src/modules/tags/schema/tags.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/tags/services/*`, `src/pages/api/tags/*`, `src/admin/features/tags/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map:** `styleJson`→`style_json`, `cachedPostCount`→`cached_post_count`,
`createdAt`→`created_at`, `updatedAt`→`updated_at`, `deletedAt`→`deleted_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(styleJson|cachedPostCount|createdAt|updatedAt|deletedAt)`
  - G7 commit message:
    `refactor(tags): migrate data shapes to snake_case end to end (audit #3)`

## Task 4: Migrate `templates`

**Files:**
- Modify: `src/modules/templates/schema/templates.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/templates/services/*`, `src/pages/api/templates/*`, `src/admin/features/templates/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map:** `backgroundColor`→`background_color`, `thumbnailUrl`→`thumbnail_url`,
`elementsJson`→`elements_json`, `isActive`→`is_active`, `createdAt`→`created_at`,
`updatedAt`→`updated_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(backgroundColor|thumbnailUrl|elementsJson|isActive|createdAt|updatedAt)`
    — NOTE: `backgroundColor` may also be a CSS/DOM style prop; keep those camelCase, rename only
    the template data field.
  - G7 commit message:
    `refactor(templates): migrate data shapes to snake_case end to end (audit #3)`

## Task 5: Migrate `redirects`

**Files:**
- Modify: `src/modules/redirects/schema/redirects.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/redirects/services/*`, `src/pages/api/redirects/*`, `src/admin/features/redirects/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map:** `fromPath`→`from_path`, `toPath`→`to_path`, `statusCode`→`status_code`,
`isActive`→`is_active`, `hitCount`→`hit_count`, `lastHitAt`→`last_hit_at`,
`createdAt`→`created_at`, `updatedAt`→`updated_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(fromPath|toPath|statusCode|isActive|hitCount|lastHitAt|createdAt|updatedAt)`
  - G7 commit message:
    `refactor(redirects): migrate data shapes to snake_case end to end (audit #3)`

## Task 6: Migrate `equipment`

**Files:**
- Modify: `src/modules/equipment/schema/equipment.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/equipment/services/*`, `src/pages/api/equipment/*`, `src/admin/features/equipment/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map:** `imageJson`→`image_json`, `affiliateUrl`→`affiliate_url`,
`affiliateProvider`→`affiliate_provider`, `affiliateNote`→`affiliate_note`,
`isActive`→`is_active`, `sortOrder`→`sort_order`, `createdAt`→`created_at`,
`updatedAt`→`updated_at`, `deletedAt`→`deleted_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(imageJson|affiliateUrl|affiliateProvider|affiliateNote|isActive|sortOrder|createdAt|updatedAt|deletedAt)`
  - NOTE: equipment snapshots are copied into `recipe_json.equipment[]` at save (see
    `RECIPE_JSON_CONTRACT.md`). That JSON is already snake_case — do not touch it; only rename the
    equipment table's Drizzle fields and its admin/API surface.
  - G7 commit message:
    `refactor(equipment): migrate data shapes to snake_case end to end (audit #3)`

## Task 7: Migrate `categories`

**Files:**
- Modify: `src/modules/categories/schema/categories.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/categories/services/*`, `src/pages/api/categories/*`, `src/admin/features/categories/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`
- NOTE: `src/admin/features/categories/pages/CategoryEditor.tsx` was already partly snake_case in the media pilot — re-verify it here.

**Field rename map:** `parentId`→`parent_id`, `collectionTitle`→`collection_title`,
`shortDescription`→`short_description`, `imagesJson`→`images_json`, `isFeatured`→`is_featured`,
`seoJson`→`seo_json`, `sortOrder`→`sort_order`, `workflowStatus`→`workflow_status`,
`cachedPostCount`→`cached_post_count`, `createdAt`→`created_at`, `updatedAt`→`updated_at`,
`deletedAt`→`deleted_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - G3/G5 alternation: `(parentId|collectionTitle|shortDescription|imagesJson|isFeatured|seoJson|sortOrder|workflowStatus|cachedPostCount|createdAt|updatedAt|deletedAt)`
  - G7 commit message:
    `refactor(categories): migrate data shapes to snake_case end to end (audit #3)`

## Task 8: Migrate `authors`

**Files:**
- Modify: `src/modules/authors/schema/authors.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/authors/services/*`, `src/modules/authors/api/*`, `src/pages/api/authors/*`, `src/admin/features/authors/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`
- NOTE: `buildAuthorCreditSnapshot` in `src/shared/images/image-contract.ts` reads
  `author.imagesJson ?? author.images_json` — once authors is snake_case, drop the `imagesJson`
  fallback there (keep only `images_json`).

**Field rename map:** `jobTitle`→`job_title`, `shortDescription`→`short_description`,
`imagesJson`→`images_json`, `bioJson`→`bio_json`, `personaJson`→`persona_json`,
`seoJson`→`seo_json`, `workflowStatus`→`workflow_status`, `isFeatured`→`is_featured`,
`sortOrder`→`sort_order`, `cachedPostCount`→`cached_post_count`, `createdAt`→`created_at`,
`updatedAt`→`updated_at`, `deletedAt`→`deleted_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above, plus the
  `buildAuthorCreditSnapshot` fallback removal noted above.
  - G3/G5 alternation: `(jobTitle|shortDescription|imagesJson|bioJson|personaJson|seoJson|workflowStatus|isFeatured|sortOrder|cachedPostCount|createdAt|updatedAt|deletedAt)`
  - G7 commit message:
    `refactor(authors): migrate data shapes to snake_case end to end (audit #3)`

## Task 9: Migrate `pinterest` (boards + pins)

**Files:**
- Modify: `src/modules/pinterest/schema/pinterest.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/pinterest/services/*`, `src/pages/api/pinterest-boards/*`, `src/pages/api/pins/*`, `src/admin/features/pinterest/**`, `src/admin/features/pins/**`, `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map (boards):** `boardUrl`→`board_url`, `coverImageUrl`→`cover_image_url`,
`isActive`→`is_active`, `createdAt`→`created_at`, `updatedAt`→`updated_at`,
`deletedAt`→`deleted_at`.
**Field rename map (pins):** `articleId`→`article_id`, `boardId`→`board_id`,
`sectionName`→`section_name`, `imageUrl`→`image_url`, `destinationUrl`→`destination_url`,
`tagsJson`→`tags_json`, `pinterestPinId`→`pinterest_pin_id`, `exportedAt`→`exported_at`,
`exportBatchId`→`export_batch_id`, `createdAt`→`created_at`, `updatedAt`→`updated_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with both maps above.
  - G3/G5 alternation: `(boardUrl|coverImageUrl|articleId|boardId|sectionName|imageUrl|destinationUrl|tagsJson|pinterestPinId|exportedAt|exportBatchId|isActive|createdAt|updatedAt|deletedAt)`
  - NOTE: `imageUrl` may appear as CSS/DOM or unrelated locals — confirm each hit is the pin row.
  - G7 commit message:
    `refactor(pinterest): migrate board + pin data shapes to snake_case (audit #3)`

## Task 10: Migrate `articles`

**Files:**
- Modify: `src/modules/articles/schema/articles.schema.ts`
- Modify (downstream, confirm via G3): `src/modules/articles/services/*`, `src/modules/articles/api/*` (incl. `helpers.ts`), `src/pages/api/articles/*`, `src/pages/api/recipes/*`, `src/pages/api/roundups/*`, `src/admin/features/articles/**`, `src/admin/features/recipes/**`, `src/admin/features/roundups/**`, `src/site/**` (only where it reads an article Drizzle row directly), `src/shared/validation/schemas/*`, `src/shared/types/*`

**Field rename map:** `categoryId`→`category_id`, `authorId`→`author_id`,
`parentArticleId`→`parent_article_id`, `shortDescription`→`short_description`,
`imagesJson`→`images_json`, `contentJson`→`content_json`, `recipeJson`→`recipe_json`,
`roundupJson`→`roundup_json`, `faqsJson`→`faqs_json`, `cachedTagsJson`→`cached_tags_json`,
`cachedCategoryJson`→`cached_category_json`, `cachedAuthorJson`→`cached_author_json`,
`cachedRatingJson`→`cached_rating_json`, `cachedTocJson`→`cached_toc_json`,
`cachedRecipeJson`→`cached_recipe_json`, `cachedCardJson`→`cached_card_json`,
`readingTimeMinutes`→`reading_time_minutes`, `seoJson`→`seo_json`, `jsonldJson`→`jsonld_json`,
`configJson`→`config_json`, `workflowStatus`→`workflow_status`, `scheduledAt`→`scheduled_at`,
`isFavorite`→`is_favorite`, `accessLevel`→`access_level`, `viewCount`→`view_count`,
`publishedAt`→`published_at`, `createdAt`→`created_at`, `updatedAt`→`updated_at`,
`deletedAt`→`deleted_at`.

- [ ] Run the Generic Migration Procedure (G1–G7) with the map above.
  - This is the largest, most-referenced resource — expect many files in G3. Work file-by-file and
    re-run `pnpm test` frequently, not only at G6.
  - Reminder: rename only the Drizzle *field* `jsonldJson`→`jsonld_json`; never touch the
    Schema.org camelCase keys inside `jsonld_json`. Same for all `cached_*_json` / `*_json` blob
    contents — already snake_case, do not edit.
  - G3/G5 alternation: `(categoryId|authorId|parentArticleId|shortDescription|imagesJson|contentJson|recipeJson|roundupJson|faqsJson|cachedTagsJson|cachedCategoryJson|cachedAuthorJson|cachedRatingJson|cachedTocJson|cachedRecipeJson|cachedCardJson|readingTimeMinutes|seoJson|jsonldJson|configJson|workflowStatus|scheduledAt|isFavorite|accessLevel|viewCount|publishedAt|createdAt|updatedAt|deletedAt)`
  - G7 commit message:
    `refactor(articles): migrate data shapes to snake_case end to end (audit #3)`

## Task 11: Finalize the contract and close #3

**Files:**
- Modify: `docs/NAMING_CONTRACT.md`
- Modify: `.hermes/plans/2026-06-03_contract-audit-report.md` (local, gitignored — update for the record)

- [ ] **Step 1: Update the migration-status note**

In `docs/NAMING_CONTRACT.md`, replace the "Migration status (2026-06-03)" block (the paragraph
stating media is migrated and other resources are tolerated) with a statement that all
Drizzle-backed resources are now snake_case end to end and the tolerance clause is removed.

- [ ] **Step 2: Run the full contract audit**

Run: `node scripts/local-contract-audit.mjs --summary`
Expected: no camelCase data-shape violations remain. The only acceptable remaining violations are
the separately-tracked items #5 (`code_legacy_blocks`) and #6 (`recipe_json` external equipment
url) — confirm no NEW camelCase violation was introduced by this migration.

- [ ] **Step 3: Final regression gate**

Run: `pnpm test && pnpm check:boundaries`
Expected: tests PASS, "Boundary check passed."

- [ ] **Step 4: Commit**

```bash
git add docs/NAMING_CONTRACT.md
git commit -m "docs(naming): mark snake_case migration complete for all resources (audit #3 closed)"
```

---

## Self-review notes

- **Spec coverage:** every resource in the spec's table has a task (Tasks 1–10); the cross-cutting
  "final step" (contract note + global audit) is Task 11. ✓
- **Co-migration rule:** enforced by the single-commit-per-resource structure (G2–G7 in one task). ✓
- **Out-of-scope items** (#4/#5/#6, jsonld internals, CSS/DOM/local camelCase) are explicitly
  excluded in Scope notes and per-task NOTEs. ✓
- **Type-2-only** boundary is restated in Scope notes and in the G3/G5 NOTEs where a name collides
  with CSS/DOM (`backgroundColor`, `imageUrl`) or common locals (`articleId`, `tagId`). ✓
