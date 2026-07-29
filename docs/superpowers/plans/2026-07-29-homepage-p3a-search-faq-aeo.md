# Homepage P3A Search, FAQ, and AEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make navbar recipe search functional, add a structured fixed-last homepage FAQ matching article FAQs, and emit accurate homepage `ItemList` and conditional `FAQPage` JSON-LD.

**Architecture:** Three disjoint implementation domains run in parallel: Search owns navbar and recipe-listing behavior; FAQ Admin owns settings normalization and editing; Public/AEO owns homepage FAQ rendering and JSON-LD. The primary agent integrates the three commits, performs cross-domain review, and runs repository-wide verification.

**Tech Stack:** Astro 6.3.3, React 19.2.4, TypeScript 6 strict, Tailwind 4, Zod 4.3.6, Vitest 4.1.5, dnd-kit 10, Cloudflare D1.

## Global Constraints

- Use `pnpm` only.
- Follow TDD: each behavior test must be observed failing for the expected reason before production code is changed.
- Do not run `pnpm build` without explicit user approval.
- Do not modify `docs/SITE_SETTINGS_TABLE_CONTRACT.md` or another canonical contract.
- SQL and serialized/API JSON remain `snake_case`; TypeScript implementation identifiers remain `camelCase`.
- No database migration and no new API endpoint.
- Do not add a hero search field; `hero.show_search` remains accepted and round-tripped only.
- Do not edit or stage the user's changes in `src/site/components/content/NutritionFacts.astro` or `src/site/components/content/toc/TocHeader.astro`.
- Keep agents' write sets disjoint. Return the commit hash and changed paths to the primary agent.

---

## File Ownership Map

### Search agent only

- Create `src/site/utils/recipe-listing.ts`
- Create `src/site/utils/__tests__/recipe-listing.test.ts`
- Modify `src/site/components/Header.astro`
- Modify `src/pages/recipes/index.astro`

### FAQ Admin agent only

- Modify `src/modules/settings/types/settings.types.ts`
- Modify `src/modules/settings/services/settings.service.ts`
- Modify `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`
- Modify `src/shared/validation/schemas/settings.ts`
- Modify `src/shared/validation/schemas/__tests__/settings.test.ts`
- Create `src/admin/features/homepage/utils/faq-items.ts`
- Create `src/admin/features/homepage/utils/__tests__/faq-items.test.ts`
- Create `src/admin/features/homepage/components/FaqItemList.tsx`
- Modify `src/admin/features/homepage/components/index.ts`
- Modify `src/admin/features/homepage/components/HomepageLayout.tsx`
- Modify `src/admin/features/homepage/pages/Homepage.tsx`
- Modify `src/admin/features/homepage/pages/sections/FaqSection.tsx`

### Public/AEO agent only

- Modify `src/site/utils/home-data.ts`
- Modify `src/site/utils/__tests__/home-data.test.ts`
- Modify `src/site/utils/home-jsonld.ts`
- Modify `src/site/utils/__tests__/home-jsonld.test.ts`
- Create `src/site/components/home/HomeFaq.astro`
- Modify `src/site/components/home/HomeSections.astro`
- Modify `src/pages/index.astro`

---

### Task 1: Canonical Navbar Recipe Search

**Files:**
- Create: `src/site/utils/recipe-listing.ts`
- Create: `src/site/utils/__tests__/recipe-listing.test.ts`
- Modify: `src/site/components/Header.astro`
- Modify: `src/pages/recipes/index.astro`

**Interfaces:**
- Produces: `normalizeRecipeSearch(value: string | null | undefined): string`
- Produces: `buildRecipeListingUrl(input: { category?: string; tag?: string; search?: string; page?: number }): string`
- Consumes: existing `getArticles(db, { search, categorySlug, tagSlug, limit, offset })`
- Does not modify: homepage JSON-LD; Task 3 owns `src/pages/index.astro` and `home-jsonld.ts`.

- [ ] **Step 1: Write failing recipe-listing utility tests**

Create tests covering trimming, blank normalization, URL encoding, omission of blank values, and preservation of search with filters and pagination:

```ts
import { describe, expect, it } from 'vitest';
import { buildRecipeListingUrl, normalizeRecipeSearch } from '../recipe-listing';

describe('normalizeRecipeSearch', () => {
  it('trims a search term and converts blank input to an empty string', () => {
    expect(normalizeRecipeSearch('  lemon cake  ')).toBe('lemon cake');
    expect(normalizeRecipeSearch('   ')).toBe('');
    expect(normalizeRecipeSearch(null)).toBe('');
  });
});

describe('buildRecipeListingUrl', () => {
  it('preserves search with category, tag, and pagination', () => {
    expect(buildRecipeListingUrl({
      category: 'dinner',
      tag: 'quick',
      search: 'lemon cake',
      page: 3,
    })).toBe('/recipes?category=dinner&tag=quick&search=lemon+cake&page=3');
  });

  it('omits blank filters and page one', () => {
    expect(buildRecipeListingUrl({ search: '   ', page: 1 })).toBe('/recipes');
  });
});
```

- [ ] **Step 2: Run the utility test and verify RED**

Run: `pnpm test -- src/site/utils/__tests__/recipe-listing.test.ts`

Expected: FAIL because `../recipe-listing` does not exist.

- [ ] **Step 3: Implement the pure search helpers**

```ts
export interface RecipeListingUrlInput {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
}

export const normalizeRecipeSearch = (value: string | null | undefined): string =>
  value?.trim() ?? '';

export function buildRecipeListingUrl(input: RecipeListingUrlInput): string {
  const params = new URLSearchParams();
  const category = input.category?.trim();
  const tag = input.tag?.trim();
  const search = normalizeRecipeSearch(input.search);
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);
  if (input.page && input.page > 1) params.set('page', String(input.page));
  const query = params.toString();
  return query ? '/recipes?' + query : '/recipes';
}
```

- [ ] **Step 4: Run the utility test and verify GREEN**

Run: `pnpm test -- src/site/utils/__tests__/recipe-listing.test.ts`

Expected: PASS.

- [ ] **Step 5: Wire the navbar form and recipe query**

In `Header.astro`, change only the existing modal form:

```astro
<form action="/recipes" method="GET" class="search-form">
  <input type="search" name="search" ... />
</form>
```

In `recipes/index.astro`:

```ts
import { buildRecipeListingUrl, normalizeRecipeSearch } from '@site/utils/recipe-listing';

const searchTerm = normalizeRecipeSearch(url.searchParams.get('search'));

const result = await getArticles(env.DB, {
  type: 'recipe',
  categorySlug: categoryFilter || undefined,
  tagSlug: tagFilter || undefined,
  search: searchTerm || undefined,
  limit,
  offset,
});
```

Replace the page-local URL builder with `buildRecipeListingUrl`. Ensure the All filter, category links, tag links, and pagination preserve `searchTerm`. Add the active term to the page title/context and a link to `/recipes` that clears all filters. Do not create `/search` and do not add JavaScript search fetching.

- [ ] **Step 6: Verify focused behavior and types**

Run:

```bash
pnpm test -- src/site/utils/__tests__/recipe-listing.test.ts
pnpm typecheck
```

Expected: both commands PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/site/utils/recipe-listing.ts src/site/utils/__tests__/recipe-listing.test.ts src/site/components/Header.astro src/pages/recipes/index.astro
git commit -m "feat(search): wire navbar recipe search"
```

Return the commit hash, RED/GREEN evidence, and exact changed paths.

---

### Task 2: FAQ Defaults and Structured Admin Editor

**Files:**
- Modify: `src/modules/settings/types/settings.types.ts`
- Modify: `src/modules/settings/services/settings.service.ts`
- Modify: `src/modules/settings/services/__tests__/homepage-settings-service.test.ts`
- Modify: `src/shared/validation/schemas/settings.ts`
- Modify: `src/shared/validation/schemas/__tests__/settings.test.ts`
- Create: `src/admin/features/homepage/utils/faq-items.ts`
- Create: `src/admin/features/homepage/utils/__tests__/faq-items.test.ts`
- Create: `src/admin/features/homepage/components/FaqItemList.tsx`
- Modify: `src/admin/features/homepage/components/index.ts`
- Modify: `src/admin/features/homepage/components/HomepageLayout.tsx`
- Modify: `src/admin/features/homepage/pages/Homepage.tsx`
- Modify: `src/admin/features/homepage/pages/sections/FaqSection.tsx`

**Interfaces:**
- Produces a disabled FAQ in `DEFAULT_HOME_SECTIONS`: `{ id: 'faq', type: 'faq', enabled: false, title: 'Frequently Asked Questions', items: [] }`.
- Produces: `normalizeHomepageSections(sections: HomepageSection[] | undefined): HomepageSection[]`.
- Produces: `pinFaqLast(sections: HomepageSection[]): HomepageSection[]`.
- Produces immutable FAQ item helper functions used by `FaqItemList`.
- Consumes existing `HomepageFaqSection` and `HomepageFaqItem` types.

- [ ] **Step 1: Write failing settings back-compat tests**

Extend `homepage-settings-service.test.ts`:

```ts
it('appends one disabled FAQ to a stored legacy section list', async () => {
  const sections = [
    { id: 'hero', type: 'hero', enabled: false, mode: 'grid', show_search: false, refs: [] },
  ];
  const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;
  const result = await getHomepageSettings(NO_DB, { cache });
  expect(result.sections.map((section) => section.id)).toEqual(['hero', 'faq']);
  expect(result.sections[1]).toMatchObject({ type: 'faq', enabled: false, items: [] });
});

