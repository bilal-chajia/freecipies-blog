# Homepage P2 + Site Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close four homepage gaps — N+1 query on manual refs, hero/latest duplication, hidden `<h1>`, and incomplete admin P2 (drag-reorder + real pickers) — without touching contracts or the `homepage_settings` storage shape.

**Architecture:** Three sequential phases (A=site, B=admin drag-reorder, C=admin pickers), mutually independent. Site work adds one batched Drizzle read (`getArticlesByIds`) and a trending fallback. Admin work replaces Up/Down buttons with dnd-kit and read-only textareas with real pickers. No new endpoints, no contract changes, no raw SQL.

**Tech Stack:** Astro SSR, React 19 + react-router-dom, TypeScript strict, Drizzle ORM, Zod, dnd-kit (already installed), Vitest, Tailwind/shadcn, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-19-homepage-p2-and-fixes-design.md`

**Branch:** continue on `feat/homepage-config-redesign`

**Non-negotiable constraints:**
- Drizzle ORM only — no raw SQL. Use builders (`inArray`, `isNull`, `and`, `.orderBy(desc(...))`).
- snake_case in JSON/API; camelCase in TS only.
- Admin must not import `@server/*` (`pnpm check:boundaries` enforces it).
- Every `<img>` needs `width`, `height`, `loading="lazy"`.
- Do NOT run `pnpm build` or `pnpm preview` without explicit user approval.
- Do NOT modify any `docs/*.md` contract.

---

## File Structure

| File | Responsibility | Phase |
|---|---|---|
| `src/modules/articles/services/articles.service.ts` | Add `getArticlesByIds` (batched Drizzle read, order-preserving). | A |
| `src/modules/articles/index.ts` | Barrel (wildcard-reexports service; verify `getArticlesByIds` is exported). | A |
| `src/site/utils/home-data.ts` | Drop `resolveArticlesByIds`, use `getArticlesByIds`; add `trendingRecipes`. | A |
| `src/site/utils/__tests__/home-data.test.ts` | Update mocks; add trending + hero-fallback tests. | A |
| `src/pages/index.astro` | Add visible `<h1>` band above `<HomeSections>`. | A |
| `src/admin/features/homepage/components/SortableSectionRow.tsx` | New: dnd-kit sortable nav row with grip handle. | B |
| `src/admin/features/homepage/components/index.ts` | Export `SortableSectionRow`. | B |
| `src/admin/features/homepage/components/HomepageLayout.tsx` | Replace Up/Down buttons with `DndContext` + `SortableContext`. | B |
| `src/admin/features/homepage/pages/Homepage.tsx` | Replace `moveSection` with `reorderSections` (arrayMove). | B |
| `src/admin/components/pickers/RoundupPicker.tsx` | New: single-select roundup picker (`/api/articles?type=roundup`). | C |
| `src/admin/components/pickers/AuthorPicker.tsx` | New: single-select author picker (`/api/authors`). | C |
| `src/admin/components/pickers/index.ts` | Export new pickers. | C |
| `src/admin/features/homepage/components/RecipeRefList.tsx` | New: ordered recipe ref list (add/drag/remove/dedupe). | C |
| `src/admin/features/homepage/components/RoundupRefList.tsx` | New: ordered roundup ref list. | C |
| `src/admin/features/homepage/utils/ref-mappers.ts` | New: pure mapping + dedupe functions. | C |
| `src/admin/features/homepage/utils/__tests__/ref-mappers.test.ts` | Unit tests for mappers/dedupe. | C |
| `src/admin/features/homepage/pages/sections/HeroSection.tsx` | Replace textarea with `<RecipeRefList>`. | C |
| `src/admin/features/homepage/pages/sections/FeaturedSection.tsx` | Replace textarea with `<RecipeRefList>` (manual only). | C |
| `src/admin/features/homepage/pages/sections/CollectionsSection.tsx` | Replace textarea with `<RoundupRefList>`. | C |
| `src/admin/features/homepage/pages/sections/AboutSection.tsx` | Replace number input with `<AuthorPicker>`. | C |

---

# Phase A — Site (independent of admin)

## Task A1: Add `getArticlesByIds` (TDD)

**Files:**
- Create: `src/modules/articles/services/__tests__/articles-by-ids.test.ts`
- Modify: `src/modules/articles/services/articles.service.ts` (add function after `getArticleById`, ~line 475)

- [ ] **Step 1: Inspect the existing service test setup to copy the mocking pattern**

Open `src/modules/articles/services/__tests__/` (or the nearest existing articles service test). Identify how tests construct a mock `drizzle(db)` (the codebase uses `getDb(db)`; the existing `home-data.test.ts` and `homepage-settings-service.test.ts` mock at the module boundary). The new test must mock `articles.service`'s internal Drizzle call. If no articles-service unit test with DB mock exists, model the mock on how `getArticleById` is consumed in `src/site/utils/__tests__/home-data.test.ts`.

- [ ] **Step 2: Write the failing test for empty input**

Create `src/modules/articles/services/__tests__/articles-by-ids.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getArticlesByIds } from '../articles.service';

// Mock the drizzle getDb to return a controllable stub.
const where = vi.fn(() => Promise.resolve([]));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));

vi.mock('../../../../shared/database/drizzle', () => ({
  getDb: () => ({ select }),
}));

describe('getArticlesByIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns [] without querying when ids is empty', async () => {
    const result = await getArticlesByIds({} as never, []);
    expect(result).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- articles-by-ids`
Expected: FAIL — `getArticlesByIds is not a function` (not yet implemented).

- [ ] **Step 4: Write the failing tests for non-empty input, order, dedupe, missing**

Append to the same test file:

```ts
// Helper: build mock rows the way the service SELECT will return them.
function mockRows(...rows: Array<Record<string, unknown>>) {
  where.mockReset();
  from.mockReset();
  select.mockReset();
  select.mockReturnValue({ from });
  from.mockReturnValue({ where });
  where.mockResolvedValue(rows);
}

const baseRow = (id: number) => ({
  id, slug: `slug-${id}`, type: 'recipe', headline: `Recipe ${id}`,
  short_description: 'desc', images_json: '{}', content_json: null,
  recipe_json: null, roundup_json: null, faqs_json: null, seo_json: null,
  cached_category_json: JSON.stringify({ id: 3, label: 'Dinner', slug: 'dinner', color: '#fff' }),
  cached_author_json: null, cached_recipe_json: null, cached_rating_json: null,
  cached_tags_json: '[]', deleted_at: null,
});

it('returns rows in the order of input ids', async () => {
  mockRows(baseRow(1), baseRow(2), baseRow(3));
  const result = await getArticlesByIds({} as never, [3, 1, 2]);
  expect(result.map((r) => r.id)).toEqual([3, 1, 2]);
});

it('drops ids that do not resolve (no crash)', async () => {
  mockRows(baseRow(1)); // only id 1 resolves
  const result = await getArticlesByIds({} as never, [1, 999]);
  expect(result.map((r) => r.id)).toEqual([1]);
});

it('dedupes duplicate ids, preserving first-seen order', async () => {
  mockRows(baseRow(1), baseRow(2));
  const result = await getArticlesByIds({} as never, [1, 1, 2]);
  expect(result.map((r) => r.id)).toEqual([1, 2]);
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `pnpm test -- articles-by-ids`
Expected: FAIL (function still missing).

- [ ] **Step 6: Implement `getArticlesByIds`**

In `src/modules/articles/services/articles.service.ts`, add immediately after the `getArticleById` function (after line 475). Import `getTableColumns` is already imported at the top (line 9). `inArray`, `isNull`, `and` are already imported (line 7).

```ts
/**
 * Get hydrated articles for a list of ids, in input order, in a single query.
 *
 * Selects source columns plus the cache fields consumed by card/list surfaces
 * (per ARTICLE_CACHED_FIELDS_CONTRACT.md Public Rendering Matrix), then hydrates.
 * Does NOT join categories/authors and does NOT regenerate caches — it reads
 * whatever cache is present and hydrateArticle resolves category/author/images/route.
 */
