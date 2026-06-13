# Roundup Marker Harmonization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `roundup_json` the single source of truth for roundup data, written directly by the sidebar settings (recipe pattern), and delete the parallel `buildRoundupJson` derivation from block props.

**Architecture:** The roundup sidebar (`RoundupListSettings`) currently writes BlockNote block props, and a parallel path (`buildRoundupJson` in the editor state manager) derives `roundup_json` from those props. Recipe instead threads its sidecar writer (`recipeData` + `onRecipeChange`) through component props (`GutenbergEditorShell → BlockSettings → BlockSettingsRouter → panels`). This plan replicates the recipe chain for roundup, moves the persistence logic into a pure, unit-tested `roundup-edit.ts` module, and removes the parallel path. The roundup block + adapter + hydration are unchanged (the block already displays props re-seeded from `roundup_json`).

**Tech Stack:** React 19, BlockNote, Zustand, Vitest, Zod 4, TypeScript 6 strict. Read the design spec first: `docs/superpowers/specs/2026-06-13-roundup-marker-harmonization-design.md`.

---

## File Structure

- **Create** `src/admin/components/BlockEditor/blocks/roundup-edit.ts` — pure model + edit helpers (parse/serialize roundup_json, add/remove/move/update-item, presentation setters). The testable core.
- **Create** `src/admin/components/BlockEditor/blocks/__tests__/roundup-edit.test.ts` — unit tests, incl. schema conformance.
- **Modify** `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx` — new props `{ roundup, onRoundupChange }`; persist via `roundup-edit.ts` + `onRoundupChange`.
- **Modify** `src/admin/components/BlockEditor/components/block-settings/panels.tsx` — roundup panel passes `roundupData`/`onRoundupChange`.
- **Modify** `src/admin/components/BlockEditor/components/block-settings/BlockSettingsRouter.tsx` — thread `roundupData`/`onRoundupChange`.
- **Modify** `src/admin/components/BlockEditor/components/BlockSettings.tsx` — thread `roundupData`/`onRoundupChange`.
- **Modify** `src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx` — pass `roundupData`/`onRoundupChange` to `<BlockSettings>`; drop `onRoundupChange` from canvas `blockEditorProps`.
- **Modify** `src/admin/components/BlockEditor/hooks/useEditorStateManager.ts` + `hooks/editorStateManager.helpers.ts` + `index.tsx` — remove the parallel roundup path.
- **Delete (if unused)** `src/admin/components/BlockEditor/blocks/roundup-serialization.ts` + `blocks/__tests__/roundup-serialization.test.ts`.

---

## Task 0: Prep

**Files:** none (investigation + branch)

- [ ] **Step 1: Read the design spec and the prior plan**

Read `docs/superpowers/specs/2026-06-13-roundup-marker-harmonization-design.md` and
`docs/superpowers/plans/2026-06-10-blockeditor-roundup-cleanup.md`. If the prior plan
already did part of this, note overlaps and skip duplicated steps.

- [ ] **Step 2: Confirm `buildRoundupJson` / `buildRoundupItems` usages**

Run: `rg -n "buildRoundupJson|buildRoundupItems|roundup-serialization" src`
Expected: references only in `editorStateManager.helpers.ts`, `roundup-serialization.ts`, and its test. If referenced elsewhere, adjust Task 6/7 to keep what is still used.

- [ ] **Step 3: Create the branch**

```bash
git checkout main
git checkout -b feat/roundup-harmonization
```

---

## Task 1: Pure roundup-edit model + helpers (TDD)

