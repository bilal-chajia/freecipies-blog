# Category Module Contract Compliance — Implementation Plan

> **Status: COMPLETED 2026-06-10** (Phase 1 + follow-on Plans B-E all merged to main).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Category module into compliance with `docs/CATEGORIES_TABLE_CONTRACT.md` and `docs/NAMING_CONTRACT.md` by moving per-page settings to global `site_settings.category_page_settings`, eliminating camelCase dual-handling, stopping `r2_key` leakage, and adding `parent_id` cycle protection.

**Architecture:** The `site_settings` table is key-value, so the new global settings need **no DDL** — they follow the existing `TocSettings` pattern (typed interface + `*_DEFAULTS` const + pure `normalize*` function + `get*/update*` service functions keyed by a settings key). The Category module then stops persisting `config_json` (a non-existent column today) and the public site reads page settings from the global key instead of per-category fields.

**Tech Stack:** Astro 6, Drizzle ORM (D1 SQLite), Zod 4, Vitest, TypeScript strict.

**Decision locked (2026-06-09):** Category page settings are **global** (`site_settings.category_page_settings`), per `docs/CATEGORIES_TABLE_CONTRACT.md:197-215`. The per-category `config_json` path is removed.

---

## Scope & Phasing

This plan is **Phase 1 (foundation) + the self-contained `parent_id` fix**, fully detailed below. The consumer-migration phases are large and touch admin/site files that must be read in detail at execution time; they are listed in **Follow-on Plans** and must each get their own plan before execution. Phase 1 produces working, tested software on its own (the global settings storage + the cycle guard) without breaking current behavior.

## File Structure

| File | Responsibility | Phase |
| --- | --- | --- |
| `src/modules/settings/types/settings.types.ts` | Add `CategoryPageSettings` type, `CATEGORY_PAGE_SETTINGS_DEFAULTS`, pure `normalizeCategoryPageSettings` | 1 |
| `src/modules/settings/services/__tests__/category-page-settings.test.ts` | Pure-function tests for the normalizer (mirrors `settings.service.test.ts`) | 1 |
| `src/modules/settings/services/settings.service.ts` | Add `getCategoryPageSettings` / `updateCategoryPageSettings` (key `category_page_settings`) | 1 |
| `src/modules/categories/services/categories.service.ts` | Add pure `wouldCreateParentCycle` + wire cycle guard into both update functions | 1 |
| `src/modules/categories/services/__tests__/parent-cycle.test.ts` | Pure-function tests for cycle detection | 1 |

---

### Task 1: `CategoryPageSettings` type, defaults, and pure normalizer

**Files:**
- Modify: `src/modules/settings/types/settings.types.ts` (append at end, after `PUBLIC_SOCIAL_LINKS_DEFAULTS`)
- Test: `src/modules/settings/services/__tests__/category-page-settings.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/modules/settings/services/__tests__/category-page-settings.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  CATEGORY_PAGE_SETTINGS_DEFAULTS,
  normalizeCategoryPageSettings,
  type CategoryPageSettings,
} from '../../types/settings.types';

describe('normalizeCategoryPageSettings', () => {
  it('fills missing fields from defaults', () => {
    expect(normalizeCategoryPageSettings(null)).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
    expect(normalizeCategoryPageSettings(undefined)).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
    expect(normalizeCategoryPageSettings({})).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
  });

  it('keeps canonical snake_case overrides', () => {
    const overrides: Partial<CategoryPageSettings> = {
      posts_per_page: 24,
      layout_mode: 'list',
      show_sidebar: false,
      article_sort_order: 'asc',
    };

    expect(normalizeCategoryPageSettings(overrides)).toEqual({
      ...CATEGORY_PAGE_SETTINGS_DEFAULTS,
      ...overrides,
    });
  });

  it('ignores camelCase aliases', () => {
    const legacy = {
      postsPerPage: 99,
      layoutMode: 'masonry',
      showSidebar: false,
    } as Partial<CategoryPageSettings>;

    const result = normalizeCategoryPageSettings(legacy);

    expect(result.posts_per_page).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.posts_per_page);
    expect(result.layout_mode).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.layout_mode);
    expect(result.show_sidebar).toBe(CATEGORY_PAGE_SETTINGS_DEFAULTS.show_sidebar);
    expect(JSON.stringify(result)).not.toContain('postsPerPage');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/settings/services/__tests__/category-page-settings.test.ts`
Expected: FAIL — `normalizeCategoryPageSettings` / `CATEGORY_PAGE_SETTINGS_DEFAULTS` not exported.

