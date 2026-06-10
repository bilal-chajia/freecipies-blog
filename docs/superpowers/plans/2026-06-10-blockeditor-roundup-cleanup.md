# BlockEditor Roundup Pipeline — Repair & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the roundup edit→display pipeline end to end: stop the data-loss bug where stored items are wiped on save, persist and render the group title/description and the "show stats" setting, fix the four serialization findings, and remove dead/duplicate code.

**Architecture:** The roundup data owner is `articles.roundup_json` (snake_case, per `docs/ROUNDUP_JSON_CONTRACT.md`). The editor holds the list in one singleton `roundupList` block whose props mirror that JSON. The repair restores the missing **hydration** (DB→editor) and **presentation persistence** (editor→DB), makes save **authoritative** instead of debounce-dependent, and wires the public renderer to the persisted presentation fields. Two new top-level fields (`group_title`, `group_description`, `show_stats`) are added to the contract per the user's explicit approval.

**Tech Stack:** React 19 + BlockNote custom blocks, Astro SSR, Drizzle/D1, Vitest, TypeScript strict, pnpm.

**Contract (amended by this plan, with user approval):** `docs/ROUNDUP_JSON_CONTRACT.md` gains roundup-level presentation settings. All other contract rules (snake_case, image `r2_key` for internal items, no per-item D1 reads at render) are preserved.

**Out of scope (flagged separately):** `/api/roundups` response uses camelCase keys (`itemCount`, `categoryLabel`, `authorName`, `hasMore`, `totalPages`). This is a *systemic* naming issue shared by the `formatSuccessResponse` pagination shape across all list endpoints, and the public roundup pages do **not** consume this endpoint (`src/pages/roundups/index.astro` reads `getArticles` + `cached_card.item_count` directly). Fixing it touches every list API and its consumers — it belongs in its own change, not this roundup pass.

**Data flow reference (post-repair):**
```
DB roundup_json  ──toEditor──▶  roundupList block props (title, description, showStats, itemsJson)
   ▲                                      │
   │                              (user edits in RoundupListSettings)
   │                                      ▼
   └──buildRoundupJson──◀── handleSave (authoritative) / 800ms change debounce
                                          │
server transformArticleInput ──normalizeRoundupJson──▶ stored roundup_json
                                          │
public RoundupItemList.astro ◀── reads items + group_title/description/show_stats
```

**Key facts for the engineer:**
- The singleton `roundupList` editor block uses `props.itemsJson` (a JSON string), `props.title`, `props.description`, `props.showStats`. These are BlockNote propSchema keys (camelCase is fine — they are editor-internal, not stored data keys).
- When serialized to `roundup_json`, the data keys are snake_case: `group_title`, `group_description`, `show_stats`, and per-item `external_url`, `source_type`, `recipe.total_time_minutes`, `rating.rating_value`.
- `buildItem` in `RoundupListSettings.tsx` writes each item in the exact stored snake_case shape already. Legacy camelCase keys (`externalUrl`, `sourceType`) no longer exist in stored data and the server strips them (`article-json-contract.ts:342`).
- Run a single test file: `pnpm vitest run <path>`. Full suite: `pnpm test`. Boundaries: `pnpm check:boundaries`. Baseline is 238 tests green.

---

### Task 0: Manual reproduction of the data-loss bug (user-driven checkpoint)

**No code.** Per the user's decision to verify P0-1 before fixing, confirm the bug first.

- [ ] **Step 1: Reproduce**

In `pnpm dev`, open an existing roundup article that has curated items. Observe whether the editor's Roundup List block shows the items or "Your collection is empty". Then Save and reload.

Expected (bug present): the block loads empty; after Save→reload the items are gone and `roundup_json.items` is `[]`.

- [ ] **Step 2: Record the result**

If confirmed, proceed with the plan. If the items DO load and survive (bug not reproducible), stop and tell the author — Task 1/2 assumptions need revisiting before continuing.

---

### Task 1: Failing test — RoundupListAdapter must hydrate items from roundup_json

**Files:**
- Test: `src/admin/components/BlockEditor/blocks/adapters/__tests__/roundtrip.test.ts`

- [ ] **Step 1: Add a failing hydration test**

Append this `it` block inside the top-level `describe('BlockAdapter round-trip: DB → Editor → DB', ...)` in `roundtrip.test.ts` (after the last existing test, before the closing `});` of the describe):