export async function getArticlesByIds(
  db: D1Database | DrizzleDb,
  ids: number[],
): Promise<HydratedArticle[]> {
  if (ids.length === 0) return [];

  const drizzle = getDb(db);
  const uniqueIds = Array.from(new Set(ids));

  const rows = await drizzle
    .select({
      ...getTableColumns(articles),
      categoryLabel: categories.label,
      categorySlug: categories.slug,
      categoryColor: categories.color,
      authorName: authors.name,
      authorSlug: authors.slug,
      authorImagesJson: authors.images_json,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.category_id, categories.id))
    .leftJoin(authors, eq(articles.author_id, authors.id))
    .where(and(inArray(articles.id, uniqueIds), isNull(articles.deleted_at)));

  const hydratedById = new Map<number, HydratedArticle>();
  for (const row of rows) {
    hydratedById.set(row.id, { ...hydrateArticle(row), tags: [] } as unknown as HydratedArticle);
  }

  return uniqueIds
    .map((id) => hydratedById.get(id))
    .filter((row): row is HydratedArticle => row !== undefined);
}
```

> Note: the SELECT intentionally mirrors `getArticleById`'s shape (joins on category/author are cheap, and `hydrateArticle` accepts the camelCase join inputs `categoryLabel`/`authorName`/etc. and consumes them). This keeps the function a true drop-in for the current `resolveArticlesByIds`. Tags are set to `[]` because hero/featured/collections do not read tags (decision #3). If a future surface needs tags, extend here.

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test -- articles-by-ids`
Expected: PASS (4 tests).

- [ ] **Step 8: Verify barrel re-exports it**

`src/modules/articles/index.ts` wildcard-reexports `./services/articles.service`. Confirm `getArticlesByIds` is available:

Run: `pnpm typecheck`
Expected: PASS (no missing-export error in consumers).

- [ ] **Step 9: Commit**

```bash
git add src/modules/articles/services/articles.service.ts src/modules/articles/services/__tests__/articles-by-ids.test.ts
git commit -m "feat(articles): add getArticlesByIds batched read"
```

---

## Task A2: Use `getArticlesByIds` in `home-data.ts`

**Files:**
- Modify: `src/site/utils/home-data.ts`
- Modify: `src/site/utils/__tests__/home-data.test.ts`

- [ ] **Step 1: Read the current `home-data.test.ts` to see how it mocks `getArticleById`**

Open `src/site/utils/__tests__/home-data.test.ts`. Note how `getArticleById` is mocked (likely via `vi.mock('@modules/articles', ...)`). The mock will be replaced by a `getArticlesByIds` mock.

- [ ] **Step 2: Update the test mocks to use `getArticlesByIds`**

In `src/site/utils/__tests__/home-data.test.ts`, replace the `getArticleById` mock with a `getArticlesByIds` mock. For every test that previously set up `getArticleById` to return specific rows, reconfigure `getArticlesByIds` to resolve the corresponding ids. Example shape:

```ts
vi.mock('@modules/articles', () => ({
  getArticles: vi.fn(),
  getArticlesByIds: vi.fn(async (_db: unknown, ids: number[]) =>
    ids.map((id) => ({ id, slug: `slug-${id}`, type: 'recipe', headline: `R${id}`, /* ...minimal hydrated fields */ })),
  ),
  // keep getArticleById mock if other tests still reference it, then assert it is NOT called
  getArticleById: vi.fn(),
}));
```

