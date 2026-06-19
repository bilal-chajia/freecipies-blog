# Homepage — P2 Admin Completion + Site Fixes — Design Spec

**Date:** 2026-06-19
**Branch:** `feat/homepage-config-redesign` (continuation)
**Status:** Design validated, pending implementation plan
**Parent spec:** `docs/superpowers/specs/2026-06-15-homepage-config-and-redesign-design.md` (P0–P3 original)

## Context

The homepage redesign (P0/P1a config rail, P1b visual redesign) is shipped and green (394 tests, typecheck, boundaries). A review surfaced four gaps that this spec closes:

1. **Site — N+1 query on manual refs.** `home-data.ts:37-40` runs `Promise.all(ids.map(getArticleById))` = N queries where the parent spec called for one batched read.
2. **Site — hero/latest duplication.** When the hero has no manual refs, both hero and the `latest` section source from the same `latestRecipes` cache, showing identical recipes at the top.
3. **Site — hidden `<h1>`.** `index.astro` renders a visually-hidden `<h1>`. Every other hub page in the codebase renders one *visible* page-level `<h1>`.
4. **Admin P2 — incomplete.** Refs are read-only `<textarea>` placeholders ("land in the next P2 pass"); section reorder is Up/Down buttons, not drag.

## Scope

**In scope:**
- Fix N+1 on manual recipe/roundup refs (site).
- Diversify hero fallback (site).
- Surface a real visible `<h1>` (site).
- Drag-reorder of homepage sections (admin).
- Functional recipe/roundup/author pickers (admin).

**Explicitly out of scope (remain P3):**
- P3 sections: `faq`, `quick_filters`, `seasonal_spotlight`, `social_proof`, `lead_magnet`, `social_feed`, `banner`.
- JSON-LD `ItemList` and `FAQPage` for the homepage.
- Hero search bar (`show_search` rendered).
- Any change to the `homepage_settings` JSON shape (P0/P1a shape is final).

## Contract compliance (governing rule)

Contracts in `docs/` are the source of truth and **must not be modified** without explicit user authorization. Every change below was checked against:

- `docs/SITE_SETTINGS_TABLE_CONTRACT.md` — `homepage_settings` storage + homepage ref shapes.
- `docs/ARTICLE_TABLE_CONTRACT.md` — `articles` columns (`view_count`, `is_favorite`, `deleted_at`, cache columns).
- `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` — Public Rendering Matrix and Cache Recovery Rules.
- `docs/NAMING_CONTRACT.md` — `snake_case` in SQL/JSON/API, `camelCase` in TS only.

**Findings confirmed by the contracts:**
- `HomepageRecipeRef` shape `{ article_id, headline, route, category? { label, slug, color? } }` — `category` is explicitly optional. Images must be resolved live; settings must not store `r2_key` for refs.
- `HomepageRoundupRef` shape `{ roundup_id, title, route }`.
- `view_count` is a simple global view counter (valid for a trending ordering).
- Public Rendering Matrix: cards/lists/pickers surfaces read `cached_card_json` / `cached_category_json` / `cached_author_json` / `cached_recipe_json` / `cached_rating_json` — not full source joins.
- Cache Recovery Rules: a code path that does not own cache regeneration reads source/cache for the current request and does **not** regenerate or write back.
- Routes are computed by `hydrateArticle` as `/recipes/{slug}`, `/roundups/{slug}`, `/articles/{slug}`.

**Implementation rule (Drizzle):** All DB access uses Drizzle ORM builders (`inArray`, `isNull`, `and`, `.orderBy(desc(...))`). No raw SQL anywhere. This matches `articles.service.ts` line 7 (`import { inArray } from 'drizzle-orm'`) and existing usage at lines 137 and 336.

---

## Section 1 — Architecture & boundaries

This is gap-closing work on an established rail, not a re-architecture. The existing config rail (contract → types → Zod → service → API → admin → render) is unchanged. Three phases, sequential A → B → C:

- **Phase A (site, independent of admin):** N+1 fix, trending fallback, visible `<h1>`.
- **Phase B (admin):** drag-reorder via dnd-kit (already installed and used by the menu editor and FAQ block).
- **Phase C (admin):** real pickers.

Each phase ends with a verification barrier (`pnpm test`, `pnpm typecheck`, `pnpm check:boundaries`) and a commit.

**Module boundaries respected:**
- Data: `home-data.ts` (resolver) stays the DB frontier; the N+1 fix and trending live there + one new function in `articles.service.ts`.
- Site view: `index.astro` gains the `<h1>` band; `home/*` components are unchanged unless a bug is found.
- Admin: `Homepage.tsx`, `HomepageLayout.tsx`, `pages/sections/*`, new pickers in `src/admin/components/pickers/`, new list wrappers in `src/admin/features/homepage/components/`. Admin never imports `@server/*` (boundary enforced by `pnpm check:boundaries`).
- API: **no new endpoint.** Pickers reuse `GET /api/articles`, `GET /api/articles?type=roundup`, `GET /api/authors`. The existing `PUT /api/settings/homepage` already validates and stores refs (shape unchanged).

### Blast radius & isolation

This work is deliberately scoped so each unit's blast radius is near-zero. Verified by grepping consumers in `src/`:

| Unit | Touched | Consumers outside the homepage? |
|---|---|---|
| `getArticlesByIds` (new) | add only | None — new export, no existing caller. |
| `resolveArticlesByIds` (removed) | local | None — private helper in `home-data.ts`. |
| `resolveHomeData` / `home-data.ts` | local | None — consumers are only `index.astro`, `HomeSections.astro`, and its test. A homepage-private utility. |
| `trendingRecipes` (new) | add only | None — private helper in `home-data.ts`. |
| `<h1>` band in `index.astro` | local | None — `index.astro` is the homepage only. |
| `HomepageLayout.tsx`, `reorderSections` | local | None — only `Homepage.tsx` imports `HomepageLayout`. Homepage-feature-private. |
| New pickers + list wrappers | add only | None — new components. (`RoundupPicker`/`AuthorPicker` live in `src/admin/components/pickers/` and are reusable later, but nothing else imports them this cycle.) |
| Homepage section editors (`HeroSection.tsx`, etc.) | local | None — private to the homepage admin feature. |

**The only shared-type touchpoint in the whole spec:** if `getArticles` does not already accept `sortBy: 'view_count'`, the `ArticleQueryOptions` interface (defined in `articles.service.ts`, consumed by `src/pages/api/recipes/index.ts`) gains an **optional** `sortBy: 'view_count'` value. Adding an optional union member is backward-compatible — existing callers are unaffected because they omit the field. This is isolated as its own task with a test.

**Explicitly NOT touched (verified):**
- Other public pages (`/recipes/*`, `/categories/*`, `/articles/*`, `/roundups/*`, `/authors/*`) call `getArticleById` (unchanged) or `getArticles` directly — never the homepage resolver.
- No existing API endpoint is modified; pickers do read-only GETs.
- No DB table, no `docs/` contract, no JSON shape.

**Implication for the plan:** Phase A, Phase B, and Phase C are mutually independent and can be developed/reviewed in isolation. Within Phase A, the `ArticleQueryOptions` change (if needed) is the only shared touchpoint and is its own task.

---

## Section 2 — Components & responsibilities

### Phase A — Site

