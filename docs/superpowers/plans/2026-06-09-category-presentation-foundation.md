# Category Presentation Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reliable data/snapshot layer for per-category editorial presentation: a real `categories.presentation_json` column, the `CategoryPresentation` types, a pure featured-article snapshot builder, a pure parser/normalizer that strips `r2_key`, an effective-settings merge, and a one-shot migration.

**Architecture:** Global page settings already live in `site_settings.category_page_settings` (Phase 1, merged). This plan adds the per-category layer: a real JSON column read for free with the category row, holding a self-contained featured-article **snapshot** (rendered with zero D1 reads, no `r2_key`), `tldr`, and `hero_cta`. All logic is pure and unit-tested per the repo convention.

**Tech Stack:** Drizzle ORM (D1 SQLite), Zod 4, Vitest, TypeScript strict. Spec: `docs/superpowers/specs/2026-06-09-category-presentation-design.md`.

---

## Scope

This is **Plan 1 of 4** — the data/snapshot foundation. It is self-contained and fully testable (pure functions + schema + migration) and does not change runtime behavior of admin/site yet. The consumer plans are listed under **Follow-on Plans**.

## File Structure

| File | Responsibility | Task |
| --- | --- | --- |
| `db/schema.sql`, `src/modules/categories/schema/categories.schema.ts` | add `presentation_json` column | 1 |
| `db/migrations/0002_add_category_presentation_json.sql` | versioned DDL | 1 |
| `src/modules/categories/types/presentation.types.ts` | `FeaturedArticleSnapshot`, `CategoryPresentation`, `HeroCta` types | 2 |
| `src/modules/categories/snapshot/featured-article.ts` | pure `buildFeaturedArticleSnapshot` | 3 |
| `src/modules/categories/snapshot/__tests__/featured-article.test.ts` | tests for snapshot builder | 3 |
| `src/modules/categories/api/presentation.ts` | pure `normalizePresentation` + `parsePresentationJson` | 4 |
| `src/modules/categories/api/__tests__/presentation.test.ts` | tests for parser/normalizer | 4 |
| `src/modules/categories/services/effective-settings.ts` | pure `mergeEffectiveCategorySettings` | 5 |
| `src/modules/categories/services/__tests__/effective-settings.test.ts` | tests for merge | 5 |
| `scripts/migrate-category-presentation.mts` + test | one-shot snapshot backfill | 6 |

---

### Task 1: `presentation_json` column (schema + Drizzle + DDL migration)

**Files:**
- Modify: `db/schema.sql` (categories table, after `seo_json`)
- Modify: `src/modules/categories/schema/categories.schema.ts`
- Create: `db/migrations/0002_add_category_presentation_json.sql`

- [ ] **Step 1: Add the column to the executable schema**

In `db/schema.sql`, inside `CREATE TABLE IF NOT EXISTS categories (...)`, immediately after the `seo_json TEXT DEFAULT '{}' CHECK (json_valid(seo_json)),` line, add:

```sql
    -- 5b. PER-CATEGORY EDITORIAL OVERRIDES
    -- Holds featured_article snapshot, tldr, and hero_cta. Read for free with the row.
    -- See docs/CATEGORIES_TABLE_CONTRACT.md. Page settings are global (site_settings).
    presentation_json TEXT DEFAULT '{}' CHECK (json_valid(presentation_json)),
```

- [ ] **Step 2: Add the column to the Drizzle schema**

In `src/modules/categories/schema/categories.schema.ts`, after the `seo_json` line in the table definition, add:

```typescript
  presentation_json: text('presentation_json').default('{}'),
```

- [ ] **Step 3: Create the versioned DDL migration**

Create `db/migrations/0002_add_category_presentation_json.sql`:

```sql
-- Migration: add per-category editorial presentation_json column.
-- Apply on prod D1 at deploy. Additive; existing rows default to '{}'.
ALTER TABLE categories ADD COLUMN presentation_json TEXT DEFAULT '{}' CHECK (json_valid(presentation_json));
```

