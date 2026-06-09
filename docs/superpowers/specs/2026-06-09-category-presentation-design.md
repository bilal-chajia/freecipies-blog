# Category Presentation & Settings — Design

> **Status:** Approved (2026-06-09). Next step: `writing-plans`.

## Problem

The Category module stores page-display settings and per-category editorial fields in a `config_json` blob that **is not a column** of the `categories` table. Drizzle silently drops it, so those fields (page settings + `featured_article_id`, `tldr`, `hero_cta`, …) **never persist** — they are non-functional "ghost" features. This violates `docs/CATEGORIES_TABLE_CONTRACT.md` and `docs/NAMING_CONTRACT.md`, leaks `r2_key` in responses, and carries heavy camelCase dual-handling.

## Goal

A reliable, contract-aligned model where:
- What the admin sets actually persists.
- Category page rendering does **zero extra D1 reads** (snapshot pattern, consistent with the rest of the SaaS: `cached_category_json`, `cached_card_json`).
- Page look is **uniform/global**; per-category **editorial content** can vary.

## Architecture — Two Layers

### Layer 1 — Global page settings (uniform)
Stored in `site_settings.category_page_settings` (key-value, KV-cached → ~0 D1 reads). Built in Phase 1 (merged to main, commit `240cd91`). Fields: `posts_per_page`, `layout_mode`, `card_style`, `show_sidebar`, `show_filters`, `show_breadcrumb`, `article_sort_by`, `article_sort_order`, `header_style`, plus global presentational defaults `show_featured_recipe` and a default hero CTA.

These define the consistent site-wide look. They are **global only** — categories do NOT override layout/paging/sorting.

### Layer 2 — Per-category editorial content
Stored in a **new real column** `categories.presentation_json` (read for free — the category row is already loaded to render its page). Holds only what is genuinely per-category:
- `featured_article` — a self-contained **snapshot** of the chosen hero article.
- `tldr` — short intro specific to the category.
- `hero_cta` — optional `{ show, text, link }` override for this category.

### Effective value (render time)
```
effective = { ...category_page_settings (global), ...presentation_json (local) }
```
Global is the uniform base; local overlays per-category editorial content only.

## Featured Article Snapshot (reliability + 0 reads)

### Stored shape — `presentation_json.featured_article`
Self-sufficient to render the hero without reading the article:
```json
{
  "id": 42,
  "slug": "fluffy-pancakes",
  "title": "Fluffy Pancakes",
  "image": { "url": "/api/images/...", "alt": "...", "width": 1200, "height": 675 }
}
```
- `title` = the article's `headline` (editorial display title), not the SEO title.
- `image.url` is a resolved **public URL** — never stores `r2_key`.
- Rendering the hero = **0 D1 reads, 0 r2_key leak**.

### Regeneration triggers (source of truth = the article)
1. **Editor sets/changes** a category's featured article → build the snapshot from the source article (reuse its `cached_card_json`) and write it into `presentation_json`.
2. **Source article changes** (headline/slug/image) → resync any `presentation_json.featured_article` pointing at it, via the **existing** article sync hook (`syncCachedFields` / equivalent) — same mechanism as `cached_category_json`.
3. **Source article deleted/unpublished** → clear `featured_article` (site falls back to auto first article).

### Render-time guard (defense in depth)
If `show_featured_recipe` is globally on but a category has no `featured_article`, the hero falls back to the **first article of the already-loaded list** → always 0 extra reads.

## Schema, Contract, Migration

### New column (`db/schema.sql` + `categories.schema.ts`)
```sql
-- 5b. PER-CATEGORY EDITORIAL OVERRIDES (read for free with the row)
presentation_json TEXT DEFAULT '{}' CHECK (json_valid(presentation_json)),
```
Drizzle: `presentation_json: text('presentation_json').default('{}')`.

### `config_json` removal
No `config_json` column exists on `categories` → nothing to drop in DB. Remove the code that manipulated it (helpers, types, validation) — this is "Plan D".

