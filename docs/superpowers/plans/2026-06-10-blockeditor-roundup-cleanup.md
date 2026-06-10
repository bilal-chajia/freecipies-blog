# BlockEditor Roundup Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 4 code-review findings in the BlockEditor roundup pipeline: duplicate operands, dead stats rendering, residual camelCase fallbacks, and the `externalUrl` type/key mismatch.

**Architecture:** All changes are confined to the admin BlockEditor roundup path: the serializer (`roundup-serialization.ts`), the editor block (`RoundupListBlock.tsx`), and the settings sidebar (`RoundupListSettings.tsx`). The items stored in `itemsJson` are written exclusively by `RoundupListSettings.buildItem` in snake_case (`external_url`, `source_type`, `recipe.total_time_minutes`) — that shape is the contract; everything else aligns to it. No API, schema, or site changes.

**Tech Stack:** React 19 + BlockNote custom blocks, Vitest, TypeScript strict, pnpm.

**Contract:** `docs/ROUNDUP_JSON_CONTRACT.md` is the canonical contract for `roundup_json` and the item shape mirrored in the editor's `itemsJson`. It mandates snake_case (`external_url`, `source_type` ∈ `internal_recipe`|`external_recipe`), `recipe.{total_time_minutes,difficulty,servings}`, and `rating` as an object `{rating_value, rating_count}`. Do not modify the contract file.

**Context for the engineer:**
- `itemsJson` is a JSON-string block prop holding an array of roundup items. It is written ONLY by `RoundupListSettings.tsx` (`buildItem`, line ~146) which emits snake_case keys. Older camelCase keys (`externalUrl`, `sourceType`) no longer exist in stored data per the June 2026 NAMING_CONTRACT cleanup.
- `showStats` is a live block prop (toggle at `RoundupListSettings.tsx:405`, default in `RoundupListAdapter.ts:11`). The editor block's stats section is currently dead because it reads a `stats` field that no writer produces; the fix is to read `item.recipe.*` instead (the fields `buildItem` actually writes), not to delete the section.
- Run tests with `pnpm vitest run <path>` for a single file, `pnpm test` for the suite (238 tests green at baseline).

---

### Task 1: Remove camelCase fallbacks from roundup serialization

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/roundup-serialization.ts:59-65`
- Test: `src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`

- [ ] **Step 1: Update the test to the snake_case contract and add a regression test**

In `roundup-serialization.test.ts`, replace the `infers source_type from the presence of an external url` test (lines 42-51) with:

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
```

- [ ] **Step 2: Run the test file to verify the new test fails**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`
Expected: FAIL — `does not honor legacy camelCase keys` fails (`source_type` is `'external_recipe'` because the fallback still reads `it.sourceType`).

- [ ] **Step 3: Remove the fallbacks in the serializer**

In `roundup-serialization.ts`, replace lines 59-65:

```ts
        source_type:
          it.source_type ??
          it.sourceType ??
          (it.external_url || it.externalUrl ? 'external_recipe' : 'internal_recipe'),
        article_id: it.article_id ?? null,
        slug: it.slug ?? '',
        external_url: it.external_url ?? it.externalUrl ?? '',
```

with:

```ts
        source_type:
          it.source_type ??
          (it.external_url ? 'external_recipe' : 'internal_recipe'),
        article_id: it.article_id ?? null,
        slug: it.slug ?? '',
        external_url: it.external_url ?? '',
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `pnpm vitest run src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/roundup-serialization.ts src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts
git commit -m "refactor(roundup): drop legacy camelCase fallbacks from roundup serialization"
```

---

### Task 2: Fix RoundupListBlock — dup operand, snake_case type, live stats

**Files:**
- Modify: `src/admin/components/BlockEditor/blocks/RoundupListBlock.tsx`

This is a render-only BlockNote component with no unit test harness; correctness is enforced by TypeScript strict mode and the existing suite. Three edits in one file:

- [ ] **Step 1: Align the item type to the stored snake_case shape**

Replace the `RoundupListItem` type (lines 11-23):

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
        rating_value?: number;
        rating_count?: number;
    } | null;
};
```

- [ ] **Step 2: Fix the React key to use the field that exists**

Line 134, replace:

```tsx
key={`${item.article_id || item.externalUrl}-${index}`}
```

with:

```tsx
key={`${item.article_id || item.external_url}-${index}`}
```

- [ ] **Step 3: Fix the duplicate-operand icon condition**

Line 161, replace:

```tsx
{item.article_id || item.article_id ? (
```

with:

```tsx
{item.article_id ? (
```

- [ ] **Step 4: Wire the dead stats section to the real `recipe` fields**

Replace the stats block (lines 178-197):

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
{(block.props.showStats && item.recipe) && (
    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
        {item.recipe.total_time_minutes ? (
            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                {item.recipe.total_time_minutes}m
            </span>
        ) : null}
        {item.recipe.difficulty && (
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

(Per ROUNDUP_JSON_CONTRACT, `rating` is an object `{rating_value, rating_count}` — the old code read a scalar `item.stats.rating` that never existed. Ternaries avoid rendering a literal `0`.)

- [ ] **Step 5: Run the test suite**

Run: `pnpm test`
Expected: PASS — 238 tests (TypeScript errors in this file would surface here via vitest's transform; a clean run plus no editor red squiggles = done).

- [ ] **Step 6: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/RoundupListBlock.tsx
git commit -m "fix(roundup): snake_case item shape, dedupe icon condition, revive stats preview"
```

---

### Task 3: Remove duplicate operand in RoundupListSettings

**Files:**
- Modify: `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx:163`

- [ ] **Step 1: Fix the copy-paste duplicate**

Line 163, replace:

```ts
            description: item.short_description || item.short_description || '',
```

with:

```ts
            description: item.short_description || '',
```

- [ ] **Step 2: Run the test suite**

Run: `pnpm test`
Expected: PASS — 238 tests.

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx
git commit -m "fix(roundup): remove duplicate short_description operand in settings"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full suite + boundaries**

Run: `pnpm test && pnpm check:boundaries`
Expected: 238+ tests PASS (Task 1 added one test → expect 239), boundaries clean.

- [ ] **Step 2: Confirm no camelCase residue remains in the roundup path**

Run: `pnpm exec rg -n "externalUrl|sourceType|item\.stats" src/admin/components/BlockEditor`
Expected: matches only in `roundup-serialization.test.ts` (the legacy-keys regression test). Anything else is a missed spot.

- [ ] **Step 3: Manual check (user-driven)**

Per working convention, the user drives the save→reload verification in the admin: open a roundup article, confirm items render with stats when "Show stats" is on, toggle off hides them, and save→reload round-trips `roundup_json` unchanged. Pause here and hand off to the user.