it('does not duplicate an existing FAQ section', async () => {
  const sections = [
    { id: 'faq', type: 'faq', enabled: true, title: 'Help', items: [{ question: 'Q?', answer: 'A.' }] },
  ];
  const cache = cacheReturning(JSON.stringify({ sections })) as unknown as SettingsCacheStore;
  const result = await getHomepageSettings(NO_DB, { cache });
  expect(result.sections.filter((section) => section.type === 'faq')).toHaveLength(1);
});
```

Update the prior stored-section expectation from length `1` to explicit IDs `['hero', 'faq']`.

- [ ] **Step 2: Run the settings test and verify RED**

Run: `pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts`

Expected: FAIL because stored legacy sections are returned unchanged.

- [ ] **Step 3: Implement FAQ default normalization**

Add the disabled FAQ to `DEFAULT_HOME_SECTIONS`. Implement and export a focused normalizer in `settings.service.ts` that returns defaults for an empty list, preserves all stored sections, and appends a cloned default FAQ only when no FAQ exists. Use it inside `getHomepageSettings`.

Do not append another default section to a non-empty legacy list; this back-compat change is FAQ-specific.

- [ ] **Step 4: Write and run a failing whitespace-only FAQ schema test**

Add this case to `settings.test.ts`:

```ts
it('rejects whitespace-only FAQ questions and answers', () => {
  const whitespaceQuestion = HomepageSettingsSchema.safeParse({
    sections: [{
      id: 'faq',
      type: 'faq',
      enabled: true,
      title: 'FAQ',
      items: [{ question: '   ', answer: 'Answer' }],
    }],
  });
  const whitespaceAnswer = HomepageSettingsSchema.safeParse({
    sections: [{
      id: 'faq',
      type: 'faq',
      enabled: true,
      title: 'FAQ',
      items: [{ question: 'Question?', answer: '   ' }],
    }],
  });
  expect(whitespaceQuestion.success).toBe(false);
  expect(whitespaceAnswer.success).toBe(false);
});
```

Run: `pnpm test -- src/shared/validation/schemas/__tests__/settings.test.ts`

Expected: FAIL because `z.string().min(1)` currently accepts whitespace.

- [ ] **Step 5: Tighten the FAQ schema and run settings/schema tests GREEN**

Change only FAQ question and answer validation in `settings.ts` to
`z.string().trim().min(1)`. This also stores normalized values when the payload is parsed.

Run:

```bash
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts
pnpm test -- src/shared/validation/schemas/__tests__/settings.test.ts
```

Expected: PASS with whitespace-only FAQ values rejected by the tightened schema.

- [ ] **Step 6: Write failing FAQ item and fixed-order tests**

Create `faq-items.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addFaqItem,
  removeFaqItem,
  reorderFaqItems,
  updateFaqItem,
  pinFaqLast,
} from '../faq-items';

describe('FAQ item transforms', () => {
  it('adds, edits, deletes, and reorders without mutating input', () => {
    const original = [{ question: 'One?', answer: 'A1' }];
    const added = addFaqItem(original);
    const edited = updateFaqItem(added, 1, { question: 'Two?', answer: 'A2' });
    const reordered = reorderFaqItems(edited, 1, 0);
    const removed = removeFaqItem(reordered, 1);
    expect(original).toEqual([{ question: 'One?', answer: 'A1' }]);
    expect(removed).toEqual([{ question: 'Two?', answer: 'A2' }]);
  });
});