```ts
  it('hydrates roundupList items and presentation from roundup_json context', () => {
    const adapter = getBlockAdapter('main_roundup');
    expect(adapter).toBeDefined();

    const roundup_json = {
      list_type: 'ItemList',
      group_title: 'Summer Salads',
      group_description: 'Our favourite warm-weather bowls.',
      show_stats: false,
      items: [
        { position: 1, source_type: 'internal_recipe', article_id: 7, slug: 'a', title: 'A' },
        { position: 2, source_type: 'external_recipe', external_url: 'https://x.test', title: 'B' },
      ],
    };

    const editorBlock = adapter!.toEditor({ type: 'main_roundup' } as any, { roundup_json }) as any;

    expect(editorBlock.type).toBe('roundupList');
    expect(editorBlock.props.title).toBe('Summer Salads');
    expect(editorBlock.props.description).toBe('Our favourite warm-weather bowls.');
    expect(editorBlock.props.showStats).toBe(false);
    const items = JSON.parse(editorBlock.props.itemsJson);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('A');
    expect(items[1].external_url).toBe('https://x.test');
  });
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/adapters/__tests__/roundtrip.test.ts`
Expected: FAIL — `editorBlock.props.itemsJson` is `undefined` (adapter ignores context), so `JSON.parse(undefined)` throws / assertions fail. This reproduces the data-loss root cause at the unit level.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/admin/components/BlockEditor/blocks/adapters/__tests__/roundtrip.test.ts
git commit -m "test(roundup): failing test — adapter must hydrate items from roundup_json"
```

---

### Task 2: Fix hydration — RoundupListAdapter reads context + register for resync

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/adapters/RoundupListAdapter.ts`
- Modify: `src/admin/components/BlockEditor/hooks/useBlockEditorHydration.ts:13-20`

- [ ] **Step 1: Hydrate items + presentation in the adapter**

Replace the entire body of `RoundupListAdapter.ts` with:

```ts
import type { BlockAdapter } from '../BlockAdapter';
import type { MainRoundupBlock } from '@modules/articles/types/content-blocks.types';
import { parseJsonObject, parseJsonArray } from '../../utils/json';

export const RoundupListAdapter: BlockAdapter<MainRoundupBlock> = {
    type: 'main_roundup',

    toEditor(_block, context) {
        const roundup = parseJsonObject<Record<string, unknown>>(context?.roundup_json, {});
        const items = parseJsonArray(roundup.items);
        const groupTitle = typeof roundup.group_title === 'string' ? roundup.group_title : '';
        const groupDescription = typeof roundup.group_description === 'string' ? roundup.group_description : '';
        return {
            type: 'roundupList',
            props: {
                title: groupTitle,
                description: groupDescription,
                showStats: roundup.show_stats !== false,
                itemsJson: JSON.stringify(items),
            },
        };
    },

    fromEditor(): MainRoundupBlock {
        return {
            type: 'main_roundup',
        };
    },
};
```

(`parseJsonObject`/`parseJsonArray` already exist in `../../utils/json` and are used by `FAQAdapter`/`RelatedContentAdapter`. They tolerate string or object input and bad JSON.)

- [ ] **Step 2: Verify `parseJsonObject` / `parseJsonArray` exist with these signatures**

Run: `pnpm exec rg -n "export function parseJson(Object|Array)" src/admin/components/BlockEditor/utils/json.ts`
Expected: both exported. If `parseJsonObject`'s second arg is not a default, adjust the call to match its signature (FAQAdapter line 24 is the reference usage: `parseJsonObject<Record<string, unknown>>(context?.faqs_json, {})`).

- [ ] **Step 3: Register roundupList for source-data resync**

In `useBlockEditorHydration.ts`, add `'roundupList'` to the `SOURCE_HYDRATED_EDITOR_TYPES` set (lines 13-20):

```ts
const SOURCE_HYDRATED_EDITOR_TYPES = new Set([
  'customImage',
  'beforeAfter',
  'faqSection',
  'mainRecipe',
  'relatedContent',
  'roundupList',
  'simpleTable',
]);
```

- [ ] **Step 4: Run the failing test — now passes**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/adapters/__tests__/roundtrip.test.ts`
Expected: PASS — all round-trip tests green including the new hydration test.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/adapters/RoundupListAdapter.ts src/admin/components/BlockEditor/hooks/useBlockEditorHydration.ts
git commit -m "fix(roundup): hydrate items + presentation from roundup_json (data-loss fix)"
```

---

### Task 3: Amend the contract + types for roundup presentation settings