| Unit | Type | Responsibility |
|---|---|---|
| `getArticlesByIds(db, ids)` *(new, `articles.service.ts`)* | Module function | Return hydrated articles for a list of ids, in input order, in a single Drizzle query using `inArray`. Selects source columns + the cache fields consumed by card/list surfaces (`cached_category_json`, `cached_author_json`, `cached_recipe_json`, `cached_rating_json`), then `hydrateArticle`. **No joins, no raw SQL.** |
| `resolveArticlesByIds` *(removed, `home-data.ts:37`)* | — | Removed. Its 3 call sites (hero/featured/collections manual refs) call `getArticlesByIds` directly. The helper adds nothing once delegation is one line. |
| `trendingRecipes(count)` *(new, `home-data.ts`)* | Private helper + in-request cache | Return `count` published recipes ordered by `view_count DESC` (Drizzle `.orderBy(desc(articles.view_count))`), fallback `published_at DESC` when `view_count` ties. Backed by a `trendingCache` mirroring the existing `latestCache`. Distinct source from `latestRecipes` → no duplication. |
| `resolveHomeData` *(modified)* | Resolver | `hero` case: when `refs.length === 0` → `trendingRecipes(4)` instead of `latestRecipes(4)`. When `refs.length > 0` but all refs resolve to nothing (soft-deleted) → `recipes: []` (empty state; **no silent trending fallback** — preserves editorial intent). Otherwise unchanged. |
| `<h1>` band *(new block, `index.astro`)* | Astro | Render an eyebrow + `<h1>` serif containing `identity.tagline` (fallback `identity.site_name`), placed **above** `<HomeSections>` and **outside** any section component. The only `<h1>` on the page. Styled with design tokens only. |

### Phase B — Admin drag-reorder

| Unit | Type | Responsibility |
|---|---|---|
| `HomepageLayout.tsx` *(modified)* | React component | Section nav becomes sortable via `DndContext` + `SortableContext` + `useSortable`. `GripVertical` drag handle (only on draggable rows). Removes the Up/Down buttons (`HomepageLayout.tsx:169-190`). SEO row is fixed (non-draggable), stays last. |
| `reorderSections(activeId, overId)` *(new, `Homepage.tsx`)* | Handler | `arrayMove` on `formData.sections` by id. Preserves the `stories` section position (it is in the array but filtered from the editor nav; reorder computes indices against the full `formData.sections` array by id). |

**House templates to copy:** `MenuSettings.tsx:158-175` (DndContext), `SortableMenuItemRow.tsx` (useSortable row + handle), `FAQSectionBlock.tsx` (arrayMove). No new dependency.

### Phase C — Admin pickers

| Unit | Type | Responsibility |
|---|---|---|
| `RoundupPicker.tsx` *(new, `pickers/`)* | React component | Single-select roundup. `GET /api/articles?type=roundup&search=&limit=8`. Returns a `HomepageRoundupRef`. |
| `AuthorPicker.tsx` *(new, `pickers/`)* | React component | Single-select author. `GET /api/authors?search=&limit=8`. Returns `{ id, name, slug }` → `author_id`. |
| `RecipeRefList.tsx` *(new, `homepage/components/`)* | React component | Ordered list of `HomepageRecipeRef[]`: add via search row, drag-reorder, remove, dedupe by `article_id`. |
| `RoundupRefList.tsx` *(new, `homepage/components/`)* | React component | Ordered list of `HomepageRoundupRef[]`: add/drag/remove/dedupe by `roundup_id`. |
| `HeroSection.tsx`, `FeaturedSection.tsx` *(modified)* | Admin section | Replace read-only `<textarea>` with `<RecipeRefList>`. (Featured: list visible only when `source === 'manual'`; hint when not.) |
| `CollectionsSection.tsx` *(modified)* | Admin section | Replace `<textarea>` with `<RoundupRefList>`. |
| `AboutSection.tsx` *(modified)* | Admin section | Replace `<input type="number">` with `<AuthorPicker>`. Keep a "use featured author" clear action. |

**Separation of concerns:** pickers in `src/admin/components/pickers/` are **generic and reusable** (menu editor, etc.). List wrappers in `src/admin/features/homepage/components/` are **homepage-specific**.

### Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Stored recipe/roundup refs carry no image/category snapshot | Contract: images resolved live; `category` optional. Resolver re-resolves from the live row. |
| 2 | `getArticlesByIds` reads source columns + the cache fields consumed by card/list surfaces, then `hydrateArticle` | Conforms to the Public Rendering Matrix. No joins. Reusable across card/list surfaces. |
| 3 | No tag batching in `getArticlesByIds` | hero/featured/collections do not read tags. Reading `cached_tags_json` would be unused work. |
| 4 | UX = drag handle only (Up/Down removed); SEO fixed last; `stories` position preserved | Matches the chosen "drag-reorder" intent. |