After each resolver call in tests that use manual refs, assert the loop is gone:

```ts
expect(getArticleById).not.toHaveBeenCalled();
expect(getArticlesByIds).toHaveBeenCalled();
```

- [ ] **Step 3: Run tests to confirm they fail (resolver still calls the old helper)**

Run: `pnpm test -- home-data`
Expected: FAIL — resolver still imports/calls `getArticleById`.

- [ ] **Step 4: Modify the resolver to use `getArticlesByIds`**

In `src/site/utils/home-data.ts`:

Change line 2 import:
```ts
import { getArticles, getArticleById } from '@modules/articles';
```
to:
```ts
import { getArticles, getArticlesByIds } from '@modules/articles';
```

Delete the `resolveArticlesByIds` helper (lines 37-40).

Replace its 3 call sites (hero line 70, featured line 79, collections line 99):
- `await resolveArticlesByIds(db, section.refs.map((ref) => ref.article_id))` → `await getArticlesByIds(db, section.refs.map((ref) => ref.article_id))`
- `await resolveArticlesByIds(db, section.refs.map((ref) => ref.roundup_id))` → `await getArticlesByIds(db, section.refs.map((ref) => ref.roundup_id))`

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- home-data`
Expected: PASS. Existing resolver tests stay green; `getArticleById` is no longer called.

- [ ] **Step 6: Commit**

```bash
git add src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts
git commit -m "refactor(home): resolve manual refs via getArticlesByIds (drop N+1)"
```

---

## Task A3: Add `trendingRecipes` fallback for the hero (TDD)

**Files:**
- Modify: `src/site/utils/home-data.ts`
- Modify: `src/site/utils/__tests__/home-data.test.ts`

- [ ] **Step 1: Verify `getArticles` supports `sortBy: 'view_count'`**

Open `src/modules/articles/services/articles.service.ts` lines 184-192. Confirm the sort dispatcher already handles `sortBy === 'view_count'` (it does, mapped to `articles.view_count`). No change needed to `ArticleQueryOptions` (the `'view_count'` literal is already in the union type at line 90).

- [ ] **Step 2: Write failing tests for the trending fallback**

Append to `src/site/utils/__tests__/home-data.test.ts`:

```ts
import { getArticles, getArticlesByIds } from '@modules/articles';