- [x] **Step 3: Write minimal implementation**

Append to `src/modules/settings/types/settings.types.ts`:

```typescript
export interface CategoryPageSettings {
  posts_per_page: number;
  layout_mode: 'grid' | 'list' | 'masonry';
  card_style: 'compact' | 'full' | 'minimal';
  show_sidebar: boolean;
  show_filters: boolean;
  show_breadcrumb: boolean;
  article_sort_by: 'published_at' | 'title' | 'view_count';
  article_sort_order: 'asc' | 'desc';
  header_style: 'hero' | 'minimal' | 'none';
}

export const CATEGORY_PAGE_SETTINGS_DEFAULTS: CategoryPageSettings = {
  posts_per_page: 12,
  layout_mode: 'grid',
  card_style: 'full',
  show_sidebar: true,
  show_filters: true,
  show_breadcrumb: true,
  article_sort_by: 'published_at',
  article_sort_order: 'desc',
  header_style: 'hero',
};

export type CategoryPageSettingsInput = Partial<CategoryPageSettings> | null | undefined;

export function normalizeCategoryPageSettings(
  input: CategoryPageSettingsInput,
): CategoryPageSettings {
  const c = input ?? {};
  return {
    posts_per_page: typeof c.posts_per_page === 'number' ? c.posts_per_page : CATEGORY_PAGE_SETTINGS_DEFAULTS.posts_per_page,
    layout_mode: c.layout_mode ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.layout_mode,
    card_style: c.card_style ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.card_style,
    show_sidebar: typeof c.show_sidebar === 'boolean' ? c.show_sidebar : CATEGORY_PAGE_SETTINGS_DEFAULTS.show_sidebar,
    show_filters: typeof c.show_filters === 'boolean' ? c.show_filters : CATEGORY_PAGE_SETTINGS_DEFAULTS.show_filters,
    show_breadcrumb: typeof c.show_breadcrumb === 'boolean' ? c.show_breadcrumb : CATEGORY_PAGE_SETTINGS_DEFAULTS.show_breadcrumb,
    article_sort_by: c.article_sort_by ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.article_sort_by,
    article_sort_order: c.article_sort_order ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.article_sort_order,
    header_style: c.header_style ?? CATEGORY_PAGE_SETTINGS_DEFAULTS.header_style,
  };
}
```

Note: the camelCase-alias test passes because `normalize` only reads known snake_case keys; unknown camelCase keys are never copied (matches the `normalizeTocSettings` contract behavior).

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/settings/services/__tests__/category-page-settings.test.ts`
Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/modules/settings/types/settings.types.ts src/modules/settings/services/__tests__/category-page-settings.test.ts
git commit -m "feat(settings): add global category_page_settings type, defaults, normalizer"
```

---

### Task 2: `get`/`update` service functions for category page settings

**Files:**
- Modify: `src/modules/settings/services/settings.service.ts` (add after `getTocSettings`/`updateTocSettings`, reusing the existing imports block at lines 242-256)
- Test: covered by Task 1's normalizer tests + a smoke assertion below

- [x] **Step 1: Write the failing test**

Append to `src/modules/settings/services/__tests__/category-page-settings.test.ts`:

```typescript
import {
  getCategoryPageSettings,
  updateCategoryPageSettings,
} from '../settings.service';

function makeFakeDb() {
  const store = new Map<string, string>();
  const drizzle = {
    query: {
      siteSettings: {
        findFirst: async ({ where: _w }: { where: unknown }) => {
          // single-key store; the service calls getSetting(key) which we emulate by key capture
          return undefined;
        },
      },
    },
  };
  return { store, drizzle };
}

describe('category page settings service (defaults path)', () => {
  it('returns defaults when nothing stored', async () => {
    // Minimal D1-like stub: getSetting -> null, so service returns defaults
    const db = {
      prepare: () => ({ bind: () => ({ first: async () => null, all: async () => ({ results: [] }) }) }),
    } as never;
    const result = await getCategoryPageSettings(db);
    expect(result).toEqual(CATEGORY_PAGE_SETTINGS_DEFAULTS);
    expect(typeof updateCategoryPageSettings).toBe('function');
  });
});
```