---

## Section 3 — Data flow

### Flow 1 — Public: settings → resolver → components

```
D1 site_settings.value (homepage JSON, snake_case)
  → getHomepageSettings(db)         [parse + back-compat + KV cache, write-through]
  → HomepageSettings (TS, camelCase via Zod transform)   [unchanged]
  → resolveHomeData(sections, ctx)  [modified: hero uses getArticlesByIds / trendingRecipes]
      hero     : refs.length > 0 → getArticlesByIds(refs)   (empty if all soft-deleted)
                 refs.length = 0 → trendingRecipes(4)        [new]
      featured : manual → getArticlesByIds ; category → getArticles ; else latest
      collections : refs > 0 → getArticlesByIds ; else getArticles(roundup)
      latest   : latestRecipes(count)   [unchanged, shared cache]
  → HomeSectionVM[] (discriminated union by kind)
  → index.astro : <h1> band (identity.tagline) above <HomeSections vms={vms} />
  → HTML
```

**In-request caches (single request, in-memory):**
- `latestCache` (existing) — populated by first `latestRecipes` call, reused by `latest`.
- `trendingCache` (new) — populated by `trendingRecipes`, used only by the hero fallback. Distinct from `latestCache`.

### Flow 2 — Trending fallback

```
section.hero with refs.length === 0
  → trendingRecipes(4)
      trendingCache null ? → getArticles(db, { type:'recipe', workflow_status:'published', sortBy:'view_count', sort_order:'desc', limit:24 })
      else slice(0, count)
  → HydratedArticle[] (4 trending recipes, distinct from latest)
```

**To verify at implementation time:** that `getArticles` accepts `sortBy: 'view_count'` + `sort_order: 'desc'`. If not, add this `sortBy` value to `ArticleQueryOptions` (internal change only; `view_count` is an `articles` source column per the article contract, so no contract modification). The Drizzle ordering builder is `.orderBy(desc(articles.view_count))`.

### Flow 3 — Admin: UI → API → storage → KV invalidation

```
Homepage.tsx (formData state)
  updateSection(id, updater)            [content]
  reorderSections(activeId, overId)     [new, drag → arrayMove on formData.sections]
  → onPublish()
  → PUT /api/settings/homepage
      Zod validation (snake_case)       [schema unchanged]
      homepage-settings.service.updateHomepageSettings(db, payload)
        → write site_settings.value (JSON snake_case)
        → invalidate KV cache 'homepage_settings'  (write-through, existing pattern)
  → next public request: getHomepageSettings reads new value → resolver → components → HTML
```

**Pickers (independent read-only flow):**
```
RecipeRefList / AuthorPicker / RoundupPicker
  debounced search (300ms, ArticlePicker template)
  → GET /api/articles?type=roundup&search=&limit=8   (roundups)
     GET /api/articles?search=&limit=8                (recipes)
     GET /api/authors?search=&limit=8                 (authors)
  → { success, data } envelope (formatSuccessResponse)
  → map to HomepageRecipeRef / HomepageRoundupRef / author_id
     route computed client-side: '/recipes/'+slug or '/roundups/'+slug
     (resolver re-resolves live anyway)
  → append to formData.sections[].refs[]
```