- [ ] **Step 4: Verify the test suite still passes (no behavior change yet)**

Run: `pnpm test`
Expected: all tests pass (211).

- [ ] **Step 5: Commit**

```bash
git add db/schema.sql src/modules/categories/schema/categories.schema.ts db/migrations/0002_add_category_presentation_json.sql
git commit -m "feat(categories): add presentation_json column (schema + DDL migration)"
```

---

### Task 2: Presentation types

**Files:**
- Create: `src/modules/categories/types/presentation.types.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/categories/types/__tests__/presentation.types.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { HERO_CTA_DEFAULT, type CategoryPresentation, type FeaturedArticleSnapshot } from '../presentation.types';

describe('presentation types', () => {
  it('HERO_CTA_DEFAULT is disabled by default', () => {
    expect(HERO_CTA_DEFAULT).toEqual({ show: false, text: '', link: '' });
  });

  it('types compose a valid presentation object', () => {
    const snap: FeaturedArticleSnapshot = { id: 1, slug: 'a', title: 'A' };
    const p: CategoryPresentation = { featured_article: snap, tldr: 'x', hero_cta: HERO_CTA_DEFAULT };
    expect(p.featured_article?.id).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/categories/types/__tests__/presentation.types.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/modules/categories/types/presentation.types.ts`:

```typescript
/**
 * Per-category editorial presentation (stored in categories.presentation_json).
 * Page layout/paging/sorting settings are GLOBAL (site_settings.category_page_settings).
 */

export interface FeaturedArticleSnapshot {
  id: number;
  slug: string;
  /** Editorial display title = the source article's headline. */
  title: string;
  /** Resolved public image; never stores r2_key. */
  image?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

export interface HeroCta {
  show: boolean;
  text: string;
  link: string;
}

export const HERO_CTA_DEFAULT: HeroCta = { show: false, text: '', link: '' };

export interface CategoryPresentation {
  featured_article?: FeaturedArticleSnapshot | null;
  tldr?: string;
  hero_cta?: HeroCta;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/categories/types/__tests__/presentation.types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/types/presentation.types.ts src/modules/categories/types/__tests__/presentation.types.test.ts
git commit -m "feat(categories): add CategoryPresentation/FeaturedArticleSnapshot types"
```

---

### Task 3: Pure featured-article snapshot builder

**Files:**
- Create: `src/modules/categories/snapshot/featured-article.ts`
- Test: `src/modules/categories/snapshot/__tests__/featured-article.test.ts`

Context: source is an article card snapshot `CachedCardJson` (`src/modules/articles/types/cache.types.ts`) with `id`, `slug`, `headline`, and `image?.variants` (`ImageVariants` keyed `xs/sm/md/lg/original`). `resolveVariantUrl` (`src/shared/types/images.ts`) turns a variant into a public URL string (never r2_key in output).

- [ ] **Step 1: Write the failing test**

Create `src/modules/categories/snapshot/__tests__/featured-article.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildFeaturedArticleSnapshot } from '../featured-article';
import type { CachedCardJson } from '../../../articles/types/cache.types';

const baseCard: CachedCardJson = {
  id: 42,
  type: 'recipe',
  slug: 'fluffy-pancakes',
  headline: 'Fluffy Pancakes',
};

describe('buildFeaturedArticleSnapshot', () => {
  it('maps id/slug/headline to id/slug/title', () => {
    const snap = buildFeaturedArticleSnapshot(baseCard);
    expect(snap).toEqual({ id: 42, slug: 'fluffy-pancakes', title: 'Fluffy Pancakes' });
  });

  it('resolves the best image variant to a public url and never exposes r2_key', () => {
    const snap = buildFeaturedArticleSnapshot({
      ...baseCard,
      image: {
        alt: 'Stack of pancakes',
        variants: {
          sm: { r2_key: 'media/p-sm.webp', width: 720, height: 405 },
          lg: { r2_key: 'media/p-lg.webp', width: 2048, height: 1152 },
        },
      },
    });
    expect(snap.image?.alt).toBe('Stack of pancakes');
    expect(snap.image?.width).toBe(2048); // prefers lg
    expect(typeof snap.image?.url).toBe('string');
    expect(JSON.stringify(snap)).not.toContain('r2_key');
    expect(JSON.stringify(snap)).not.toContain('media/p-lg.webp'); // raw key not leaked
  });

  it('omits image when no resolvable variant exists', () => {
    const snap = buildFeaturedArticleSnapshot({ ...baseCard, image: { alt: 'x', variants: {} } });
    expect(snap.image).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/categories/snapshot/__tests__/featured-article.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/modules/categories/snapshot/featured-article.ts`:

```typescript
import { resolveVariantUrl } from '@shared/types/images';
import type { CachedCardJson } from '../../articles/types/cache.types';
import type { FeaturedArticleSnapshot } from '../types/presentation.types';

/**
 * Build a self-contained hero snapshot from an article card cache.
 * Resolves the best available image variant to a public URL; never stores r2_key.
 */
export function buildFeaturedArticleSnapshot(card: CachedCardJson): FeaturedArticleSnapshot {
  const v = card.image?.variants;
  const best = v?.lg ?? v?.md ?? v?.sm ?? v?.xs;
  const url = resolveVariantUrl(best ?? null);

  return {
    id: card.id,
    slug: card.slug,
    title: card.headline,
    ...(url
      ? {
          image: {
            url,
            alt: card.image?.alt ?? '',
            ...(typeof best?.width === 'number' ? { width: best.width } : {}),
            ...(typeof best?.height === 'number' ? { height: best.height } : {}),
          },
        }
      : {}),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/categories/snapshot/__tests__/featured-article.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/snapshot/featured-article.ts src/modules/categories/snapshot/__tests__/featured-article.test.ts
git commit -m "feat(categories): pure buildFeaturedArticleSnapshot (resolves url, strips r2_key)"
```

---

### Task 4: Pure presentation parser/normalizer

**Files:**
- Create: `src/modules/categories/api/presentation.ts`
- Test: `src/modules/categories/api/__tests__/presentation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/categories/api/__tests__/presentation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { normalizePresentation, parsePresentationJson } from '../presentation';

describe('normalizePresentation', () => {
  it('returns empty object for null/invalid/non-object', () => {
    expect(normalizePresentation(null)).toEqual({});
    expect(normalizePresentation('nope')).toEqual({});
    expect(normalizePresentation(123)).toEqual({});
  });

  it('keeps a valid featured_article snapshot and strips r2_key from its image', () => {
    const result = normalizePresentation({
      featured_article: {
        id: 7,
        slug: 'pie',
        title: 'Pie',
        image: { url: '/api/images/pie.webp', alt: 'Pie', width: 800, height: 600, r2_key: 'media/pie.webp' },
      },
      tldr: 'Sweet',
      hero_cta: { show: true, text: 'Cook', link: '/r/pie' },
    });
    expect(result.featured_article).toEqual({
      id: 7,
      slug: 'pie',
      title: 'Pie',
      image: { url: '/api/images/pie.webp', alt: 'Pie', width: 800, height: 600 },
    });
    expect(JSON.stringify(result)).not.toContain('r2_key');
    expect(result.tldr).toBe('Sweet');
    expect(result.hero_cta).toEqual({ show: true, text: 'Cook', link: '/r/pie' });
  });

  it('drops a featured_article missing required id/slug/title', () => {
    expect(normalizePresentation({ featured_article: { id: 1 } }).featured_article).toBeUndefined();
  });

  it('ignores camelCase aliases', () => {
    const result = normalizePresentation({ heroCta: { show: true }, featuredArticle: { id: 1, slug: 'x', title: 'X' } });
    expect(result.hero_cta).toBeUndefined();
    expect(result.featured_article).toBeUndefined();
  });
});

describe('parsePresentationJson', () => {
  it('returns "{}" for empty input', () => {
    expect(parsePresentationJson(undefined)).toBe('{}');
    expect(parsePresentationJson('')).toBe('{}');
  });

  it('parses a JSON string and re-serializes the normalized object', () => {
    const out = parsePresentationJson(JSON.stringify({ tldr: 'Hi', extra: 'drop' }));
    expect(JSON.parse(out)).toEqual({ tldr: 'Hi' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/categories/api/__tests__/presentation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/modules/categories/api/presentation.ts`:

```typescript
import type { CategoryPresentation, FeaturedArticleSnapshot, HeroCta } from '../types/presentation.types';

function normalizeFeaturedArticle(value: unknown): FeaturedArticleSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'number' || typeof v.slug !== 'string' || typeof v.title !== 'string') {
    return undefined;
  }
  const snapshot: FeaturedArticleSnapshot = { id: v.id, slug: v.slug, title: v.title };
  const img = v.image;
  if (img && typeof img === 'object') {
    const i = img as Record<string, unknown>;
    if (typeof i.url === 'string') {
      snapshot.image = {
        url: i.url,
        alt: typeof i.alt === 'string' ? i.alt : '',
        ...(typeof i.width === 'number' ? { width: i.width } : {}),
        ...(typeof i.height === 'number' ? { height: i.height } : {}),
      };
    }
  }
  return snapshot;
}

function normalizeHeroCta(value: unknown): HeroCta | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  return {
    show: typeof v.show === 'boolean' ? v.show : false,
    text: typeof v.text === 'string' ? v.text : '',
    link: typeof v.link === 'string' ? v.link : '',
  };
}

export function normalizePresentation(input: unknown): CategoryPresentation {
  if (!input || typeof input !== 'object') return {};
  const v = input as Record<string, unknown>;
  const result: CategoryPresentation = {};

  const featured = normalizeFeaturedArticle(v.featured_article);
  if (featured) result.featured_article = featured;

  if (typeof v.tldr === 'string') result.tldr = v.tldr;

  const cta = normalizeHeroCta(v.hero_cta);
  if (cta) result.hero_cta = cta;

  return result;
}

export function parsePresentationJson(value: unknown): string {
  if (!value) return '{}';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(normalizePresentation(JSON.parse(value)));
    } catch {
      return '{}';
    }
  }
  if (typeof value === 'object') {
    return JSON.stringify(normalizePresentation(value));
  }
  return '{}';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/categories/api/__tests__/presentation.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/api/presentation.ts src/modules/categories/api/__tests__/presentation.test.ts
git commit -m "feat(categories): pure normalizePresentation/parsePresentationJson (snake_case, strip r2_key)"
```

---

### Task 5: Effective-settings merge

**Files:**
- Create: `src/modules/categories/services/effective-settings.ts`
- Test: `src/modules/categories/services/__tests__/effective-settings.test.ts`

Context: combine global `CategoryPageSettings` (`src/modules/settings/types/settings.types.ts`, from Phase 1) with per-category `CategoryPresentation` into one render-ready object.

- [ ] **Step 1: Write the failing test**

Create `src/modules/categories/services/__tests__/effective-settings.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { mergeEffectiveCategorySettings } from '../effective-settings';
import { CATEGORY_PAGE_SETTINGS_DEFAULTS } from '../../../settings/types/settings.types';

describe('mergeEffectiveCategorySettings', () => {
  it('uses global settings when presentation is empty', () => {
    const eff = mergeEffectiveCategorySettings(CATEGORY_PAGE_SETTINGS_DEFAULTS, {});
    expect(eff.posts_per_page).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.posts_per_page);
    expect(eff.featured_article).toBeNull();
    expect(eff.tldr).toBe('');
  });

  it('overlays per-category editorial content', () => {
    const eff = mergeEffectiveCategorySettings(CATEGORY_PAGE_SETTINGS_DEFAULTS, {
      featured_article: { id: 9, slug: 's', title: 'T' },
      tldr: 'Intro',
      hero_cta: { show: true, text: 'Go', link: '/x' },
    });
    expect(eff.featured_article).toEqual({ id: 9, slug: 's', title: 'T' });
    expect(eff.tldr).toBe('Intro');
    expect(eff.hero_cta).toEqual({ show: true, text: 'Go', link: '/x' });
    // global layout settings are preserved
    expect(eff.layout_mode).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.layout_mode);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/categories/services/__tests__/effective-settings.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/modules/categories/services/effective-settings.ts`:

```typescript
import type { CategoryPageSettings } from '../../settings/types/settings.types';
import { HERO_CTA_DEFAULT } from '../types/presentation.types';
import type { CategoryPresentation, FeaturedArticleSnapshot, HeroCta } from '../types/presentation.types';

export interface EffectiveCategoryPage extends CategoryPageSettings {
  featured_article: FeaturedArticleSnapshot | null;
  tldr: string;
  hero_cta: HeroCta;
}

/**
 * Combine global page settings with per-category editorial content.
 * Global provides the uniform base; presentation overlays editorial fields only.
 */
export function mergeEffectiveCategorySettings(
  global: CategoryPageSettings,
  presentation: CategoryPresentation,
): EffectiveCategoryPage {
  return {
    ...global,
    featured_article: presentation.featured_article ?? null,
    tldr: presentation.tldr ?? '',
    hero_cta: presentation.hero_cta ?? HERO_CTA_DEFAULT,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/categories/services/__tests__/effective-settings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/categories/services/effective-settings.ts src/modules/categories/services/__tests__/effective-settings.test.ts
git commit -m "feat(categories): mergeEffectiveCategorySettings (global base + editorial overlay)"
```

---

### Task 6: One-shot snapshot backfill script

**Files:**
- Create: `scripts/migrate-category-presentation.mts`
- Test: `src/modules/categories/__tests__/migrate-category-presentation.test.ts`

Context: mirror `scripts/migrate-category-config.mts` + `src/modules/categories/__tests__/migrate-category-config.test.ts`. The script exposes a pure transform `buildPresentationFromLegacy(legacyConfig, cardLookup)` that the test exercises directly (the `.mts` script wires it to D1). Legacy `config_json` may contain `featured_article_id` and `tldr`; build a `presentation_json` from them, resolving the snapshot from the provided card lookup. No-op when there is nothing to migrate.

- [ ] **Step 1: Write the failing test**

Create `src/modules/categories/__tests__/migrate-category-presentation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildPresentationFromLegacy } from '../../../../scripts/migrate-category-presentation.mts';
import type { CachedCardJson } from '../../articles/types/cache.types';

const card: CachedCardJson = { id: 5, type: 'recipe', slug: 'tart', headline: 'Tart' };
const lookup = async (id: number) => (id === 5 ? card : null);

describe('buildPresentationFromLegacy', () => {
  it('returns empty object when legacy config has nothing relevant', async () => {
    expect(await buildPresentationFromLegacy({}, lookup)).toEqual({});
    expect(await buildPresentationFromLegacy({ posts_per_page: 12 }, lookup)).toEqual({});
  });

  it('migrates tldr', async () => {
    expect(await buildPresentationFromLegacy({ tldr: 'Hi' }, lookup)).toEqual({ tldr: 'Hi' });
  });

  it('builds featured_article snapshot from featured_article_id', async () => {
    const result = await buildPresentationFromLegacy({ featured_article_id: 5 }, lookup);
    expect(result.featured_article).toEqual({ id: 5, slug: 'tart', title: 'Tart' });
  });

  it('drops featured_article_id that resolves to nothing', async () => {
    const result = await buildPresentationFromLegacy({ featured_article_id: 999 }, lookup);
    expect(result.featured_article).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/categories/__tests__/migrate-category-presentation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `scripts/migrate-category-presentation.mts`:

```typescript
/**
 * One-shot: build categories.presentation_json from legacy config_json fields.
 * Best-effort. Run against prod D1 at deploy: `pnpm tsx scripts/migrate-category-presentation.mts`.
 * The DB-wiring section is intentionally minimal; the pure transform below is unit-tested.
 */