describe('pinFaqLast', () => {
  it('keeps one existing FAQ after all other sections', () => {
    const result = pinFaqLast([
      { id: 'faq', type: 'faq', enabled: false, title: 'FAQ', items: [] },
      { id: 'latest', type: 'latest', enabled: true, title: 'Latest', count: 4 },
    ]);
    expect(result.map((section) => section.id)).toEqual(['latest', 'faq']);
  });
});
```

- [ ] **Step 7: Run FAQ helper tests and verify RED**

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/faq-items.test.ts`

Expected: FAIL because `faq-items.ts` does not exist.

- [ ] **Step 8: Implement FAQ item and order helpers**

Implement immutable helpers using array spread/map/filter and dnd-kit's `arrayMove`. `addFaqItem` appends `{ question: '', answer: '' }`; invalid indexes return the original array. `pinFaqLast` preserves non-FAQ sections and appends the first FAQ without inventing a second one.

- [ ] **Step 9: Run FAQ helper tests and verify GREEN**

Run: `pnpm test -- src/admin/features/homepage/utils/__tests__/faq-items.test.ts`

Expected: PASS.

- [ ] **Step 10: Build the structured FAQ editor**

Create `FaqItemList.tsx` following `RecipeRefList`:

- pointer and keyboard sensors;
- sortable IDs based on current item index;
- drag handle with `aria-label="Reorder FAQ item N"`;
- controlled question input and answer textarea;
- icon-only delete button with `aria-label="Delete FAQ item N"`;
- compact divided rows rather than nested cards;
- Add Question command using a `Plus` icon;
- explicit empty state with the same Add Question action.

Export it from the component barrel and replace the read-only serialized textarea in `FaqSection.tsx`.

- [ ] **Step 11: Pin FAQ last in the admin**

In `Homepage.tsx`, normalize loaded/default sections through `pinFaqLast`, prevent a reorder when `activeId` or `overId` is `faq`, and keep FAQ immediately before the synthetic SEO nav entry. In `HomepageLayout.tsx`, set `draggable` false for both `faq` and `seo`.

Do not remove FAQ activation or editing. Do not change public rendering in this task.

- [ ] **Step 12: Verify Task 2**

Run:

```bash
pnpm test -- src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/shared/validation/schemas/__tests__/settings.test.ts src/admin/features/homepage/utils/__tests__/faq-items.test.ts
pnpm typecheck
pnpm check:boundaries
```

Expected: all commands PASS.

- [ ] **Step 13: Commit Task 2**

```bash
git add src/modules/settings/types/settings.types.ts src/modules/settings/services/settings.service.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/shared/validation/schemas/settings.ts src/shared/validation/schemas/__tests__/settings.test.ts src/admin/features/homepage/utils/faq-items.ts src/admin/features/homepage/utils/__tests__/faq-items.test.ts src/admin/features/homepage/components/FaqItemList.tsx src/admin/features/homepage/components/index.ts src/admin/features/homepage/components/HomepageLayout.tsx src/admin/features/homepage/pages/Homepage.tsx src/admin/features/homepage/pages/sections/FaqSection.tsx
git commit -m "feat(homepage-admin): add structured FAQ editor"
```

Return the commit hash, RED/GREEN evidence, and exact changed paths.

---

### Task 3: Fixed-Last Public FAQ and Homepage AEO