**Files:**
- Create: `src/admin/components/BlockEditor/blocks/roundup-edit.ts`
- Test: `src/admin/components/BlockEditor/blocks/__tests__/roundup-edit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  parseRoundup, serializeRoundup, addItem, removeItem, moveItem,
  updateItemField, setShowStats, toggleBadge, type RoundupEditModel,
} from '../roundup-edit';
import { RoundupJsonInputSchema } from '@modules/articles/validation/roundup-json.schema';

const item = (id: number, title: string) => ({
  source_type: 'internal_recipe' as const, article_id: id, slug: `r-${id}`, title,
});

describe('roundup-edit', () => {
  it('parses an empty/blank payload to an empty model', () => {
    expect(parseRoundup('')).toEqual({ items: [] });
    expect(parseRoundup(undefined)).toEqual({ items: [] });
    expect(parseRoundup({ items: [], list_type: 'ItemList' })).toEqual({ items: [] });
  });

  it('parses items + presentation from a roundup_json string', () => {
    const model = parseRoundup(JSON.stringify({
      items: [item(1, 'A')], list_type: 'ItemList',
      group_title: 'Best', show_stats: false, visible_badges: ['rating'],
    }));
    expect(model.items).toHaveLength(1);
    expect(model.group_title).toBe('Best');
    expect(model.show_stats).toBe(false);
    expect(model.visible_badges).toEqual(['rating']);
  });

  it('serializes a model to contract-valid roundup_json with positions', () => {
    const model: RoundupEditModel = { items: [item(1, 'A'), item(2, 'B')] };
    const json = serializeRoundup(model);
    const parsed = JSON.parse(json);
    expect(parsed.list_type).toBe('ItemList');
    expect(parsed.items.map((i: any) => i.position)).toEqual([1, 2]);
    expect(RoundupJsonInputSchema.safeParse(json).success).toBe(true);
  });

  it('addItem appends and is idempotent on article_id', () => {
    const m1 = addItem({ items: [] }, item(1, 'A'));
    const m2 = addItem(m1, item(1, 'A'));
    expect(m2.items).toHaveLength(1);
  });

  it('removeItem drops by article_id', () => {
    const m = removeItem({ items: [item(1, 'A'), item(2, 'B')] }, 1);
    expect(m.items.map((i) => i.article_id)).toEqual([2]);
  });

  it('moveItem reorders within bounds and no-ops out of bounds', () => {
    const base = { items: [item(1, 'A'), item(2, 'B')] };
    expect(moveItem(base, 0, 1).items.map((i) => i.article_id)).toEqual([2, 1]);
    expect(moveItem(base, 0, -1).items.map((i) => i.article_id)).toEqual([1, 2]);
  });

  it('updateItemField edits one field on one item', () => {
    const m = updateItemField({ items: [item(1, 'A')] }, 0, 'note', 'tasty');
    expect((m.items[0] as any).note).toBe('tasty');
  });

  it('setShowStats and toggleBadge update presentation', () => {
    expect(setShowStats({ items: [] }, false).show_stats).toBe(false);
    const toggled = toggleBadge({ items: [], visible_badges: ['rating'] }, 'total_time');
    expect(toggled.visible_badges).toContain('total_time');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/admin/components/BlockEditor/blocks/__tests__/roundup-edit.test.ts`
Expected: FAIL — `Cannot find module '../roundup-edit'`.

- [ ] **Step 3: Write the implementation**