describe('resolveHomeData — hero fallback', () => {
  it('uses trending (view_count desc) when hero has no refs', async () => {
    getArticles.mockReset();
    // trending call returns recipes ordered by view_count
    getArticles.mockImplementation(async (_db: unknown, opts?: any) => {
      if (opts?.sortBy === 'view_count') {
        return { items: [{ id: 100, slug: 'trend', type: 'recipe', headline: 'Trend' }], total: 1 };
      }
      // latest fallback
      return { items: [{ id: 1, slug: 'latest', type: 'recipe', headline: 'Latest' }], total: 1 };
    });

    const vms = await resolveHomeData(
      [{ id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] }],
      { db: {} as never, stories: [] },
    );

    const hero = vms.find((v) => v.kind === 'hero');
    expect(hero).toBeDefined();
    expect((hero as any).recipes[0].id).toBe(100); // trending, not latest
    expect(getArticles).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sortBy: 'view_count' }));
  });

  it('returns empty recipes (no trending) when hero refs are all dead', async () => {
    getArticlesByIds.mockResolvedValue([]); // all refs soft-deleted
    const vms = await resolveHomeData(
      [{ id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false,
         refs: [{ article_id: 7, headline: 'gone', route: '/recipes/gone' }] }],
      { db: {} as never, stories: [] },
    );
    const hero = vms.find((v) => v.kind === 'hero');
    expect((hero as any).recipes).toEqual([]);
    expect(getArticles).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sortBy: 'view_count' }));
  });

  it('caches trending so two hero-fallback sections do one DB call', async () => {
    getArticles.mockReset();
    getArticles.mockResolvedValue({ items: [{ id: 9, slug: 't', type: 'recipe', headline: 'T' }], total: 1 });
    await resolveHomeData(
      [
        { id: 'hero', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
        { id: 'hero2', type: 'hero', enabled: true, mode: 'slider', show_search: false, refs: [] },
      ],
      { db: {} as never, stories: [] },
    );
    const trendingCalls = (getArticles as jest.Mock).mock.calls.filter((c) => c[1]?.sortBy === 'view_count');
    expect(trendingCalls).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test -- home-data`
Expected: FAIL — hero fallback still uses `latestRecipes` (returns id 1, not 100).

- [ ] **Step 4: Implement `trendingRecipes` and wire it into the hero case**

In `src/site/utils/home-data.ts`, add a `trendingCache` next to `latestCache` (after line 49):

```ts
let trendingCache: HydratedArticle[] | null = null;
const trendingRecipes = async (count: number): Promise<HydratedArticle[]> => {
  if (trendingCache === null) {
    const { items } = await getArticles(db, {
      type: 'recipe',
      workflow_status: 'published',
      sortBy: 'view_count',
      sort_order: 'desc',
      limit: 24,
    });
    trendingCache = items;
  }
  return trendingCache.slice(0, count);
};
```

In the `hero` case (current lines 68-74), change the `refs.length === 0` branch from `latestRecipes(4)` to `trendingRecipes(4)`:

```ts
case 'hero': {
  const recipes = section.refs.length > 0
    ? await getArticlesByIds(db, section.refs.map((ref) => ref.article_id))
    : await trendingRecipes(4);
  vms.push({ kind: 'hero', section, recipes });
  break;
}
```

Leave the `latest` case unchanged (it still uses `latestRecipes`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- home-data`
Expected: PASS (all resolver tests including the 3 new ones).

- [ ] **Step 6: Commit**

```bash
git add src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts
git commit -m "feat(home): diversify hero fallback with trending (view_count desc)"
```

---

## Task A4: Add the visible `<h1>` band to `index.astro`

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Read current `index.astro`**

Open `src/pages/index.astro`. The `<h1 class="home-h1">` is at line 45, its visually-hidden CSS at lines 54-66. The `<main class="homepage">` wraps `<HomeSections>`.

- [ ] **Step 2: Replace the hidden h1 with a visible band**

Replace the `<h1 class="home-h1">{identity.tagline || identity.site_name}</h1>` line with a band block:

```astro
<header class="home-intro" data-fade-up>
  <p class="home-intro__eyebrow">Welcome</p>
  <h1 class="home-intro__title">{identity.tagline || identity.site_name}</h1>
</header>
```

Place it immediately before `<main class="homepage">` (so it sits above `<HomeSections>` but is still inside `<Layout>`).

- [ ] **Step 3: Replace the `.home-h1` hidden CSS with visible band styles**

In the `<style>` block, remove the `.home-h1` visually-hidden rule and add:

```css
.home-intro {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: clamp(var(--space-8), 6vw, var(--space-14)) var(--space-5) clamp(var(--space-4), 2vw, var(--space-6));
  text-align: center;
}

.home-intro__eyebrow {
  margin: 0 0 var(--space-2);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: var(--text-lg);
  color: var(--brand-accent);
}

.home-intro__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 1.4rem + 2.6vw, 3.4rem);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: 0;
  color: var(--text);
  max-width: 22ch;
  margin-inline: auto;
}

@media (max-width: 640px) {
  .home-intro { text-align: left; }
  .home-intro__title { margin-inline: 0; }
}
```

If `--leading-tight` is not a defined token, check `src/shared/design-tokens.css`; if absent, use a literal `1.1`.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Static verification (no build)**

Run `pnpm dev` (ask user first before opening a browser). In the served HTML, confirm:
- Exactly ONE `<h1>` present (DevTools: `document.querySelectorAll('h1').length === 1`).
- Its text is the site tagline.
- The hero recipe titles below are still `<h2>` (`document.querySelectorAll('.home-hero h2').length > 0`).

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): surface visible h1 tagline band above hero"
```

---

## Task A5: Phase A gate

**Files:** none.

- [ ] **Step 1: Run all gates**

Run:
```bash
pnpm typecheck
pnpm check:boundaries
pnpm test
```
Expected: all PASS (394 baseline + the new articles-by-ids + trending tests).

- [ ] **Step 2: Manual browser checkpoint (ask user)**

Ask the user to confirm in `pnpm dev`: homepage shows one visible `<h1>` band, hero renders trending recipes when no manual refs are set, hero renders curated recipes when refs are set, and no console errors.

If the user reports a defect, fix it and commit before Phase B.

---

# Phase B — Admin drag-reorder (dnd-kit)

## Task B1: Create `SortableSectionRow`

**Files:**
- Create: `src/admin/features/homepage/components/SortableSectionRow.tsx`
- Modify: `src/admin/features/homepage/components/index.ts`

- [ ] **Step 1: Inspect an existing sortable row for the exact dnd-kit API**

Open `src/admin/features/settings/pages/tabs/components/menu/SortableMenuItemRow.tsx`. Note the imports (`useSortable` from `@dnd-kit/sortable`, `CSS` from `@dnd-kit/utilities`), the `transform`/`transition` application via `style`, and the `{...attributes}`/`{...listeners}` spread on the grip handle. Copy this exact API surface.

- [ ] **Step 2: Create `SortableSectionRow.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

export interface SortableSectionRowProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  enabled: boolean;
  draggable: boolean;
  onClick: () => void;
}

export default function SortableSectionRow({
  id, label, icon: Icon, isActive, enabled, draggable, onClick,
}: SortableSectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'structure-item group relative overflow-hidden transition-colors',
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
        isDragging && 'opacity-80 shadow-md',
      )}
    >
      {isActive && (
        <motion.div
          layoutId="homepage-active-tab"
          className="absolute inset-0 bg-[var(--primary-muted)] rounded-md z-0"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Icon className={cn(
          'structure-item-icon transition-all duration-200 group-hover:scale-110 shrink-0',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
        )} />
        <span className={cn(
          'structure-item-label transition-transform duration-200 group-hover:translate-x-0.5',
          isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
        )}>
          {label}
        </span>
        <span className={cn(
          'ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-110',
          enabled ? 'bg-green-500' : 'bg-muted-foreground/30',
        )} />
      </button>
      {draggable && (
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          className="relative z-10 ml-1 grid h-6 w-5 shrink-0 cursor-grab place-items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Export it**

In `src/admin/features/homepage/components/index.ts`, add:
```ts
export { default as SortableSectionRow } from './SortableSectionRow';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/features/homepage/components/SortableSectionRow.tsx src/admin/features/homepage/components/index.ts
git commit -m "feat(homepage-admin): add SortableSectionRow component"
```

---

## Task B2: Wire dnd-kit into `HomepageLayout`

**Files:**
- Modify: `src/admin/features/homepage/components/HomepageLayout.tsx`

- [ ] **Step 1: Read current `HomepageLayout.tsx`**

Open it. Note the props interface (`HomepageLayoutProps`, lines ~43-62) including `onMoveSection`. Note the nav render loop (lines ~119-193) using `sectionStatus.map`. Note the Up/Down buttons block (lines ~169-190).

- [ ] **Step 2: Change the prop from `onMoveSection` to `onReorderSections`**

In `HomepageLayoutProps`, remove:
```ts
onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
```
Add:
```ts
onReorderSections?: (activeId: string, overId: string) => void;
```

Destructure `onReorderSections` instead of `onMoveSection` in the component params.

- [ ] **Step 3: Add dnd-kit imports and a drag-end handler**

Add imports at the top:
```ts
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSectionRow } from '.';
```

Inside the component, after the existing hooks, add:
```ts
const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (over && active.id !== over.id && onReorderSections) {
    onReorderSections(String(active.id), String(over.id));
  }
};
```

- [ ] **Step 4: Replace the nav loop with a sortable context**

Replace the `sectionStatus.map((status, index) => { ... })` block (the `<div className="structure-panel-list">` contents) with:

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext
    items={sectionStatus.map((s) => s.key)}
    strategy={verticalListSortingStrategy}
  >
    {sectionStatus.map((status) => {
      const item = homepageSections.find((c) => c.id === status.key) ?? { id: status.key, label: status.label, icon: Grid };
      const Icon = item.icon;
      const is_active = currentSection === item.id;
      const draggable = item.id !== 'seo';
      return (
        <SortableSectionRow
          key={item.id}
          id={item.id}
          label={item.label}
          icon={Icon}
          isActive={is_active}
          enabled={status.enabled}
          draggable={draggable}
          onClick={() => handleSectionClick(item.id)}
        />
      );
    })}
  </SortableContext>
</DndContext>
```

Remove the now-unused `ChevronUp`/`ChevronDown` imports from `lucide-react` (line 14). Keep `Grid` (used as a fallback icon). Remove the old per-row `<motion.div layoutId>` and Up/Down markup — that logic now lives in `SortableSectionRow`.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (or fix any unused-import errors flagged).

- [ ] **Step 6: Commit**

```bash
git add src/admin/features/homepage/components/HomepageLayout.tsx
git commit -m "feat(homepage-admin): wire dnd-kit sortable nav, drop Up/Down buttons"
```

---

## Task B3: Implement `reorderSections` in `Homepage.tsx`

**Files:**
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`

- [ ] **Step 1: Read current `Homepage.tsx`**

Open it. Note `moveSection` (lines ~124-144) and its callers, and the `<HomepageLayout onMoveSection={moveSection} ...>` usage.

- [ ] **Step 2: Add `arrayMove` import**

Add to imports:
```ts
import { arrayMove } from '@dnd-kit/sortable';
```

- [ ] **Step 3: Replace `moveSection` with `reorderSections`**

Delete the `moveSection` function and replace with:

```ts
const reorderSections = useCallback((activeId: string, overId: string) => {
  setFormData((prev) => {
    const ids = prev.sections.map((s) => s.id);
    const from = ids.indexOf(activeId);
    const to = ids.indexOf(overId);
    if (from === -1 || to === -1 || from === to) return prev;
    return { ...prev, sections: arrayMove(prev.sections, from, to) };
  });
}, []);
```

This operates by id on the full `formData.sections` array (which includes `stories`), so `stories` keeps its position even though it is filtered from the nav.

- [ ] **Step 4: Update the layout prop wiring**

Change `<HomepageLayout onMoveSection={moveSection} ...>` to `<HomepageLayout onReorderSections={reorderSections} ...>`.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/features/homepage/pages/Homepage.tsx
git commit -m "feat(homepage-admin): reorder sections by drag via arrayMove"
```

---

## Task B4: Phase B gate

**Files:** none.

- [ ] **Step 1: Run gates**

Run:
```bash
pnpm typecheck
pnpm check:boundaries
pnpm test
```
Expected: all PASS. (Existing Homepage tests must stay green; if a test referenced `moveSection`/`onMoveSection`, update it to `reorderSections`/`onReorderSections`.)

- [ ] **Step 2: Manual browser checkpoint (ask user)**

Ask the user to verify in `pnpm dev` admin: drag a section in the left nav, drop, see order change. Confirm SEO row cannot be dragged. Save, reload, confirm order persisted. Confirm `stories` section stays in its array position.

If defects, fix + commit before Phase C.

---

# Phase C — Admin pickers

## Task C1: Create `RoundupPicker`

**Files:**
- Create: `src/admin/components/pickers/RoundupPicker.tsx`
- Modify: `src/admin/components/pickers/index.ts`

- [ ] **Step 1: Read `ArticlePicker.tsx` as the template**

Open `src/admin/components/pickers/ArticlePicker.tsx`. Note the structure: debounced search (300ms), dropdown, preview card, clear button. Note it hits `/articles?search=&limit=8`. The new picker mirrors this but filters by type=roundup.

- [ ] **Step 2: Confirm `/api/articles?type=roundup` returns usable fields**

The articles endpoint (`src/pages/api/articles/index.ts:15,40`) accepts `type` and `search`. Each returned item includes `id`, `title`/`headline`, `slug` (ArticlePicker already maps `article.title` and `article.slug`). Roundups are articles with `type='roundup'`, so the response shape is identical.

- [ ] **Step 3: Create `RoundupPicker.tsx`**

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';
import type { HomepageRoundupRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

export interface RoundupPickerProps {
  value: HomepageRoundupRef | null | undefined;
  onChange: (value: HomepageRoundupRef | null) => void;
}

const RoundupPicker: React.FC<RoundupPickerProps> = ({ value, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/articles', { params: { type: 'roundup', search: query, limit: 8 } });
      const data = res.data;
      const items: ArticleApiItem[] = Array.isArray(data) ? data : (data.data || []);
      setResults(items);
    } catch {
      toast.error('Roundup search failed');
      setResults([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleSelect = (item: ArticleApiItem) => {
    onChange({ roundup_id: Number(item.id), title: item.title, route: `/roundups/${item.slug}` });
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-3 p-3 rounded-sm border border-border bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{value.title}</p>
            <p className="text-xs text-muted-foreground font-mono">{value.route}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onChange(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search roundups..."
            className="h-8 text-sm"
          />
          {showDropdown && (results.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
              {isSearching ? (
                <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>
              ) : results.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">No results</div>
              ) : (
                results.map((item) => (
                  <button key={item.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3" onClick={() => handleSelect(item)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoundupPicker;
```

- [ ] **Step 4: Export it**

In `src/admin/components/pickers/index.ts`, add:
```ts
export { default as RoundupPicker } from './RoundupPicker';
export type { RoundupPickerProps } from './RoundupPicker';
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/components/pickers/RoundupPicker.tsx src/admin/components/pickers/index.ts
git commit -m "feat(pickers): add RoundupPicker"
```

---

## Task C2: Create `AuthorPicker`

**Files:**
- Create: `src/admin/components/pickers/AuthorPicker.tsx`
- Modify: `src/admin/components/pickers/index.ts`

- [ ] **Step 1: Confirm `/api/authors` response shape**

Open `src/pages/api/authors/index.ts`. The GET returns `authors.map(transformAuthorResponse)`. Open `transformAuthorResponse` (in `@modules/authors`) to confirm the public field names: `id`, `name`, `slug`, and avatar fields. The picker needs `id`, `name`, `slug`.

- [ ] **Step 2: Create `AuthorPicker.tsx`**

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';

interface AuthorApiItem { id: number; name: string; slug: string; }

export interface AuthorPickerProps {
  value: number | null | undefined;
  selectedLabel?: string | null;
  onChange: (authorId: number | null, label?: string) => void;
}

const AuthorPicker: React.FC<AuthorPickerProps> = ({ value, selectedLabel, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AuthorApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/authors', { params: { workflow_status: 'published' } });
      const data = res.data;
      const all: AuthorApiItem[] = Array.isArray(data) ? data : (data.data || []);
      setResults(all.filter((a) => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
    } catch {
      toast.error('Author search failed');
      setResults([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-3 p-3 rounded-sm border border-border bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{selectedLabel || `Author #${value}`}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onChange(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search authors..."
            className="h-8 text-sm"
          />
          {showDropdown && (results.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
              {isSearching ? (
                <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div>
              ) : (
                results.map((a) => (
                  <button key={a.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => { onChange(a.id, a.name); setShowDropdown(false); setSearchQuery(''); }}>
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.slug}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthorPicker;
```

> Note: `/api/authors` does not expose a `search` query param (it only filters by `workflow_status`). Client-side filtering is used instead. If a future endpoint adds `search`, switch the call to server-side.

- [ ] **Step 3: Export it**

In `src/admin/components/pickers/index.ts`, add:
```ts
export { default as AuthorPicker } from './AuthorPicker';
export type { AuthorPickerProps } from './AuthorPicker';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/pickers/AuthorPicker.tsx src/admin/components/pickers/index.ts
git commit -m "feat(pickers): add AuthorPicker"
```

---

## Task C3: Add ref-mapper utilities with unit tests (TDD)

**Files:**
- Create: `src/admin/features/homepage/utils/__tests__/ref-mappers.test.ts`
- Create: `src/admin/features/homepage/utils/ref-mappers.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/admin/features/homepage/utils/__tests__/ref-mappers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapArticleToRecipeRef, mapArticleToRoundupRef, addRecipeRef, addRoundupRef } from '../ref-mappers';

describe('ref mappers', () => {
  it('maps an article to a recipe ref (snake_case, route /recipes)', () => {
    const ref = mapArticleToRecipeRef({ id: 12, title: 'Pasta', slug: 'pasta' });
    expect(ref).toEqual({ article_id: 12, headline: 'Pasta', route: '/recipes/pasta' });
  });

  it('maps an article to a roundup ref (snake_case, route /roundups)', () => {
    const ref = mapArticleToRoundupRef({ id: 5, title: 'Best Soups', slug: 'best-soups' });
    expect(ref).toEqual({ roundup_id: 5, title: 'Best Soups', route: '/roundups/best-soups' });
  });

  it('refuses a duplicate recipe ref by article_id', () => {
    const existing = [{ article_id: 7, headline: 'A', route: '/recipes/a' }];
    expect(addRecipeRef(existing, { article_id: 7, headline: 'dup', route: '/recipes/dup' })).toEqual(existing);
  });

  it('appends a new recipe ref', () => {
    const existing = [{ article_id: 7, headline: 'A', route: '/recipes/a' }];
    const next = addRecipeRef(existing, { article_id: 9, headline: 'B', route: '/recipes/b' });
    expect(next).toHaveLength(2);
    expect(next[1].article_id).toBe(9);
  });

  it('refuses a duplicate roundup ref by roundup_id', () => {
    const existing = [{ roundup_id: 3, title: 'X', route: '/roundups/x' }];
    expect(addRoundupRef(existing, { roundup_id: 3, title: 'dup', route: '/roundups/dup' })).toEqual(existing);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- ref-mappers`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ref-mappers.ts`**

Create `src/admin/features/homepage/utils/ref-mappers.ts`:

```ts
import type { HomepageRecipeRef, HomepageRoundupRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

export function mapArticleToRecipeRef(item: ArticleApiItem): HomepageRecipeRef {
  return {
    article_id: Number(item.id),
    headline: item.title,
    route: `/recipes/${item.slug}`,
  };
}

export function mapArticleToRoundupRef(item: ArticleApiItem): HomepageRoundupRef {
  return {
    roundup_id: Number(item.id),
    title: item.title,
    route: `/roundups/${item.slug}`,
  };
}

export function addRecipeRef(existing: HomepageRecipeRef[], next: HomepageRecipeRef): HomepageRecipeRef[] {
  if (existing.some((r) => r.article_id === next.article_id)) return existing;
  return [...existing, next];
}

export function addRoundupRef(existing: HomepageRoundupRef[], next: HomepageRoundupRef): HomepageRoundupRef[] {
  if (existing.some((r) => r.roundup_id === next.roundup_id)) return existing;
  return [...existing, next];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- ref-mappers`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/features/homepage/utils/ref-mappers.ts src/admin/features/homepage/utils/__tests__/ref-mappers.test.ts
git commit -m "feat(homepage-admin): add ref mappers and dedupe helpers"
```

---

## Task C4: Create `RecipeRefList`

**Files:**
- Create: `src/admin/features/homepage/components/RecipeRefList.tsx`

- [ ] **Step 1: Inspect the FAQ block sortable pattern for the per-item reorder UI**

Open `src/admin/components/BlockEditor/blocks/faq/SortableFAQItem.tsx`. Note the `useSortable` per-item usage with a unique id, the grip handle, and the remove button. Mirror that for each ref row.

- [ ] **Step 2: Create `RecipeRefList.tsx`**

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';
import { mapArticleToRecipeRef, addRecipeRef } from '../utils/ref-mappers';
import type { HomepageRecipeRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

interface RefRowProps { ref: HomepageRecipeRef; onRemove: () => void; }

function RefRow({ ref: refItem, onRemove }: RefRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(refItem.article_id) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-sm border border-border bg-muted/40">
      <button type="button" className="cursor-grab text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{refItem.headline}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{refItem.route}</p>
      </div>
      <button type="button" aria-label="Remove" className="text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface RecipeRefListProps {
  refs: HomepageRecipeRef[];
  onChange: (refs: HomepageRecipeRef[]) => void;
}

const RecipeRefList: React.FC<RecipeRefListProps> = ({ refs, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/articles', { params: { search: query, limit: 8 } });
      const data = res.data;
      setResults(Array.isArray(data) ? data : (data.data || []));
    } catch { setResults([]); }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleAdd = (item: ArticleApiItem) => {
    const next = addRecipeRef(refs, mapArticleToRecipeRef(item));
    if (next === refs) { toast('This recipe is already in the list'); return; }
    onChange(next);
    setSearchQuery('');
    setResults([]);
  };

  const handleRemove = (articleId: number) => onChange(refs.filter((r) => r.article_id !== articleId));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const ids = refs.map((r) => String(r.article_id));
      onChange(arrayMove(refs, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search recipes to add..." className="h-8 text-sm" />
        {searchQuery && (results.length > 0 || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
            {isSearching ? <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div> : (
              results.map((item) => (
                <button key={item.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => handleAdd(item)}>
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={refs.map((r) => String(r.article_id))} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {refs.map((r) => <RefRow key={r.article_id} ref={r} onRemove={() => handleRemove(r.article_id)} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default RecipeRefList;
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/admin/features/homepage/components/RecipeRefList.tsx
git commit -m "feat(homepage-admin): add RecipeRefList ordered multi-picker"
```

---

## Task C5: Create `RoundupRefList`

**Files:**
- Create: `src/admin/features/homepage/components/RoundupRefList.tsx`

- [ ] **Step 1: Create `RoundupRefList.tsx`**

Mirror `RecipeRefList`, but search with `type=roundup`, use `mapArticleToRoundupRef`/`addRoundupRef`, and key items by `roundup_id`:

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';
import { mapArticleToRoundupRef, addRoundupRef } from '../utils/ref-mappers';
import type { HomepageRoundupRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

interface RefRowProps { ref: HomepageRoundupRef; onRemove: () => void; }

function RefRow({ ref: refItem, onRemove }: RefRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(refItem.roundup_id) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-sm border border-border bg-muted/40">
      <button type="button" className="cursor-grab text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{refItem.title}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">{refItem.route}</p>
      </div>
      <button type="button" aria-label="Remove" className="text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface RoundupRefListProps {
  refs: HomepageRoundupRef[];
  onChange: (refs: HomepageRoundupRef[]) => void;
}

const RoundupRefList: React.FC<RoundupRefListProps> = ({ refs, onChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ArticleApiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await api.get('/articles', { params: { type: 'roundup', search: query, limit: 8 } });
      const data = res.data;
      setResults(Array.isArray(data) ? data : (data.data || []));
    } catch { setResults([]); }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (searchQuery) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

  const handleAdd = (item: ArticleApiItem) => {
    const next = addRoundupRef(refs, mapArticleToRoundupRef(item));
    if (next === refs) { toast('This roundup is already in the list'); return; }
    onChange(next);
    setSearchQuery('');
    setResults([]);
  };

  const handleRemove = (roundupId: number) => onChange(refs.filter((r) => r.roundup_id !== roundupId));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const ids = refs.map((r) => String(r.roundup_id));
      onChange(arrayMove(refs, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search roundups to add..." className="h-8 text-sm" />
        {searchQuery && (results.length > 0 || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
            {isSearching ? <div className="p-3 text-center text-sm text-muted-foreground">Searching...</div> : (
              results.map((item) => (
                <button key={item.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => handleAdd(item)}>
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.slug}</p>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={refs.map((r) => String(r.roundup_id))} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {refs.map((r) => <RefRow key={r.roundup_id} ref={r} onRemove={() => handleRemove(r.roundup_id)} />)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default RoundupRefList;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/admin/features/homepage/components/RoundupRefList.tsx
git commit -m "feat(homepage-admin): add RoundupRefList ordered multi-picker"
```

---

## Task C6: Wire `RecipeRefList` into Hero + Featured sections

**Files:**
- Modify: `src/admin/features/homepage/pages/sections/HeroSection.tsx`
- Modify: `src/admin/features/homepage/pages/sections/FeaturedSection.tsx`

- [ ] **Step 1: Read `FeaturedSection.tsx` to find its `source` select**

Open it. Note how `featured.source` is read (the select bound to `patchFeatured({ source })`) and where the refs textarea lives (~lines 81-90). The refs list must only render when `source === 'manual'`.

- [ ] **Step 2: Replace the Hero refs textarea**

In `HeroSection.tsx`, remove the `FormField` block (lines 54-63) and replace with:

```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-foreground/80">Manual Recipe References</Label>
  <RecipeRefList refs={hero.refs} onChange={(refs) => patchHero({ refs })} />
</div>
```

Add the import at the top:
```ts
import { RecipeRefList } from '@admin/features/homepage/components';
```
Remove the now-unused `FormField` import if no other field in the file uses it.

- [ ] **Step 3: Replace the Featured refs textarea (manual-only)**

In `FeaturedSection.tsx`, replace the refs `FormField` block with a conditional list:

```tsx
{featured.source === 'manual' && (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-foreground/80">Manual Recipe References</Label>
    <RecipeRefList refs={featured.refs} onChange={(refs) => patchFeatured({ refs })} />
  </div>
)}
{featured.source !== 'manual' && (
  <p className="text-xs text-muted-foreground">Refs are only used when source is Manual.</p>
)}
```

Add the import:
```ts
import { RecipeRefList } from '@admin/features/homepage/components';
```
Use the existing `patchFeatured` helper (same pattern as `patchHero`). Confirm the `featured` variable name from the file.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/features/homepage/pages/sections/HeroSection.tsx src/admin/features/homepage/pages/sections/FeaturedSection.tsx
git commit -m "feat(homepage-admin): wire RecipeRefList into hero and featured"
```

---

## Task C7: Wire `RoundupRefList` into Collections

**Files:**
- Modify: `src/admin/features/homepage/pages/sections/CollectionsSection.tsx`

- [ ] **Step 1: Replace the Collections refs textarea**

In `CollectionsSection.tsx`, replace the refs `FormField` (~lines 42-51) with:

```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-foreground/80">Manual Roundup References</Label>
  <RoundupRefList refs={collections.refs} onChange={(refs) => patchCollections({ refs })} />
</div>
```

Add the import:
```ts
import { RoundupRefList } from '@admin/features/homepage/components';
```
Use the existing `patchCollections` helper (same pattern as the other sections). Confirm the `collections` variable name from the file.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/admin/features/homepage/pages/sections/CollectionsSection.tsx
git commit -m "feat(homepage-admin): wire RoundupRefList into collections"
```

---

## Task C8: Wire `AuthorPicker` into About

**Files:**
- Modify: `src/admin/features/homepage/pages/sections/AboutSection.tsx`

- [ ] **Step 1: Read `AboutSection.tsx`**

Open it. Note the `<input type="number">` for `author_id` (~lines 25-34) and the `patchAbout` helper.

- [ ] **Step 2: Replace the number input with AuthorPicker**

Replace the number input block with:

```tsx
<div className="space-y-1.5">
  <Label className="text-xs font-medium text-foreground/80">Featured Author</Label>
  <AuthorPicker
    value={about.author_id}
    onChange={(authorId) => patchAbout({ author_id: authorId })}
  />
  <p className="text-xs text-muted-foreground">Clear the picker to fall back to the site's featured author.</p>
</div>
```

Add the import:
```ts
import { AuthorPicker } from '@admin/components/pickers';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/admin/features/homepage/pages/sections/AboutSection.tsx
git commit -m "feat(homepage-admin): wire AuthorPicker into about section"
```

---

## Task C9: Phase C gate + end-to-end verification

**Files:** none.

- [ ] **Step 1: Run gates**

Run:
```bash
pnpm typecheck
pnpm check:boundaries
pnpm test
```
Expected: all PASS (baseline + new ref-mappers tests).

- [ ] **Step 2: Manual E2E (ask user)**

Ask the user to verify in `pnpm dev`:
1. Open `/admin/homepage/hero`, add 3 recipes via the picker, reorder via drag, enable. Confirm no duplicates allowed.
2. `/featured` → set source=Manual, add 2 recipes.
3. `/collections` → add 2 roundups.
4. `/about` → pick an author; clear it to test featured fallback.
5. Drag-reorder sections in the left nav (move Collections above Featured). Save. Reload `/`. Confirm: order matches, each section shows the picked items, images resolve live.
6. Reload the admin — confirm picked refs and order round-tripped.
7. DevTools Network: the PUT `/api/settings/homepage` payload uses snake_case (`article_id`, `roundup_id`, `route`, `headline`).

- [ ] **Step 3: Final full-suite verification**

Run:
```bash
pnpm test
pnpm typecheck
pnpm check:boundaries
```
Expected: all green.

---

## Self-Review (run after writing the plan — already applied)

- **Spec coverage:** N+1 (A1+A2), hero/latest duplication (A3), `<h1>` (A4) — Phase A complete. Drag-reorder (B1-B3) — Phase B complete. Pickers (C1-C9) — Phase C complete. Error/edge cases (empty input, missing refs, dedupe, manual-only featured, author fallback) are covered in tasks/tests.
- **Placeholders:** none — every code step shows complete code. Two "confirm the variable name from the file" notes are intentional (the file must be read at execution time for the exact local var); the surrounding code is complete.
- **Type consistency:** `onReorderSections`, `getArticlesByIds`, `trendingRecipes`, `mapArticleToRecipeRef`, `addRecipeRef` names are consistent across tasks. `HomepageRecipeRef`/`HomepageRoundupRef` shapes match the spec and the existing types.