### Contract update (`docs/CATEGORIES_TABLE_CONTRACT.md`)
- Add `presentation_json` to the columns table + a JSON Fields section (`featured_article` snapshot, `tldr`, `hero_cta`).
- Clarify the split: **page settings = global** (`site_settings.category_page_settings`); **per-category editorial = `presentation_json`**.
- Document the snapshot rule (regeneration; source of truth = article).

### Migration (repo convention: versioned DDL + one-shot data script, applied on prod D1 at deploy)
- DDL: `db/migrations/<n>_add_category_presentation_json.sql` — `ALTER TABLE categories ADD COLUMN presentation_json TEXT DEFAULT '{}' CHECK (json_valid(presentation_json));` + update `db/schema.sql`.
- Data: `scripts/migrate-category-presentation.mts` (+ test) — best-effort; rebuild `featured_article` snapshots from any legacy data if present, else no-op. Supersedes `scripts/migrate-category-config.mts`.

## Consumer Changes

### API — `src/modules/categories/api/helpers.ts` (Plans D + E)
- Remove `parseConfigJson`, `normalizeConfigJsonObject`, the `config_json` branch, all camelCase request aliases, and camelCase response emission (`imageAlt`/`imageWidth`/`imageHeight`).
- Add `parsePresentationJson` (normalize `featured_article` snapshot + `tldr` + `hero_cta`; resolve URLs; strip `r2_key`).
- `transformCategoryResponse`: stop spreading raw `images_json`; expose a resolved `images` shape with public `url` (fixes the r2_key leak).

### Validation — `src/shared/validation/schemas/categories.ts` (Plan D)
- Remove `config_json`; remove `.passthrough()` (reject unknown keys).
- Add `presentation_json`; include it in the `dbColumns` allow-set.

### Types — `src/modules/categories/types/categories.types.ts` (Plan D)
- Remove `CategoryConfig` and config fields on `HydratedCategory`.
- Add `CategoryPresentation` (`featured_article`, `tldr`, `hero_cta`).

### Admin — `src/admin/features/categories/pages/CategoryEditor.tsx` (Plan C)
- Remove the global page-settings form (layout/paging/sorting) → move to the admin **Settings** area, calling `updateCategoryPageSettings`.
- Keep/add: featured-article picker (writes the snapshot) + `tldr` + `hero_cta`, in snake_case to `presentation_json`.

### Site — `src/pages/categories/[slug].astro`, `index.astro` (Plan B)
- Read the 9 settings from `getCategoryPageSettings(env.DB)` (global, KV-cached).
- Read `featured_article` / `tldr` / `hero_cta` from `category.presentation_json` (free).
- Hero: snapshot if present, else first article (0 reads).

## Testing (pure-function convention)

| Unit | Pure test |
| --- | --- |
| `normalizeCategoryPageSettings` | done (Phase 1) |
| `parsePresentationJson` / `normalizePresentation` | defaults, snake_case-only, strip `r2_key`, invalid → `{}` |
| `buildFeaturedArticleSnapshot(article)` | article → `{id,slug,title,image.url}`, never `r2_key` |
| `mergeEffectiveCategorySettings(global, presentation)` | global-only / local override / featured fallback |
| `transformCategoryResponse` | no raw `images_json` leak; no camelCase |
| `scripts/migrate-category-presentation.mts` | like `migrate-category-config.test.ts` (no-op when empty) |
| `wouldCreateParentCycle` | done (Phase 1) |

Integration: `pnpm test` + `pnpm check:boundaries` + `pnpm dev` (real render with local D1) on a category page.

## Out of Scope
- Per-category overrides of layout/paging/sorting (deliberately global per decision A).
- Any new homepage/featured-category behavior (`is_featured` unchanged).

## Decisions Locked (2026-06-09)
- (A) Uniform global page look + per-category editorial overrides (hybrid).
- Featured article stored as a regenerable **snapshot** (not just an id) → 0 reads, contract-consistent.
- Resync via the existing article sync hook; snapshot `title` = article `headline`.
- Global settings UI lives in admin Settings, not the category editor.
- Migration via versioned DDL + one-shot script, applied on prod D1 at deploy.