**Consistency points:**
1. `homepage_settings` JSON shape is stable. The existing PUT already validates refs; pickers produce the same shape → no drift.
2. Pickers never store image/category snapshots (contract, decision #1).
3. Back-compat preserved: `getHomepageSettings` already handles missing `sections`. Empty refs → trending (was: latest).
4. Section order is positional in `formData.sections` (no `order` field). Drag reorders that array. `stories` keeps its position because `reorderSections` operates by id on the full array.

---

## Section 4 — Error handling

### Public site (maximum resilience — the homepage must always render)

| Case | Behavior | Rationale |
|---|---|---|
| Ref points to a soft-deleted article | Article excluded by `isNull(articles.deleted_at)`. If all refs are dead → section receives `[]`. | Soft-delete contract. |
| Hero with refs all dead | Empty state. **No silent trending fallback.** | Preserves editorial intent; an empty state prompts the editor to fix. |
| `getArticlesByIds(ids=[])` | Early-return `[]`, no query. | Avoids an empty `IN ()`. |
| Missing/invalid cache field (e.g. `cached_category_json` null) | `hydrateArticle` returns `category: null`. Component renders without the badge. | Cache Recovery Rules: this path does not own regeneration → reads source/cache for the request, no crash. |
| Invalid `cached_recipe_json` | `parseCachedRecipe` returns `null` → cook time absent. No crash. | Existing utility behavior. |
| `trendingRecipes` returns 0 recipes | Hero receives `[]` → empty state. | Fallback is trending, not an infinite chain. |
| `identity.tagline` null/undefined | `<h1>` falls back to `identity.site_name` (existing wiring). | Existing fallback. |

### Admin (clear user feedback)

| Case | Behavior |
|---|---|
| Picker search API 4xx/5xx | Inline error in the dropdown ("Search failed, retry"). Form stays intact. |
| Picker returns 0 results | "No results" in the dropdown. |
| Adding a duplicate ref (same `article_id`/`roundup_id`) | Silent refusal + toast. No duplicate created. |
| Dragging a non-draggable row (SEO) | SEO row has no dnd listeners → cannot be dragged. No error path. |
| `PUT /api/settings/homepage` fails Zod | API returns 400 via `formatErrorResponse`. Front shows validation error. |
| `PUT` fails (DB/KV) | API returns 500. Front shows "Publish failed"; `lastSaved` intact; retry enabled. |
| Two admin tabs editing concurrently | Last PUT wins. No optimistic lock this cycle (documented mono-editor assumption). |

### Contract rules never violated

1. Never regenerate a cache in `getArticlesByIds` or the resolver. This path does not own regeneration → it reads source/cache available and renders without if absent. Regeneration belongs to article save-time.
2. Never write back: the resolver never writes `cached_*` to the DB. Pure read.
3. Never expose `r2_key`: images are resolved to `url` by `hydrateArticle`/`extractImage`. Pickers never store `r2_key`.

---

## Section 5 — Testing

TDD for business logic (skill `test-driven-development` will be invoked at implementation). UI (dnd, Astro render) is verified manually at the browser checkpoints. Existing test patterns (D1 mocks, snapshots) are reused.

### Phase A — Site (strict TDD)

**A.1 `getArticlesByIds`** (new test file or appended to `articles.service` tests):
- `getArticlesByIds([])` → `[]` (no query).
- `getArticlesByIds([1,2,3])` all exist → 3 hydrated rows.
- `getArticlesByIds([3,1,2])` → **order preserved** [row3,row1,row2] (Drizzle `inArray` does not guarantee order — this is the key assertion).
- `getArticlesByIds([1,999])` (999 missing) → [row1] only, no crash.
- `getArticlesByIds([1,1,2])` (duplicate) → 2 rows (dedup), order [1,2].
- Soft-deleted article excluded.
- Article with `cached_category_json` null → `category: null`, no crash.

**A.2 Resolver migration** (modify `home-data.test.ts`):
- Switch mocks from `getArticleById` to `getArticlesByIds`.
- Assert `getArticleById` is no longer called in a loop when manual refs are present (`toHaveBeenCalledTimes(0)` spy).

**A.3 Trending fallback** (add to `home-data.test.ts`):
- Hero `refs: []` → `trendingRecipes` called; `latestRecipes` **not** called for the hero.
- Hero trending + latest section on the same page → first recipes differ when the dataset allows (assert `view_count` ordering when the mock has distinct view counts).
- Hero `refs: [...]` all dead → `recipes: []`; trending **not** called (decision UX #1).
- `trendingCache` reused when two sections call `trendingRecipes` (assert 1 DB call).

**A.4 `<h1>` band** (render test if an Astro harness exists; else manual):
- Exactly one `<h1>` in the rendered HTML, containing the tagline.
- Hero `<h2>` still present (no double h1).
- Manual browser checkpoint at end of Phase A.

### Phase B — Admin drag-reorder

Light behavioral + manual:
- `reorderSections(activeId, overId)` (pure function on `formData.sections`) → unit test: correct `arrayMove`, `stories` keeps position, SEO excluded.
- Non-regression: existing `Homepage.tsx` tests stay green.
- Manual (browser): drag a section, drop, order changes, save, reload, persisted. SEO stays last.

### Phase C — Admin pickers

Picker mapping tests (UI is manual):
- `mapArticleToRecipeRef(article)` → `{ article_id, headline, route: '/recipes/'+slug }` (snake_case).
- `mapArticleToRoundupRef(article)` → `{ roundup_id, title, route: '/roundups/'+slug }`.
- `addRef(existingRefs, newRef)` refuses a duplicate `article_id`/`roundup_id`.

Manual E2E (user-driven):
1. Configure hero/featured/collections/about via pickers + drag-reorder.
2. Publish → reload `/` → verify order + items + images resolved live.
3. DevTools: PUT payload is snake_case and passes the existing Zod schema.

### Barriers

| Barrier | When | criterion |
|---|---|---|
| `pnpm test` | after each sub-task | 394 baseline + new tests green |
| `pnpm typecheck` | after each sub-task | green (strict, no `any`) |
| `pnpm check:boundaries` | before each phase commit | green (admin does not import `@server/`) |
| Browser verify (A.4) | end of Phase A | one `<h1>`, hero `<h2>` preserved |
| Browser verify (B, C) | end of Phases B and C | drag + pickers functional |

**Testability principle:** `getArticlesByIds`, `trendingRecipes`, `reorderSections`, `mapArticleTo*Ref`, `addRef` are pure functions → unit-tested without UI. React/Astro components are verified manually (consistent with the existing suite, which covers logic, not render).

---

## Risks & mitigations

- **dnd × framer-motion `layoutId` conflict** (active-tab highlight uses `motion.div layoutId`): apply the dnd transform via inline `style` (not motion), keep the `layoutId` highlight as an absolute-positioned child. If conflict, fall back to a non-animated active background. Verified in browser.
- **`getArticles` `view_count` ordering support:** verify at implementation; if absent, add `sortBy: 'view_count'` to `ArticleQueryOptions` (internal, no contract change).
- **Picker field-name drift:** read `/api/authors` and `/api/articles?type=roundup` response shapes before coding C.1. Do not guess from `ArticlePicker`.
- **Route prefixes:** confirmed by `hydrateArticle` (`/recipes/{slug}`, `/roundups/{slug}`). Stored refs use these.
- **Order preservation in `getArticlesByIds`:** reorder results to match input ids; Drizzle `inArray` does not guarantee order. Unit test asserts this explicitly.
- **Ref dedup:** picker UIs prevent duplicate ids to avoid duplicate slides.

## Verification of completion

- [ ] `pnpm test` green (394 baseline + new tests).
- [ ] `pnpm typecheck` green.
- [ ] `pnpm check:boundaries` green.
- [ ] Homepage DOM has exactly ONE `<h1>` (visible, = tagline); hero titles remain `<h2>`.
- [ ] `home-data.ts` no longer calls `getArticleById` in a loop; uses `getArticlesByIds` (single Drizzle `inArray` query).
- [ ] Hero fallback (no manual refs) no longer duplicates the `latest` section's first recipes.
- [ ] Admin: sections drag-reorder, persist on save, SEO row fixed last, stories position preserved.
- [ ] Admin: recipe/roundup/author pickers produce correct snake_case ref shapes; round-trip via API verified.
- [ ] All DB access via Drizzle builders; no raw SQL.
- [ ] No `pnpm build` run without approval.
