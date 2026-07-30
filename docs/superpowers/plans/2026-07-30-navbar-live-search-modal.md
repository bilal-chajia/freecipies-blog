# Navbar Live Search Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the navbar's submit-only search dialog with a full-viewport, responsive recipe search surface that updates results while the user types.

**Architecture:** Keep public search data behind the existing `GET /api/recipes` endpoint. Add a small pure site utility for query normalization, request URL creation, and stale-response checks; `Header.astro` owns DOM state, debouncing, cancellation, and card rendering. The dialog remains outside the contained sticky header and its results region becomes the only scrollable modal area.

**Tech Stack:** Astro 6, TypeScript strict, browser `fetch`/`AbortController`, Vitest, existing CSS design tokens.

## Global Constraints

- Use `pnpm` only; do not run `pnpm build` without explicit user approval.
- Reuse `GET /api/recipes`; do not create an endpoint, migration, or stored-data contract.
- Request only published recipe results through the API's existing behavior.
- Keep stored/serialized names in `snake_case` and TypeScript identifiers in `camelCase`.
- Do not touch unrelated changes in `NutritionFacts.astro`, `TocHeader.astro`, `.worktrees/`, or the recipes-pages plan.
- Keep all images rendered in result cards supplied with `width`, `height`, and `loading="lazy"`.

---

## File Structure

- Create `src/site/utils/live-recipe-search.ts`: pure query and response helpers used by the Header browser script.
- Create `src/site/utils/__tests__/live-recipe-search.test.ts`: tests normalization, URL generation, and stale-response acceptance.
- Modify `src/site/components/Header.astro`: full-screen dialog markup, live region, result-card renderer, request lifecycle, and responsive modal CSS.
- Modify `src/site/components/__tests__/Header.test.ts`: retain the fixed-overlay regression and cover the required dialog/result accessibility markup.

### Task 1: Define the Live Search Request Contract

**Files:**
- Create: `src/site/utils/live-recipe-search.ts`
- Create: `src/site/utils/__tests__/live-recipe-search.test.ts`

**Interfaces:**
- Produces `normalizeLiveRecipeSearch(value: string): string`.
- Produces `buildLiveRecipeSearchUrl(query: string): string | null`.
- Produces `canApplyLiveRecipeSearchResponse(currentQuery: string, responseQuery: string): boolean`.
- Produces `LiveRecipeSearchItem` and `LiveRecipeSearchResponse` types matching `formatSuccessResponse({ items, pagination })` from `/api/recipes`.

- [ ] **Step 1: Write the failing utility tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  buildLiveRecipeSearchUrl,
  canApplyLiveRecipeSearchResponse,
  normalizeLiveRecipeSearch,
} from '../live-recipe-search';