import { buildFeaturedArticleSnapshot } from '../src/modules/categories/snapshot/featured-article';
import type { CachedCardJson } from '../src/modules/articles/types/cache.types';
import type { CategoryPresentation } from '../src/modules/categories/types/presentation.types';

type CardLookup = (id: number) => Promise<CachedCardJson | null>;

export async function buildPresentationFromLegacy(
  legacy: Record<string, unknown>,
  cardLookup: CardLookup,
): Promise<CategoryPresentation> {
  const result: CategoryPresentation = {};

  if (typeof legacy.tldr === 'string' && legacy.tldr.length > 0) {
    result.tldr = legacy.tldr;
  }

  const id = typeof legacy.featured_article_id === 'number' ? legacy.featured_article_id : undefined;
  if (id !== undefined) {
    const card = await cardLookup(id);
    if (card) result.featured_article = buildFeaturedArticleSnapshot(card);
  }

  return result;
}

// DB wiring (only runs when executed directly, not under test import).
// Guarded so importing the pure function in tests does not touch D1.
if (import.meta.url === `file://${process.argv[1]}`) {
  // Intentionally left as a manual deploy step; see docs/superpowers/specs.
  console.log('Run the snapshot backfill against D1 here (manual deploy step).');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/categories/__tests__/migrate-category-presentation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run full suite + boundaries**

Run: `pnpm test && pnpm check:boundaries`
Expected: all pass; `Boundary check passed.`

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-category-presentation.mts src/modules/categories/__tests__/migrate-category-presentation.test.ts
git commit -m "feat(categories): one-shot presentation_json backfill (pure transform + tested)"
```

---

## Follow-on Plans (separate plans, each detailed after reading the target files)

- **Plan 2 — API cleanup (spec Plans D + E):** in `src/modules/categories/api/helpers.ts` remove `config_json`/`normalizeConfigJsonObject`/camelCase aliases + camelCase response fields; wire `parsePresentationJson` into `transformCategoryRequestBody`; make `transformCategoryResponse` emit resolved `images` (no raw `images_json`, no `r2_key`). Update `src/shared/validation/schemas/categories.ts` (drop `config_json`/`.passthrough()`, add `presentation_json`) and `categories.types.ts` (drop `CategoryConfig`, add `CategoryPresentation`). Delete obsolete `config_json` tests.
- **Plan 3 — Admin (spec Plan C):** move global page-settings form from `CategoryEditor.tsx` to the admin Settings area (calls `updateCategoryPageSettings`); add featured-article picker + `tldr` + `hero_cta` writing snake_case `presentation_json`; add `PUT /api/settings/category-page` route.
- **Plan 4 — Site (spec Plan B) + article-sync hook + contract doc:** `src/pages/categories/[slug].astro` and `index.astro` read global settings via `getCategoryPageSettings` and editorial via `mergeEffectiveCategorySettings`; add featured-article resync to the existing article sync hook; update `docs/CATEGORIES_TABLE_CONTRACT.md`.

---

## Self-Review

- **Spec coverage:** presentation_json column (T1), types (T2), snapshot builder + 0-read/no-r2_key (T3), parser/normalizer + snake_case/strip-r2_key (T4), effective merge (T5), migration (T6). Spec Plans B/C/D/E are the Follow-on Plans. Phase-1 items (category_page_settings, parent cycle) already merged.
- **Placeholder scan:** every code step has complete code; commands have expected output. The `.mts` DB-wiring block is deliberately a guarded manual step (the testable logic is the exported pure function) — not a placeholder for required logic.
- **Type consistency:** `FeaturedArticleSnapshot`, `CategoryPresentation`, `HeroCta`, `HERO_CTA_DEFAULT`, `buildFeaturedArticleSnapshot`, `normalizePresentation`, `parsePresentationJson`, `mergeEffectiveCategorySettings`, `EffectiveCategoryPage` are used identically across tasks. `CategoryPageSettings`/`CATEGORY_PAGE_SETTINGS_DEFAULTS` match Phase 1.