**Files:**
- Modify: `docs/ROUNDUP_JSON_CONTRACT.md`
- Modify: `src/modules/articles/types/roundups.types.ts:86-92`

- [ ] **Step 1: Add presentation settings to RoundupJson type**

In `roundups.types.ts`, replace the `RoundupJson` interface (lines 86-92):

```ts
export interface RoundupJson {
    /** Schema.org list type */
    list_type: RoundupListType;

    /** Collection of roundup items */
    items: RoundupItem[];
}
```

with:

```ts
export interface RoundupJson {
    /** Schema.org list type */
    list_type: RoundupListType;

    /** Collection of roundup items */
    items: RoundupItem[];

    /** Optional editorial heading shown above the roundup list. */
    group_title?: string;

    /** Optional editorial description shown under the group heading. */
    group_description?: string;

    /** Whether recipe stat badges (time/difficulty/rating) render on each card. Defaults to true. */
    show_stats?: boolean;
}
```

- [ ] **Step 2: Document the fields in the contract**

In `docs/ROUNDUP_JSON_CONTRACT.md`, under `## Canonical Compatibility Shape`, after the `Stored JSON uses snake_case.` line and its `{ "items": [], "list_type": "ItemList" }` block, add:

```markdown
### Presentation Settings

`roundup_json` owns the roundup list's own presentation, alongside its items:

| Field | Required | Source | Rule |
| --- | --- | --- | --- |
| `group_title` | no | Roundup editor | Optional editorial heading for the list. Omitted when blank. |
| `group_description` | no | Roundup editor | Optional editorial description under the heading. Omitted when blank. |
| `show_stats` | no | Roundup editor | Whether recipe stat badges render on each card. Defaults to `true`. |

These are presentation of the roundup itself (not per-item display features), so they belong to `roundup_json`, not the `content_json.main_roundup` position marker.
```

- [ ] **Step 3: Verify types compile**

Run: `pnpm vitest run src/modules/articles/utils/__tests__/article-json-contract.test.ts`
Expected: PASS (existing tests unaffected; type-only change).

- [ ] **Step 4: Commit**

```bash
git add docs/ROUNDUP_JSON_CONTRACT.md src/modules/articles/types/roundups.types.ts
git commit -m "feat(roundup): add group_title/group_description/show_stats to contract + types"
```

---

### Task 4: Serialize presentation settings + drop camelCase fallbacks

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/roundup-serialization.ts`
- Test: `src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`

- [ ] **Step 1: Update/extend the tests**

In `roundup-serialization.test.ts`, replace the `infers source_type from the presence of an external url` test (lines 42-51) with the snake_case version plus three new presentation tests:

```ts
  it('infers source_type from the presence of an external url', () => {
    const [internal, external] = buildRoundupItems([
      {
        type: 'roundupList',
        props: { items: [{ slug: 'a' }, { external_url: 'https://x.test' }] },
      },
    ]);
    expect(internal.source_type).toBe('internal_recipe');
    expect(external.source_type).toBe('external_recipe');
  });

  it('does not honor legacy camelCase keys (NAMING_CONTRACT: snake_case only)', () => {
    const [item] = buildRoundupItems([
      {
        type: 'roundupList',
        props: { items: [{ externalUrl: 'https://x.test', sourceType: 'external_recipe' }] },
      },
    ]);
    expect(item.source_type).toBe('internal_recipe');
    expect(item.external_url).toBe('');
  });

  it('serializes group title, description and show_stats from the block props', () => {
    const json = JSON.parse(
      buildRoundupJson([
        {
          type: 'roundupList',
          props: { title: 'Summer Salads', description: 'Warm-weather bowls.', showStats: false, itemsJson: '[]' },
        },
      ])
    );
    expect(json.group_title).toBe('Summer Salads');
    expect(json.group_description).toBe('Warm-weather bowls.');
    expect(json.show_stats).toBe(false);
  });

  it('omits blank group title/description and defaults show_stats to true', () => {
    const json = JSON.parse(
      buildRoundupJson([
        { type: 'roundupList', props: { title: '   ', description: '', itemsJson: '[]' } },
      ])
    );
    expect(json.group_title).toBeUndefined();
    expect(json.group_description).toBeUndefined();
    expect(json.show_stats).toBe(true);
  });

  it('emits no presentation fields when there is no roundupList block', () => {
    const json = JSON.parse(buildRoundupJson([{ type: 'paragraph', props: {} }]));
    expect(json).toEqual({ list_type: 'ItemList', items: [] });
  });