describe('live recipe search', () => {
  it('normalizes a query before it reaches the API', () => {
    expect(normalizeLiveRecipeSearch('  chocolate   cake  ')).toBe('chocolate cake');
  });

  it('does not create a request for an empty query', () => {
    expect(buildLiveRecipeSearchUrl('   ')).toBeNull();
  });

  it('creates a bounded encoded API request for a normalized query', () => {
    expect(buildLiveRecipeSearchUrl('chocolate & cake')).toBe(
      '/api/recipes?search=chocolate+%26+cake&limit=100',
    );
  });

  it('rejects a response that belongs to an older query', () => {
    expect(canApplyLiveRecipeSearchResponse('pasta', 'pas')).toBe(false);
    expect(canApplyLiveRecipeSearchResponse('pasta', 'pasta')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the utility tests to verify the expected RED state**

Run: `pnpm test -- src/site/utils/__tests__/live-recipe-search.test.ts`

Expected: FAIL because `../live-recipe-search` does not yet exist.

- [ ] **Step 3: Implement the minimal pure utility**

```ts
export const LIVE_RECIPE_SEARCH_LIMIT = 100;

export interface LiveRecipeSearchItem {
  slug: string;
  headline: string;
  thumbnail: { url?: string; width?: number; height?: number; alt?: string } | null;
  category: { label?: string } | null;
}

export interface LiveRecipeSearchResponse {
  success: boolean;
  data?: { items?: LiveRecipeSearchItem[]; pagination?: { total?: number } };
}

export function normalizeLiveRecipeSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function buildLiveRecipeSearchUrl(query: string): string | null {
  const normalized = normalizeLiveRecipeSearch(query);
  if (!normalized) return null;
  const params = new URLSearchParams({ search: normalized, limit: String(LIVE_RECIPE_SEARCH_LIMIT) });
  return `/api/recipes?${params.toString()}`;
}

export function canApplyLiveRecipeSearchResponse(currentQuery: string, responseQuery: string): boolean {
  return normalizeLiveRecipeSearch(currentQuery) === normalizeLiveRecipeSearch(responseQuery);
}
```

- [ ] **Step 4: Run the utility tests to verify GREEN**

Run: `pnpm test -- src/site/utils/__tests__/live-recipe-search.test.ts`

Expected: PASS with four tests.

- [ ] **Step 5: Commit the utility contract**

```bash
git add src/site/utils/live-recipe-search.ts src/site/utils/__tests__/live-recipe-search.test.ts
git commit -m "feat(search): add live recipe search helpers"
```

### Task 2: Build the Full-Viewport Live Search Surface

**Files:**
- Modify: `src/site/components/Header.astro`
- Modify: `src/site/components/__tests__/Header.test.ts`

**Interfaces:**
- Consumes `buildLiveRecipeSearchUrl`, `canApplyLiveRecipeSearchResponse`, and `LiveRecipeSearchResponse` from `@site/utils/live-recipe-search`.
- Consumes `GET /api/recipes?search=<query>&limit=100`, returning `{ success, data: { items, pagination } }`.
- Produces a dialog with `aria-labelledby="search-title"`, a polite `#search-status` live region, and a `#search-results` scroll container.

- [ ] **Step 1: Extend the Header regression test before changing markup**

```ts
it('keeps the live search dialog accessible and ready to own viewport results', async () => {
  const source = await readFile(headerPath, 'utf8');

  expect(source).toContain('aria-labelledby="search-title"');
  expect(source).toContain('id="search-status"');
  expect(source).toContain('aria-live="polite"');
  expect(source).toContain('id="search-results"');
  expect(source).toContain('class="search-modal-results"');
});
```

- [ ] **Step 2: Run the Header tests to verify the expected RED state**

Run: `pnpm test -- src/site/components/__tests__/Header.test.ts`

Expected: FAIL because the dialog does not yet expose the live result status and scroll region.

- [ ] **Step 3: Replace the modal content and styles with the viewport search layout**

Implement these markup requirements in `Header.astro`:

```astro
<div
  class="search-modal"
  id="search-modal"
  role="dialog"
  aria-modal="true"
  aria-hidden="true"
  aria-labelledby="search-title"
>
  <div class="search-modal-content">
    <div class="search-header">...</div>
    <form action="/recipes" method="GET" class="search-form">...</form>
    <p id="search-status" class="sr-only" aria-live="polite"></p>
    <div id="search-results" class="search-modal-results" aria-live="polite"></div>
  </div>
</div>
```

Implement these CSS invariants:

```css
.search-modal { position: fixed; inset: 0; padding: 0; background: var(--bg); }
.search-modal.active { display: block; }
.search-modal-content { display: flex; flex-direction: column; width: 100%; height: 100%; max-width: none; border: 0; border-radius: 0; box-shadow: none; }
.search-modal-results { flex: 1; min-height: 0; overflow-y: auto; }
.search-results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
```

Use existing semantic tokens. The header/form area may be constrained with a normal site
container, but the dialog and results region must fill the viewport. Add mobile rules so the
submit action spans the input width and card columns remain legible.

- [ ] **Step 4: Implement the request lifecycle in the existing Header browser script**

Add imports in the Astro frontmatter and use the helpers in the script. Keep module state
local to this Header instance:

```ts
let searchAbortController: AbortController | undefined;
let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

const requestLiveResults = async (rawQuery: string) => {
  const query = normalizeLiveRecipeSearch(rawQuery);
  const requestUrl = buildLiveRecipeSearchUrl(query);
  searchAbortController?.abort();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  if (!requestUrl) {
    renderSearchPrompt();
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    const controller = new AbortController();
    searchAbortController = controller;
    renderSearchLoading(query);
    try {
      const response = await fetch(requestUrl, { signal: controller.signal });
      const payload = (await response.json()) as LiveRecipeSearchResponse;
      if (!response.ok || !payload.success) throw new Error('Search request failed');
      if (!canApplyLiveRecipeSearchResponse(searchInput.value, query)) return;
      renderSearchResults(payload.data?.items ?? [], payload.data?.pagination?.total ?? 0, query);
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') renderSearchError(query);
    }
  }, 200);
};
```

Bind it to the input `input` event. Use DOM construction or escaped `textContent` for API text;
do not interpolate recipe titles or categories directly into HTML strings. Each card must create
an anchor to `/recipes/${item.slug}`, an image only when a thumbnail URL is present, category,
and headline. The existing form submission remains the keyboard-safe fallback and routes to the
full recipes page.

- [ ] **Step 5: Run the Header tests to verify GREEN**

Run: `pnpm test -- src/site/components/__tests__/Header.test.ts`

Expected: PASS with the fixed-overlay and live-search accessibility tests.

- [ ] **Step 6: Commit the modal implementation**

```bash
git add src/site/components/Header.astro src/site/components/__tests__/Header.test.ts
git commit -m "feat(search): add full-screen live recipe modal"
```

### Task 3: Verify Interactive and Responsive Behavior

**Files:**
- Modify only if verification exposes a scoped defect: `src/site/components/Header.astro`

**Interfaces:**
- Consumes the finished modal and `/api/recipes` response from Tasks 1-2.
- Produces verified desktop and mobile interaction evidence without a new committed test artifact.

- [ ] **Step 1: Start the local app**

Run: `pnpm dev --host 127.0.0.1`

Expected: Astro serves the homepage on an available local port.

- [ ] **Step 2: Verify the desktop interaction flow in the Browser**

Flow: `/` -> click the unique `Search` navbar button -> type a known recipe query -> wait for
the request -> observe result cards in `#search-results` without a URL change -> click one card.

Expected: the dialog is viewport-sized; status and cards update in place; clicking a card opens
its recipe; console has no app errors or warnings.

- [ ] **Step 3: Verify mobile at 375 x 812**

Set the temporary viewport to `375 x 812`, reload `/`, open Search, type the same query, and
inspect the result region.

Expected: no horizontal overflow; input and submit control fit; cards remain readable; the
results region scrolls independently; Escape and the close button dismiss the modal.

- [ ] **Step 4: Run repository verification**

Run:

```bash
pnpm test -- src/site/utils/__tests__/live-recipe-search.test.ts src/site/components/__tests__/Header.test.ts
pnpm typecheck
pnpm check:boundaries
```

Expected: all commands exit `0`. Do not run `pnpm build` without explicit user approval.

- [ ] **Step 5: Commit any verification-only correction, if and only if a source file changed**

```bash
git add src/site/components/Header.astro
git commit -m "fix(search): polish live modal responsive behavior"
```

## Plan Self-Review

- Spec coverage: Task 1 establishes the API query and stale-response contract; Task 2 implements
  full viewport, responsive results, all accessible states, cancellation, and normal recipe links;
  Task 3 verifies desktop/mobile layout, navigation, console health, and repository checks.
- Placeholder scan: no deferred implementation markers or undefined interfaces remain.
- Type consistency: `LiveRecipeSearchResponse` and its `data.items`/`data.pagination.total`
  properties match the existing `formatSuccessResponse` wrapping used by `/api/recipes`.