**Files:**
- Modify: `src/site/utils/home-data.ts`
- Modify: `src/site/utils/__tests__/home-data.test.ts`
- Modify: `src/site/utils/home-jsonld.ts`
- Modify: `src/site/utils/__tests__/home-jsonld.test.ts`
- Create: `src/site/components/home/HomeFaq.astro`
- Modify: `src/site/components/home/HomeSections.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Extends `HomeSectionVM` with `{ kind: 'faq'; section: HomepageFaqSection; items: HomepageFaqItem[] }`.
- Produces: `getRenderableHomepageFaqItems(section: HomepageFaqSection): HomepageFaqItem[]`.
- Extends `HomeJsonLdInput` with optional `recipes: HomeJsonLdRecipe[]` and `faqItems: HomepageFaqItem[]`.
- Produces: `serializeJsonLd(node: JsonLdNode): string`, escaping `<` as `\\u003c`.
- Consumes existing `src/site/components/content/FAQSection.astro` so homepage and article FAQs match.

- [ ] **Step 1: Write failing FAQ resolution tests**

Add to `home-data.test.ts`:

```ts
it('resolves only complete FAQ items', async () => {
  const sections: HomepageSection[] = [{
    id: 'faq',
    type: 'faq',
    enabled: true,
    title: 'FAQ',
    items: [
      { question: ' Valid? ', answer: ' Yes. ' },
      { question: '', answer: 'Missing question' },
      { question: 'Missing answer', answer: '   ' },
    ],
  }];
  const vms = await resolveHomeData(sections, { db: DB, stories: [] });
  expect(vms).toEqual([expect.objectContaining({
    kind: 'faq',
    items: [{ question: 'Valid?', answer: 'Yes.' }],
  })]);
});
```

- [ ] **Step 2: Run home-data test and verify RED**

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: FAIL because FAQ currently falls through.

- [ ] **Step 3: Implement the FAQ view model**

Import `HomepageFaqSection` and `HomepageFaqItem`, add the FAQ VM union member, implement `getRenderableHomepageFaqItems` to trim and filter complete pairs, and push the FAQ VM only when the filtered list is non-empty. Disabled FAQ remains covered by the existing early skip.

- [ ] **Step 4: Run home-data test and verify GREEN**

Run: `pnpm test -- src/site/utils/__tests__/home-data.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing JSON-LD tests**

Extend `home-jsonld.test.ts`:

```ts
it('uses the canonical recipe search parameter', () => {
  const [website] = buildHomeJsonLd({
    identity,
    organization,
    socialLinks: [],
    searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
  });
  const action = website.potentialAction as { target: { urlTemplate: string } };
  expect(action.target.urlTemplate).toBe('https://x.test/recipes?search={search_term_string}');
});

it('emits a deduplicated ItemList in visible order with absolute URLs', () => {
  const nodes = buildHomeJsonLd({
    identity,
    organization,
    socialLinks: [],
    searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
    recipes: [
      { id: 1, name: 'Hero', url: '/recipes/hero' },
      { id: 1, name: 'Hero duplicate', url: '/recipes/hero' },
      { id: 2, name: 'Featured', url: '/recipes/featured' },
    ],
  });
  const itemList = nodes.find((node) => node['@type'] === 'ItemList');
  expect(itemList?.itemListElement).toEqual([
    { '@type': 'ListItem', position: 1, name: 'Hero', url: 'https://x.test/recipes/hero' },
    { '@type': 'ListItem', position: 2, name: 'Featured', url: 'https://x.test/recipes/featured' },
  ]);
});

it('emits FAQPage only for supplied renderable items', () => {
  const nodes = buildHomeJsonLd({
    identity,
    organization,
    socialLinks: [],
    searchUrlTemplate: 'https://x.test/recipes?search={search_term_string}',
    faqItems: [{ question: 'Q?', answer: 'A.' }],
  });
  expect(nodes.find((node) => node['@type'] === 'FAQPage')).toMatchObject({
    mainEntity: [{
      '@type': 'Question',
      name: 'Q?',
      acceptedAnswer: { '@type': 'Answer', text: 'A.' },
    }],
  });
});

it('escapes less-than characters when serializing JSON-LD', () => {
  expect(serializeJsonLd({ '@type': 'Thing', value: '</script>' }))
    .toContain('\\u003c/script>');
});
```

Also assert `ItemList` and `FAQPage` are omitted for empty inputs.

- [ ] **Step 6: Run JSON-LD tests and verify RED**

Run: `pnpm test -- src/site/utils/__tests__/home-jsonld.test.ts`

Expected: FAIL because recipe/FAQ inputs and `serializeJsonLd` do not exist.

- [ ] **Step 7: Implement ItemList, FAQPage, and safe serialization**

```ts
export interface HomeJsonLdRecipe {
  id: number;
  name: string;
  url: string;
}

export function serializeJsonLd(node: JsonLdNode): string {
  return JSON.stringify(node).replace(/</g, '\\u003c');
}
```

Build `ItemList` after deduplicating recipes by positive ID and using URL as fallback. Resolve relative URLs against `identity.site_url`. Build `FAQPage` from supplied items. Preserve the existing `WebSite` and `Organization` nodes and ordering.

- [ ] **Step 8: Run JSON-LD tests and verify GREEN**

Run: `pnpm test -- src/site/utils/__tests__/home-jsonld.test.ts`

Expected: PASS.

- [ ] **Step 9: Render the homepage FAQ last using article style**