> Execution note: if the existing Drizzle test harness in this repo provides a real in-memory D1 (check `src/test` / `vitest.setup`), prefer it over the stub and assert a full round-trip (`update` then `get`). Use the stub only if no harness exists. Do not weaken the assertion below the defaults check.

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/settings/services/__tests__/category-page-settings.test.ts`
Expected: FAIL — `getCategoryPageSettings` not exported.

- [x] **Step 3: Write minimal implementation**

In `src/modules/settings/services/settings.service.ts`, add `CategoryPageSettings`, `CATEGORY_PAGE_SETTINGS_DEFAULTS`, `normalizeCategoryPageSettings`, and `CategoryPageSettingsInput` to the existing type import from `'../types/settings.types'` (the block at lines 242-256). Then append:

```typescript
// ============================================
// CATEGORY PAGE SETTINGS (global, per CATEGORIES_TABLE_CONTRACT.md)
// ============================================

const CATEGORY_PAGE_SETTINGS_KEY = 'category_page_settings';

export async function getCategoryPageSettings(
  db: D1Database | DrizzleDb,
  options?: SettingServiceOptions,
): Promise<CategoryPageSettings> {
  const stored = await getSettingValue<CategoryPageSettingsInput>(db, CATEGORY_PAGE_SETTINGS_KEY, options);
  return normalizeCategoryPageSettings(stored);
}