```

- [ ] **Step 2: Run the tests and confirm new ones fail**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`
Expected: FAIL — presentation tests fail (fields not emitted) and the legacy-keys test fails (fallback still honors `sourceType`).

- [ ] **Step 3: Update the serializer**

In `roundup-serialization.ts`:

(a) Replace the `RoundupSerializedItem` source-type/external lines (the `.map` body, lines 59-65) — remove the camelCase fallbacks:

```ts
        source_type:
          it.source_type ??
          it.sourceType ??
          (it.external_url || it.externalUrl ? 'external_recipe' : 'internal_recipe'),
        article_id: it.article_id ?? null,
        slug: it.slug ?? '',
        external_url: it.external_url ?? it.externalUrl ?? '',
```

becomes:

```ts
        source_type:
          it.source_type ??
          (it.external_url ? 'external_recipe' : 'internal_recipe'),
        article_id: it.article_id ?? null,
        slug: it.slug ?? '',
        external_url: it.external_url ?? '',
```

(b) Extend the `RoundupPayload` type (lines 30-33):

```ts
export type RoundupPayload = {
  list_type: 'ItemList';
  items: RoundupSerializedItem[];
};
```

becomes:

```ts
export type RoundupPayload = {
  list_type: 'ItemList';
  items: RoundupSerializedItem[];
  group_title?: string;
  group_description?: string;
  show_stats?: boolean;
};
```

(c) Add a presentation extractor and use it in `buildRoundupJson` (replace lines 80-87):

```ts
/** Serialize editor roundupList blocks into the roundup_json string. */
export function buildRoundupJson(blocks: RoundupSourceBlock[]): string {
  const payload: RoundupPayload = {
    list_type: 'ItemList',
    items: buildRoundupItems(blocks),
  };
  return JSON.stringify(payload, null, 2);
}
```

becomes:

```ts
/** Read the singleton roundupList block's presentation settings. */
function extractPresentation(
  blocks: RoundupSourceBlock[]
): Pick<RoundupPayload, 'group_title' | 'group_description' | 'show_stats'> {
  const props = blocks.find((b) => b.type === 'roundupList')?.props ?? {};
  const groupTitle = typeof props.title === 'string' ? props.title.trim() : '';
  const groupDescription = typeof props.description === 'string' ? props.description.trim() : '';
  return {
    ...(groupTitle ? { group_title: groupTitle } : {}),
    ...(groupDescription ? { group_description: groupDescription } : {}),
    show_stats: props.showStats !== false,
  };
}

/** Serialize editor roundupList blocks into the roundup_json string. */
export function buildRoundupJson(blocks: RoundupSourceBlock[]): string {
  const hasBlock = blocks.some((b) => b.type === 'roundupList');
  const payload: RoundupPayload = {
    list_type: 'ItemList',
    items: buildRoundupItems(blocks),
    ...(hasBlock ? extractPresentation(blocks) : {}),
  };
  return JSON.stringify(payload, null, 2);
}
```

- [ ] **Step 4: Run the tests — all pass**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`
Expected: PASS — all serialization tests green.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/roundup-serialization.ts src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts
git commit -m "feat(roundup): serialize presentation settings; drop camelCase fallbacks"
```

---