Create `HomeFaq.astro` as a spacing/constrained-width wrapper that renders `@site/components/content/FAQSection.astro` with the homepage title and filtered items. Do not copy article FAQ CSS and do not add a second accordion implementation.

In `HomeSections.astro`:

```ts
const faqVm = sections.find((vm) => vm.kind === 'faq');
const orderedSections = sections.filter((vm) => vm.kind !== 'faq');
```

Render `orderedSections` through the existing switch, then one `HomeFaq` after the loop. Fixed-last behavior must not depend on stored order.

- [ ] **Step 10: Feed visible recipes and FAQ into homepage JSON-LD**

In `src/pages/index.astro`, derive recipes from resolved Hero VMs followed by Featured VMs. Map each article to `{ id, name: headline, url: route || '/recipes/' + slug }`. Read filtered FAQ items from the resolved FAQ VM. Pass both arrays to `buildHomeJsonLd`, use the canonical template `/recipes?search={search_term_string}`, and serialize each node with `serializeJsonLd`.

- [ ] **Step 11: Verify Task 3**

Run:

```bash
pnpm test -- src/site/utils/__tests__/home-data.test.ts src/site/utils/__tests__/home-jsonld.test.ts
pnpm typecheck
pnpm check:boundaries
```

Expected: all commands PASS.

- [ ] **Step 12: Commit Task 3**

```bash
git add src/site/utils/home-data.ts src/site/utils/__tests__/home-data.test.ts src/site/utils/home-jsonld.ts src/site/utils/__tests__/home-jsonld.test.ts src/site/components/home/HomeFaq.astro src/site/components/home/HomeSections.astro src/pages/index.astro
git commit -m "feat(home): render FAQ and complete homepage AEO"
```

Return the commit hash, RED/GREEN evidence, and exact changed paths.

---

### Task 4: Integration, Review, and Verification

**Files:**
- Review all Task 1-3 files.
- Do not modify production code directly in the controller session; dispatch a focused fixer for validated issues.

**Interfaces:**
- Consumes the three disjoint implementation commits.
- Produces an integrated P3A branch with repository-wide evidence.

- [ ] **Step 1: Integrate the three task commits**

Cherry-pick each returned commit in Task 1, Task 2, Task 3 order. Resolve no conflict by discarding changes; compare unexpected overlaps against the design spec.

- [ ] **Step 2: Run focused P3A tests**

```bash
pnpm test -- src/site/utils/__tests__/recipe-listing.test.ts src/modules/settings/services/__tests__/homepage-settings-service.test.ts src/shared/validation/schemas/__tests__/settings.test.ts src/admin/features/homepage/utils/__tests__/faq-items.test.ts src/site/utils/__tests__/home-data.test.ts src/site/utils/__tests__/home-jsonld.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 3: Run repository verification**

```bash
pnpm test
pnpm typecheck
pnpm check:boundaries
```

Expected: all commands PASS with no new warning attributable to P3A.

- [ ] **Step 4: Dispatch whole-change code review**

Give the reviewer the design spec, this plan, base commit before Task 1, final commit, and two unrelated dirty paths. Require findings ordered by severity and exact file/line references. Review search preservation, FAQ fixed-last behavior, JSON-LD visibility parity, serialization safety, accessibility, and missing tests.

- [ ] **Step 5: Fix validated findings through one focused agent**

If review has Critical or Important findings, send the complete list to one fixer, require regression tests first, integrate its commit, and run one scoped re-review. Do not perform an unreviewed controller fix.

- [ ] **Step 6: Browser verification after permission**

Use an existing healthy local server or start `pnpm dev` on a free port. Do not open a browser unless explicitly permitted in the active context. Verify desktop and mobile:

- navbar search submits `search` and filters recipes;
- category, tag, and page links preserve the active term;
- FAQ admin add/edit/delete/keyboard reorder and save/reload;
- FAQ cannot be moved and renders after all homepage sections;
- homepage and article FAQ visual treatments match;
- homepage has one H1 and no hero search field;
- `SearchAction`, `ItemList`, and conditional `FAQPage` match visible content;
- no overlap, broken image, or new console error.

- [ ] **Step 7: Final status and commit hygiene**

Run `git status --short` and `git log --oneline -8`. Confirm only the user's pre-existing `NutritionFacts.astro` and `TocHeader.astro` edits remain uncommitted. Report all verification evidence and any browser step not run.