export async function updateCategoryPageSettings(
  db: D1Database | DrizzleDb,
  updates: CategoryPageSettingsInput,
  options?: SettingServiceOptions,
): Promise<CategoryPageSettings> {
  const current = await getCategoryPageSettings(db);
  const merged = normalizeCategoryPageSettings({ ...current, ...normalizeCategoryPageSettings(updates) });

  await upsertSetting(db, CATEGORY_PAGE_SETTINGS_KEY, merged, {
    description: 'Global category page display settings',
    category: 'appearance',
    type: 'json',
    cache: options?.cache,
  });

  return merged;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/settings/services/__tests__/category-page-settings.test.ts`
Expected: PASS.

- [x] **Step 5: Run full settings tests + boundaries**

Run: `pnpm vitest run src/modules/settings && pnpm check:boundaries`
Expected: PASS; `Boundary check passed.`

- [x] **Step 6: Commit**

```bash
git add src/modules/settings/services/settings.service.ts src/modules/settings/services/__tests__/category-page-settings.test.ts
git commit -m "feat(settings): add get/update service for global category_page_settings"
```

---

### Task 3: `parent_id` cycle validation (contract: CATEGORIES_TABLE_CONTRACT.md:192)

**Files:**
- Modify: `src/modules/categories/services/categories.service.ts`
- Test: `src/modules/categories/services/__tests__/parent-cycle.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/modules/categories/services/__tests__/parent-cycle.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { wouldCreateParentCycle } from '../categories.service';

// parentOf: id -> parent_id (null = root)
function lookup(map: Record<number, number | null>) {
  return async (id: number): Promise<number | null> => (id in map ? map[id] : null);
}

describe('wouldCreateParentCycle', () => {
  it('returns false for root (no parent)', async () => {
    expect(await wouldCreateParentCycle(1, null, lookup({}))).toBe(false);
    expect(await wouldCreateParentCycle(1, undefined, lookup({}))).toBe(false);
  });

  it('detects self-parenting', async () => {
    expect(await wouldCreateParentCycle(5, 5, lookup({}))).toBe(true);
  });

  it('detects an indirect cycle (5 -> 3 -> 5)', async () => {
    // Setting 5.parent = 3, where 3.parent already = 5
    expect(await wouldCreateParentCycle(5, 3, lookup({ 3: 5 }))).toBe(true);
  });

  it('allows a valid deeper parent', async () => {
    // Setting 5.parent = 3, chain 3 -> 1 -> root, no 5 in chain
    expect(await wouldCreateParentCycle(5, 3, lookup({ 3: 1, 1: null }))).toBe(false);
  });

  it('terminates on a pre-existing cycle not involving the target', async () => {
    // 3 -> 2 -> 3 loop; target 9 never appears
    expect(await wouldCreateParentCycle(9, 3, lookup({ 3: 2, 2: 3 }))).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/modules/categories/services/__tests__/parent-cycle.test.ts`
Expected: FAIL — `wouldCreateParentCycle` not exported.

- [x] **Step 3: Write minimal implementation**

In `src/modules/categories/services/categories.service.ts`, add the pure helper near `calculateDepth`:

```typescript
/**
 * Returns true if setting `categoryId`'s parent to `newParentId` would create a cycle.
 * Pure: walks the parent chain via the injected resolver. Guards against
 * pre-existing loops with a visited set.
 */
export async function wouldCreateParentCycle(
  categoryId: number,
  newParentId: number | null | undefined,
  getParentId: (id: number) => Promise<number | null>,
): Promise<boolean> {
  if (newParentId === null || newParentId === undefined) return false;
  let currentId: number | null = newParentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (currentId === categoryId) return true;
    if (visited.has(currentId)) return false;
    visited.add(currentId);
    currentId = await getParentId(currentId);
  }
  return false;
}
```

Then guard both update functions. In `updateCategory` (after `if (!existing) return null;`) and in `updateCategoryById` (after its `if (!existing) return null;`), insert before the depth recalculation:

```typescript
  if (category.parent_id !== undefined) {
    const cycle = await wouldCreateParentCycle(
      existing.id,
      category.parent_id,
      async (id) => (await getCategoryById(db, id))?.parent_id ?? null,
    );
    if (cycle) {
      const error = new Error('parent_id would create a category cycle');
      (error as { code?: string }).code = 'VALIDATION_ERROR';
      throw error;
    }
  }
```

(For `updateCategory`, `existing.id` is already loaded; for `updateCategoryById`, use the `id` parameter.)

The API routes already map `(error as any)?.code === 'VALIDATION_ERROR'` to a 400 `AppError` (see `src/pages/api/categories/index.ts:61`), so no route change is needed.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/modules/categories/services/__tests__/parent-cycle.test.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Run full suite + boundaries**

Run: `pnpm test && pnpm check:boundaries`
Expected: all tests PASS; `Boundary check passed.`

- [x] **Step 6: Commit**

```bash
git add src/modules/categories/services/categories.service.ts src/modules/categories/services/__tests__/parent-cycle.test.ts
git commit -m "feat(categories): reject parent_id changes that create cycles (contract)"
```

---

## Follow-on Plans (require their own plan before execution)

These migrate the consumers and remove the contract-violating `config_json` / camelCase / `r2_key` paths. Each must be detailed in its own plan after reading the named files, because the exact edits depend on their current contents.

**Plan B — Site reads global category page settings**
- `src/pages/categories/[slug].astro` (currently reads `category.posts_per_page`, `category.layout_mode`): replace with `getCategoryPageSettings(env.DB)`.
- `src/pages/categories/index.astro`: same source for layout/paging.
- Acceptance: category pages honor the global settings; no read of per-category config fields remains.

**Plan C — Admin global settings UI**
- Move category page settings UI out of `src/admin/features/categories/pages/CategoryEditor.tsx` into the admin Settings area; call a new `PUT /api/settings/category-page` backed by `updateCategoryPageSettings`.
- Remove the per-category config form fields from `CategoryEditor.tsx`.

**Plan D — Remove `config_json` + camelCase from the Category module (NAMING_CONTRACT)**
- `src/modules/categories/api/helpers.ts`: delete `parseConfigJson`, `normalizeConfigJsonObject`, the `config_json` branch in `transformCategoryRequestBody`, all camelCase request aliases (lines ~256-338), and the camelCase response emission (`imageAlt`/`imageWidth`/`imageHeight` at ~442-444).
- `src/shared/validation/schemas/categories.ts`: drop `config_json`; remove `.passthrough()` so unknown keys are rejected.
- `src/modules/categories/types/categories.types.ts`: delete `CategoryConfig` and config fields on `HydratedCategory`.
- `src/modules/categories/api/__tests__/helpers.test.ts`: delete the `config_json` test cases; keep image/SEO snake_case tests.
- Update `docs/NAMING_CONTRACT.md` only if needed.

**Plan E — Stop `r2_key` leakage in category responses (IMAGE_JSON_CONTRACT + CLAUDE.md hard rule)**
- `src/modules/categories/api/helpers.ts` `transformCategoryResponse`: do not spread raw `images_json`; emit a resolved `images` object whose variants use public `url` (via `resolveVariantUrl`) and strip `r2_key`. Migrate consumers (`src/site/components/*`, `src/admin/features/categories/*`) that read `image_url`/`imageAlt` to the resolved shape.

---

## Self-Review

- **Spec coverage:** Findings #1 (config_json → global settings: foundation here in Tasks 1-2; consumer migration in Plans B-D), #2 camelCase (Plan D), #3 r2_key (Plan E), #4 camelCase image fields (Plan D/E), #5 parent_id cycle (Task 3 here). All five mapped.
- **Placeholder scan:** Tasks 1-3 contain full code and exact commands. Follow-on plans are explicitly marked as not-yet-detailed (not executable steps).
- **Type consistency:** `CategoryPageSettings`, `CATEGORY_PAGE_SETTINGS_DEFAULTS`, `normalizeCategoryPageSettings`, `CategoryPageSettingsInput`, `wouldCreateParentCycle` names are identical across tasks and the service wiring.