```ts
/**
 * Pure model + edit helpers for roundup_json, used by RoundupListSettings.
 *
 * roundup_json is the single source of truth (recipe pattern). These functions
 * parse it into an editable model, apply one edit, and serialize back to a
 * contract-valid roundup_json string. No React, no block props — unit-testable.
 */
import type { RoundupItemRecipeSnapshot } from '@modules/articles/types/roundups.types';

export type RoundupEditItem = {
  source_type: 'internal_recipe' | 'external_recipe';
  article_id?: string | number;
  slug?: string;
  external_url?: string;
  title: string;
  subtitle?: string;
  description?: string;
  note?: string;
  image?: unknown;
  recipe?: RoundupItemRecipeSnapshot | null;
  rating?: Record<string, unknown> | null;
  author?: Record<string, unknown> | null;
  category?: Record<string, unknown> | null;
  tags?: unknown[];
};

export interface RoundupEditModel {
  items: RoundupEditItem[];
  group_title?: string;
  group_description?: string;
  show_stats?: boolean;
  visible_badges?: string[];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function parseRoundup(value: unknown): RoundupEditModel {
  const obj = asObject(value);
  const items = Array.isArray(obj.items) ? (obj.items as RoundupEditItem[]) : [];
  const model: RoundupEditModel = { items };
  if (typeof obj.group_title === 'string' && obj.group_title.trim()) model.group_title = obj.group_title;
  if (typeof obj.group_description === 'string' && obj.group_description.trim()) model.group_description = obj.group_description;
  if (typeof obj.show_stats === 'boolean') model.show_stats = obj.show_stats;
  if (Array.isArray(obj.visible_badges)) {
    model.visible_badges = obj.visible_badges.filter((k): k is string => typeof k === 'string');
  }
  return model;
}

export function serializeRoundup(model: RoundupEditModel): string {
  const payload: Record<string, unknown> = {
    list_type: 'ItemList',
    items: model.items.map((it, index) => ({ ...it, position: index + 1 })),
  };
  if (model.group_title && model.group_title.trim()) payload.group_title = model.group_title.trim();
  if (model.group_description && model.group_description.trim()) payload.group_description = model.group_description.trim();
  if (typeof model.show_stats === 'boolean') payload.show_stats = model.show_stats;
  if (model.visible_badges && model.visible_badges.length) payload.visible_badges = model.visible_badges;
  return JSON.stringify(payload, null, 2);
}

export function addItem(model: RoundupEditModel, next: RoundupEditItem): RoundupEditModel {
  if (next.article_id != null && model.items.some((i) => i.article_id === next.article_id)) return model;
  return { ...model, items: [...model.items, next] };
}

export function removeItem(model: RoundupEditModel, articleId: string | number): RoundupEditModel {
  return { ...model, items: model.items.filter((i) => i.article_id !== articleId) };
}

export function moveItem(model: RoundupEditModel, index: number, direction: -1 | 1): RoundupEditModel {
  const target = index + direction;
  if (target < 0 || target >= model.items.length) return model;
  const items = [...model.items];
  const [moved] = items.splice(index, 1);
  items.splice(target, 0, moved);
  return { ...model, items };
}

export function updateItemField(
  model: RoundupEditModel,
  index: number,
  field: 'title' | 'subtitle' | 'note',
  value: string,
): RoundupEditModel {
  if (index < 0 || index >= model.items.length) return model;
  const items = [...model.items];
  items[index] = { ...items[index], [field]: value };
  return { ...model, items };
}

export function clearItems(model: RoundupEditModel): RoundupEditModel {
  return { ...model, items: [] };
}

export function setGroupTitle(model: RoundupEditModel, value: string): RoundupEditModel {
  return { ...model, group_title: value };
}

export function setGroupDescription(model: RoundupEditModel, value: string): RoundupEditModel {
  return { ...model, group_description: value };
}

export function setShowStats(model: RoundupEditModel, value: boolean): RoundupEditModel {
  return { ...model, show_stats: value };
}

export function toggleBadge(model: RoundupEditModel, key: string): RoundupEditModel {
  const current = model.visible_badges ?? [];
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  return { ...model, visible_badges: next };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/admin/components/BlockEditor/blocks/__tests__/roundup-edit.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/BlockEditor/blocks/roundup-edit.ts src/admin/components/BlockEditor/blocks/__tests__/roundup-edit.test.ts
git commit -m "feat(roundup): pure roundup_json edit model + helpers (TDD)"
```

---

## Task 2: Rewrite RoundupListSettings to write roundup_json

**Files:**
- Modify: `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx`

- [ ] **Step 1: Change the component props**

Replace the props type + signature:

```tsx
import {
  parseRoundup, serializeRoundup, addItem as addRoundupItem, removeItem as removeRoundupItem,
  moveItem as moveRoundupItem, updateItemField as updateRoundupItemField, clearItems,
  setGroupTitle, setGroupDescription, setShowStats, toggleBadge as toggleRoundupBadge,
  type RoundupEditItem,
} from '../../blocks/roundup-edit';

type RoundupListSettingsProps = {
  roundup: unknown;                       // roundup_json (string | object)
  onRoundupChange: (next: string) => void;
};

function RoundupListSettings({ roundup, onRoundupChange }: RoundupListSettingsProps) {
  const model = useMemo(() => parseRoundup(roundup), [roundup]);
  const items = model.items as RoundupListItem[];
  const visibleBadges = model.visible_badges ?? DEFAULT_ROUNDUP_BADGES;
  const commit = (next: ReturnType<typeof parseRoundup>) => onRoundupChange(serializeRoundup(next));
  // ...rest of component
```

- [ ] **Step 2: Replace every persistence call**

Replace each `updateProps({...})` call with a `commit(...)` on the model. Mapping:

```tsx
// add a searched recipe
const addItem = (item: SearchResultItem) => {
  if (!item?.id) return;
  commit(addRoundupItem(model, buildItem(item) as RoundupEditItem));
};
// remove
const removeItem = (articleId: string | number) => commit(removeRoundupItem(model, articleId));
// reorder
const moveItem = (index: number, direction: -1 | 1) => commit(moveRoundupItem(model, index, direction));
// per-item title/subtitle/note
const updateItemField = (index: number, field: RoundupItemField, value: string) =>
  commit(updateRoundupItemField(model, index, field, value));
// clear all
onClick={() => commit(clearItems(model))}
// group title / description
onChange={(e) => commit(setGroupTitle(model, e.target.value))}
onChange={(e) => commit(setGroupDescription(model, e.target.value))}
// show stats
onChange={(e) => commit(setShowStats(model, e.target.checked))}
// badge toggle
const toggleBadge = (key: string) => commit(toggleRoundupBadge(model, key));
```

Replace reads of `selectedBlock.props.title` → `model.group_title || ''`,
`selectedBlock.props.description` → `model.group_description || ''`,
`selectedBlock.props.showStats !== false` → `model.show_stats !== false`.
Remove the `selectedBlock`/`updateProps` references and the now-unused
`parseJsonArray(selectedBlock.props.itemsJson)` memo.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors). If `buildItem` returns a type incompatible with `RoundupEditItem`, widen the cast at the `addItem` call (`buildItem(item) as RoundupEditItem`).

- [ ] **Step 4: Commit**

```bash
git add src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx
git commit -m "refactor(roundup): settings writes roundup_json directly via helpers"
```

---

## Task 3: Thread roundupData / onRoundupChange through the plumbing

**Files:**
- Modify: `.../block-settings/panels.tsx`
- Modify: `.../block-settings/BlockSettingsRouter.tsx`
- Modify: `.../components/BlockSettings.tsx`
- Modify: `src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx`

- [ ] **Step 1: panels.tsx**

Add to `BlockSettingsPanelProps`: `roundupData?: unknown;` and `onRoundupChange?: (next: string) => void;`.
Change the `roundupList` entry:

```tsx
roundupList: ({ roundupData, onRoundupChange }) => (
  <RoundupListSettings roundup={roundupData} onRoundupChange={onRoundupChange!} />
),
```

- [ ] **Step 2: BlockSettingsRouter.tsx**

Add `roundupData?: unknown;` and `onRoundupChange?: (next: string) => void;` to
`BlockSettingsRouterProps`, destructure them, and include them in the
`renderPanel({ ... })` call.

- [ ] **Step 3: BlockSettings.tsx**

Add `roundupData?: unknown;` and `onRoundupChange?: (next: string) => void;` to
`BlockSettingsProps`, destructure them, and pass them into `<BlockSettingsRouter>`.

- [ ] **Step 4: GutenbergEditorShell.tsx**

On the `<BlockSettings ...>` element add:

```tsx
roundupData={contentType === 'roundup' ? roundup_json : undefined}
onRoundupChange={contentType === 'roundup' ? (v: any) => setRoundupJson(v ?? '') : undefined}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/components/BlockEditor/components/block-settings/panels.tsx src/admin/components/BlockEditor/components/block-settings/BlockSettingsRouter.tsx src/admin/components/BlockEditor/components/BlockSettings.tsx src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx
git commit -m "feat(roundup): thread roundupData/onRoundupChange to the settings panel"
```