### Task 5: Fix RoundupListBlock + RoundupListSettings (the four findings)

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/RoundupListBlock.tsx`
- Modify: `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx:163`

Render-only components; TypeScript strict + the suite enforce correctness. Five edits:

- [ ] **Step 1: Align the item type to the stored snake_case shape**

In `RoundupListBlock.tsx`, replace the `RoundupListItem` type (lines 11-23):

```ts
type RoundupListItem = {
    article_id?: string | number;
    externalUrl?: string;
    title?: string;
    subtitle?: string;
    note?: string;
    image?: Parameters<typeof getBestVariantUrl>[0];
    stats?: {
        totalTime?: number;
        difficulty?: string;
        rating?: number | string;
    };
};
```

with:

```ts
type RoundupListItem = {
    article_id?: string | number;
    external_url?: string;
    title?: string;
    subtitle?: string;
    note?: string;
    image?: Parameters<typeof getBestVariantUrl>[0];
    recipe?: {
        total_time_minutes?: number | null;
        difficulty?: string | null;
    } | null;
    rating?: {
        rating_value?: number | null;
    } | null;
};
```

- [ ] **Step 2: Fix the React key (use the field that exists)**

Line 134, replace `item.externalUrl` with `item.external_url`:

```tsx
key={`${item.article_id || item.external_url}-${index}`}
```

- [ ] **Step 3: Fix the duplicate-operand icon condition**

Line 161, replace `{item.article_id || item.article_id ? (` with:

```tsx
{item.article_id ? (
```

- [ ] **Step 4: Wire the stats preview to the real snapshot fields**

Replace the dead "Stats Mini" block (lines 178-197):

```tsx
{/* Stats Mini */}
{(block.props.showStats && item.stats) && (
    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
        {item.stats.totalTime && (
            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                {item.stats.totalTime}m
            </span>
        )}
        {item.stats.difficulty && (
            <span className="text-[10px] font-bold text-muted-foreground">
                {item.stats.difficulty}
            </span>
        )}
        {item.stats.rating && (
            <span className="text-[10px] font-bold text-orange-500">
                ★ {item.stats.rating}
            </span>
        )}
    </div>
)}
```

with:

```tsx
{/* Stats Mini */}
{(block.props.showStats && (item.recipe || item.rating)) && (
    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
        {item.recipe?.total_time_minutes ? (
            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                {item.recipe.total_time_minutes}m
            </span>
        ) : null}
        {item.recipe?.difficulty && (
            <span className="text-[10px] font-bold text-muted-foreground">
                {item.recipe.difficulty}
            </span>
        )}
        {item.rating?.rating_value ? (
            <span className="text-[10px] font-bold text-orange-500">
                ★ {item.rating.rating_value}
            </span>
        ) : null}
    </div>
)}
```

(Ternaries avoid rendering a literal `0`. `rating` is the object snapshot `{rating_value,...}` per the contract — the old `item.stats.rating` scalar never existed.)

- [ ] **Step 5: Remove the duplicate operand in RoundupListSettings**

In `RoundupListSettings.tsx` line 163, replace:

```ts
            description: item.short_description || item.short_description || '',
```

with:

```ts
            description: item.short_description || '',
```

- [ ] **Step 6: Run the full suite (TypeScript surfaces via vitest transform)**

Run: `pnpm test`
Expected: PASS — 238 baseline + new tests, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/RoundupListBlock.tsx src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx
git commit -m "fix(roundup): snake_case item shape, dedupe conditions, revive stats preview"
```

---

### Task 6: Preserve presentation settings through server normalization

**Files:**
- Modify: `src/modules/articles/utils/article-json-contract.ts:319-350`
- Test: `src/modules/articles/utils/__tests__/article-json-contract.test.ts`

`normalizeRoundupJson` runs on every save (`api/helpers.ts:113`) and currently returns only `{ items, list_type }`, silently dropping the new top-level fields.

- [ ] **Step 1: Add a failing test**

In `article-json-contract.test.ts`, after the existing `normalizeRoundupJson` test (near line 122), add:

```ts
  it('preserves roundup presentation settings (group title/description/show_stats)', () => {
    const roundup = normalizeRoundupJson({
      list_type: 'ItemList',
      group_title: 'Summer Salads',
      group_description: 'Warm-weather bowls.',
      show_stats: false,
      items: [{ source_type: 'internal_recipe', article_id: 7, slug: 'a', title: 'A' }],
    }) as Record<string, unknown>;

    expect(roundup.group_title).toBe('Summer Salads');
    expect(roundup.group_description).toBe('Warm-weather bowls.');
    expect(roundup.show_stats).toBe(false);
  });

  it('omits blank presentation fields on normalization', () => {
    const roundup = normalizeRoundupJson({ items: [] }) as Record<string, unknown>;
    expect(roundup.group_title).toBeUndefined();
    expect('show_stats' in roundup).toBe(false);
  });
```

- [ ] **Step 2: Run it and confirm failure**

Run: `pnpm vitest run src/modules/articles/utils/__tests__/article-json-contract.test.ts`
Expected: FAIL — `group_title` etc. are `undefined` (dropped by normalization).

- [ ] **Step 3: Preserve the fields in normalizeRoundupJson**

Replace the function (lines 319-350):

```ts
export function normalizeRoundupJson(value: unknown) {
  const source = isRecord(value) ? value : {};
  return {
    items: arrayOrEmpty(source.items).map((item, index) => {
      if (!isRecord(item)) return { position: index + 1, source_type: 'internal_recipe', title: '' };
      const sourceType = item.source_type === 'external_recipe' || item.external_url
        ? 'external_recipe'
        : 'internal_recipe';
      const normalized: JsonRecord = {
        ...item,
        position: numberOrNull(item.position) ?? index + 1,
        source_type: sourceType,
        title: stringOrNull(item.title) ?? '',
      };
      if (sourceType === 'internal_recipe') {
        const article_id = numberOrNull(pick(item, 'article_id'));
        if (article_id !== null) normalized.article_id = article_id;
        const slug = stringOrNull(item.slug);
        if (slug) normalized.slug = slug;
      }
      const externalUrl = stringOrNull(item.external_url);
      if (externalUrl) normalized.external_url = externalUrl;
      delete normalized.cover;
      delete normalized.externalUrl;
      delete normalized.canonicalUrl;
      delete normalized.sourceType;
      delete normalized.listType;
      return normalized;
    }),
    list_type: 'ItemList',
  };
}
```

with (same item logic, new top-level passthrough):

```ts
export function normalizeRoundupJson(value: unknown) {
  const source = isRecord(value) ? value : {};
  const result: JsonRecord = {
    items: arrayOrEmpty(source.items).map((item, index) => {
      if (!isRecord(item)) return { position: index + 1, source_type: 'internal_recipe', title: '' };
      const sourceType = item.source_type === 'external_recipe' || item.external_url
        ? 'external_recipe'
        : 'internal_recipe';
      const normalized: JsonRecord = {
        ...item,
        position: numberOrNull(item.position) ?? index + 1,
        source_type: sourceType,
        title: stringOrNull(item.title) ?? '',
      };
      if (sourceType === 'internal_recipe') {
        const article_id = numberOrNull(pick(item, 'article_id'));
        if (article_id !== null) normalized.article_id = article_id;
        const slug = stringOrNull(item.slug);
        if (slug) normalized.slug = slug;
      }
      const externalUrl = stringOrNull(item.external_url);
      if (externalUrl) normalized.external_url = externalUrl;
      delete normalized.cover;
      delete normalized.externalUrl;
      delete normalized.canonicalUrl;
      delete normalized.sourceType;
      delete normalized.listType;
      return normalized;
    }),
    list_type: 'ItemList',
  };

  const groupTitle = stringOrNull(source.group_title);
  if (groupTitle) result.group_title = groupTitle;
  const groupDescription = stringOrNull(source.group_description);
  if (groupDescription) result.group_description = groupDescription;
  if (typeof source.show_stats === 'boolean') result.show_stats = source.show_stats;

  return result;
}
```

- [ ] **Step 4: Run the tests — pass**

Run: `pnpm vitest run src/modules/articles/utils/__tests__/article-json-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/articles/utils/article-json-contract.ts src/modules/articles/utils/__tests__/article-json-contract.test.ts
git commit -m "fix(roundup): preserve presentation settings through server normalization"
```

---

### Task 7: Make save authoritative (fix the debounce race)

**Files:**
- Modify: `src/admin/features/articles/pages/shared/useContentEditor.ts` (import + handleSave ~line 481-490)

`handleSave` recomputes `content_json` synchronously from the editor but leaves `roundup_json` to the 800ms debounce — a fast save persists stale items. Recompute it synchronously too.

- [ ] **Step 1: Import the serializer**

In `useContentEditor.ts`, after the existing `flattenBlocks` import (line 8), add:

```ts
import { buildRoundupJson } from '@admin/components/BlockEditor/blocks/roundup-serialization';
```

- [ ] **Step 2: Recompute roundup_json from the editor at save time**

In `handleSave`, replace the roundup branch inside the `if (editorInstance)` block (lines 484-486):

```ts
            if (!hasRoundupList && contentType === 'roundup') {
                finalRoundupJson = '{"list_type":"ItemList","items":[]}';
            }
```

with:

```ts
            if (contentType === 'roundup') {
                finalRoundupJson = hasRoundupList
                    ? buildRoundupJson(flatBlocks.map(({ block }) => block))
                    : '{"list_type":"ItemList","items":[]}';
            }
```

(`flatBlocks` are BlockNote blocks whose `type` is `roundupList`; `buildRoundupJson` filters on exactly that. This makes the editor document the single source of truth at save, independent of debounce timing.)

- [ ] **Step 3: Run the suite + boundaries**

Run: `pnpm test && pnpm check:boundaries`
Expected: PASS. Boundaries clean (the import is admin→admin, allowed).

- [ ] **Step 4: Commit**

```bash
git add src/admin/features/articles/pages/shared/useContentEditor.ts
git commit -m "fix(roundup): recompute roundup_json synchronously at save (debounce race)"
```

---

### Task 8: Public render — dedupe, read presentation, render stats

**Files:**
- Modify: `src/site/components/RoundupItemList.astro`

The frontmatter hardcodes `groupTitle = ""`, `groupDescription = ""`, `showStats = true` and never reads them; the two if/else branches duplicate the same extraction; the stats markup does not exist.

- [ ] **Step 1: Replace the frontmatter parse block**

Replace lines 27-49 (the `let ... ` declarations through the end of the if/else):

```ts
// Parse roundup if it's a string (Legacy support)
let items: RoundupItem[] = [];
let groupTitle = "";
let groupDescription = "";
let showStats = true;

if (block?.type === "main_roundup") {
  const roundup =
    typeof rawRoundupJson === "string"
      ? JSON.parse(rawRoundupJson)
      : rawRoundupJson || { list_type: "ItemList", items: [] };
  items = (roundup.items || []).sort(
    (a: RoundupItem, b: RoundupItem) => (a.position || 0) - (b.position || 0),
  );
} else {
  const roundup: RoundupJson =
    typeof rawRoundup === "string"
      ? JSON.parse(rawRoundup)
      : rawRoundup || { list_type: "ItemList", items: [] };
  items = (roundup.items || []).sort(
    (a: RoundupItem, b: RoundupItem) => (a.position || 0) - (b.position || 0),
  );
}
```

with:

```ts
// Both entry points (in-body main_roundup marker, standalone roundup) carry the
// same roundup_json shape. Pick whichever prop was supplied and parse once.
const rawRoundup =
  block?.type === "main_roundup" ? rawRoundupJson : rawRoundupProp;
const roundup: RoundupJson =
  (typeof rawRoundup === "string"
    ? (() => {
        try {
          return JSON.parse(rawRoundup);
        } catch {
          return null;
        }
      })()
    : rawRoundup) || { list_type: "ItemList", items: [] };

const items: RoundupItem[] = [...(roundup.items || [])].sort(
  (a: RoundupItem, b: RoundupItem) => (a.position || 0) - (b.position || 0),
);
const groupTitle = roundup.group_title || "";
const groupDescription = roundup.group_description || "";
const showStats = roundup.show_stats !== false;
```

Then update the destructuring at the top (lines 20-25) to rename the `roundup` prop so it does not collide with the new `const roundup`:

```ts
const {
  roundup: rawRoundup,
  block,
  roundup_json: rawRoundupJson,
  startNumber = 1,
} = Astro.props;
```

becomes:

```ts
const {
  roundup: rawRoundupProp,
  block,
  roundup_json: rawRoundupJson,
  startNumber = 1,
} = Astro.props;
```

- [ ] **Step 2: Carry stats into the rendered item view-model**

In the `renderedItems` map (after the `srcSet` computation, before the `return {`), add the stats fields. Replace the `return { ... }` object (lines 72-83) to include them:

```ts
  return {
    item,
    author: item.author,
    href,
    imgData,
    isInternal,
    note,
    position,
    srcSet,
    subtitle,
    title,
  };
```

becomes:

```ts
  return {
    item,
    author: item.author,
    href,
    imgData,
    isInternal,
    note,
    position,
    srcSet,
    subtitle,
    title,
    totalTime: item.recipe?.total_time_minutes ?? null,
    difficulty: item.recipe?.difficulty ?? null,
    ratingValue: item.rating?.rating_value ?? null,
  };
```

- [ ] **Step 3: Render the stats row (gated by show_stats)**

In the template, update the `.item-header` destructuring and add a stats row. Change the map signature (line 101) to include the new fields, and after the `<div class="item-header">...</div>` block (after line 118), insert the stats markup:

```astro
      difficulty,
      ratingValue,
      totalTime,
    }) => (
        <div class="roundup-item-card" id={`item-${position}`}>
          <div class="item-header">
            <div class="position-badge">{position}</div>
            <h3 class="item-title">
              <a href={href}>{title}</a>
            </h3>
          </div>

          {showStats && (totalTime || difficulty || ratingValue) && (
            <div class="item-stats">
              {totalTime && <span class="stat">{totalTime} min</span>}
              {difficulty && <span class="stat">{difficulty}</span>}
              {ratingValue && <span class="stat stat-rating">★ {ratingValue}</span>}
            </div>
          )}
```

(Add `difficulty, ratingValue, totalTime` to the existing destructured params alongside `author, href, imgData, ...`.)

- [ ] **Step 4: Add minimal stats styling**

In the `<style>` block, after the `.position-badge { ... }` rule, add:

```css
  .item-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: -0.5rem;
  }

  .stat {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .stat-rating {
    color: var(--brand-secondary);
  }
```

- [ ] **Step 5: Verify the build compiles the component**

Run: `pnpm exec astro check --minimumSeverity error 2>&1 | rg -i "RoundupItemList" || echo "no RoundupItemList errors"`
Expected: `no RoundupItemList errors`. (If `astro check` is slow/unavailable, defer to the Task 10 build; the logic is plain TS.)

- [ ] **Step 6: Commit**

```bash
git add src/site/components/RoundupItemList.astro
git commit -m "feat(roundup): render group heading + stat badges; dedupe parse branches"
```

---

### Task 9: Dead-code cleanup (unused param + debug log)

**Files:**
- Modify: `src/modules/content-blocks/normalize/extract-content.ts:49-51`
- Modify: `src/admin/features/articles/pages/shared/useContentEditor.ts` (the debug `console.log` lines)

- [ ] **Step 1: Drop the unused `title` parameter**

In `extract-content.ts`, replace (lines 49-51):

```ts
function roundupItemAnchor(position: number, title: string): string {
  return `item-${position}`;
}
```

with:

```ts
function roundupItemAnchor(position: number): string {
  return `item-${position}`;
}
```

and update the call site (line ~116):

```ts
          id: roundupItemAnchor(position, text),
```

becomes:

```ts
          id: roundupItemAnchor(position),
```

- [ ] **Step 2: Remove the verbose save debug logs**

In `useContentEditor.ts` `handleSave`, remove these two debug lines (the `[handleSave] Blurring...` log at ~line 466 and the `[handleSave] docBlocks after blur` full-document serialization at ~line 472):

```ts
            console.log('[handleSave] Blurring active element:', document.activeElement.id);
```
```ts
            console.log('[handleSave] docBlocks after blur:', JSON.stringify(docBlocks));
```

(Delete both lines. Keep the surrounding blur/serialize logic intact.)

- [ ] **Step 3: Run TOC extraction tests + suite**

Run: `pnpm test`
Expected: PASS — 238 baseline + all new tests.

- [ ] **Step 4: Commit**

```bash
git add src/modules/content-blocks/normalize/extract-content.ts src/admin/features/articles/pages/shared/useContentEditor.ts
git commit -m "refactor(roundup): drop unused anchor param and verbose save debug logs"
```

---

### Task 10: Final verification

- [ ] **Step 1: Full suite + boundaries**

Run: `pnpm test && pnpm check:boundaries`
Expected: all PASS (≥ 238 + the new tests added in Tasks 1/4/6), boundaries clean.

- [ ] **Step 2: Confirm no camelCase residue remains in the editor roundup path**

Run: `pnpm exec rg -n "externalUrl|sourceType|item\.stats|\.totalTime" src/admin/components/BlockEditor`
Expected: matches only in `__tests__/roundup-serialization.test.ts` (the legacy-keys regression test). Anything else is a missed spot.

- [ ] **Step 3: Production build**

Run: `pnpm build` (ask the user first per CLAUDE.md before running).
Expected: build succeeds; `RoundupItemList.astro` compiles.

- [ ] **Step 4: Manual save→reload round-trip (user-driven)**

Hand off to the user. In `pnpm dev`, on a roundup article:
1. Confirm existing items now **load** in the editor block (Task 2).
2. Set a Group Title/Description, toggle Show Stats off, Save → reload → settings persist (Tasks 3-6).
3. Toggle Show Stats on, add a recipe with a known time/difficulty → public `/roundups/<slug>` shows the heading and stat badges (Task 8).
4. Edit items and Save immediately (< 1s) → items persist, not wiped (Tasks 2 + 7).

Pause here for the user's confirmation before declaring done.

---

## Post-plan: flagged separate work (NOT in this plan)

`/api/roundups` (`src/pages/api/roundups/index.ts`) returns camelCase data keys (`itemCount`, `categoryLabel`, `authorName`) and a camelCase pagination shape (`totalPages`, `hasMore`) shared by every list endpoint via `formatSuccessResponse`. This violates `docs/NAMING_CONTRACT.md` but is a systemic, cross-endpoint concern — and the public roundup pages don't consume this endpoint. Address it as a dedicated naming pass across all list APIs and their consumers, not inside this roundup repair.