---

## Task 4: Remove the parallel buildRoundupJson path

**Files:**
- Modify: `.../hooks/editorStateManager.helpers.ts`
- Modify: `.../hooks/useEditorStateManager.ts`
- Modify: `.../index.tsx`

- [ ] **Step 1: editorStateManager.helpers.ts**

Remove the `import { buildRoundupJson } from '../blocks/roundup-serialization';`,
the `lastRoundupRef` field from `SerializeArgs`, and the entire
`if (contentType === 'roundup' && onRoundupChange) { ... }` block in
`emitSerializedContent`. Remove `onRoundupChange` from `SerializeArgs`.

- [ ] **Step 2: useEditorStateManager.ts**

Remove `onRoundupChange` from `EditorStateManagerProps`, the `onRoundupChangeRef`
and `lastRoundupRef` refs, the effect syncing `onRoundupChangeRef`, and pass-through
to `emitSerializedContent`. Remove `lastRoundupRef` from the return value.

- [ ] **Step 3: index.tsx**

Remove `onRoundupChange` from the `BlockEditorProps` destructure and from the
`useEditorStateManager({ ... })` call. Keep `roundup_json` in `hydrationContext`.

- [ ] **Step 4: Verify build + tests**

Run: `pnpm typecheck && pnpm exec vitest run src/admin/components/BlockEditor`
Expected: PASS. Fix any dangling references the compiler reports.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/BlockEditor/hooks/editorStateManager.helpers.ts src/admin/components/BlockEditor/hooks/useEditorStateManager.ts src/admin/components/BlockEditor/index.tsx
git commit -m "refactor(roundup): remove parallel buildRoundupJson serialization path"
```

---

## Task 5: Delete dead roundup-serialization module

**Files:**
- Delete: `src/admin/components/BlockEditor/blocks/roundup-serialization.ts`
- Delete: `src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts`

- [ ] **Step 1: Confirm no remaining references**

Run: `rg -n "roundup-serialization|buildRoundupJson|buildRoundupItems" src`
Expected: no matches. If any remain, resolve them before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/admin/components/BlockEditor/blocks/roundup-serialization.ts src/admin/components/BlockEditor/blocks/__tests__/roundup-serialization.test.ts
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(roundup): delete dead roundup-serialization module"
```

---

## Task 6: Full verification + manual E2E

**Files:** none

- [ ] **Step 1: Full automated suite**

Run: `pnpm test && pnpm check:boundaries && pnpm typecheck`
Expected: all green.

- [ ] **Step 2: Manual E2E (save→reload) — record results**

Start the app (`pnpm dev`), then in the admin roundup editor:
1. Add several recipes via sidebar search; reorder; edit a title/subtitle/note; toggle badges; toggle show-stats.
2. Confirm the in-canvas roundup block updates live as you edit the sidebar (phase-2 re-seed).
3. Save, reload the editor → all items + settings preserved.
4. Open public `/roundups/<slug>` → list renders correctly with badges.
5. Confirm no console errors and no `roundup_json` drift.

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch (merge to main or open a PR).

---

## Self-Review

- **Spec coverage:** plumbing (Tasks 2-3) ✓, parallel-path removal (Tasks 4-5) ✓, block/adapter/hydration untouched (by omission) ✓, testing via pure helpers + schema conformance (Task 1) ✓, manual E2E (Task 6) ✓.
- **Placeholder scan:** none — all code shown; component edits specify exact replacements.
- **Type consistency:** `RoundupEditModel`/`RoundupEditItem`, `parseRoundup`/`serializeRoundup`, and the `onRoundupChange: (next: string) => void` signature are consistent across Task 1 (definition) and Tasks 2-3 (consumers). `panels.tsx` uses `onRoundupChange!` because the panel is only rendered for roundup content where the prop is provided.
- **Open risk:** if the prior 2026-06-10 plan already removed/renamed any of these symbols, reconcile in Task 0 before proceeding.
