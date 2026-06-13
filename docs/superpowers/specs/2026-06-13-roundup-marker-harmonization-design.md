# Roundup marker harmonization — design spec

> **Date:** 2026-06-13
> **Status:** approved design, ready for implementation plan
> **Scope item:** #8 from the CMS pipeline review (harmonize the marker/sidecar patterns)

This spec is self-contained: a fresh session should execute it without prior
conversation context.

## Background

The CMS stores three "source-hydrated" block types as **position markers** in
`content_json`, their real data in dedicated sidecar JSON columns. The three use
divergent patterns; roundup is the fragile outlier (historical data-loss P0s).

| Block | content_json | Real data | Sidecar write path |
| --- | --- | --- | --- |
| recipe (`mainRecipe`→`main_recipe`) | bare marker | `recipe_json` | **direct: sidebar → `onRecipeChange`** |
| roundup (`roundupList`→`main_roundup`) | bare marker | `roundup_json` | **derived from block props via parallel `buildRoundupJson`** |
| image (`customImage`→`image`) | `image_ref` | `images_json.content_images` | dual-write in-block |

**Decision (taken):** harmonize **roundup only**, onto the **recipe pattern**,
keeping the editing UI in place (the existing sidebar `RoundupListSettings`).
Image is out of scope (its pattern fits dedup/inline needs); recipe is the model.

## Problem: roundup's source-of-truth is inverted

Current roundup flow:
- `RoundupListSettings.tsx` edits via `updateProps({ itemsJson, title, ... })` →
  writes **BlockNote block props**.
- `RoundupListBlock.tsx` renders from `block.props.itemsJson` (display only).
- `RoundupListAdapter.toEditor` seeds props from `context.roundup_json`;
  `fromEditor` returns the bare `main_roundup` marker.
- `useEditorStateManager` → `editorStateManager.helpers.ts` `emitSerializedContent`
  → `buildRoundupJson(flatBlocks)` reads `roundupList` block props each change and
  emits `roundup_json` via `onRoundupChange` — a **parallel serialization path**.

So **block props are the live source of truth** and `roundup_json` is a derived
output synced on a second path (`lastRoundupRef`). Props and `roundup_json` can
drift; `extractRawItems` silently coerces malformed `itemsJson` to `[]`. This is
the inverse of recipe, where `recipe_json` is the single source of truth written
directly by the sidebar.

## Recipe is the template (existing, working chain)

```
GutenbergEditorShell (recipe_json state)
  → <BlockSettings recipeData onRecipeChange>
    → BlockSettingsRouter(recipeData, onRecipeChange)
      → panels.mainRecipe → <RecipeSettingsSidebar recipe={recipeData} setRecipe={onRecipeChange}>
RecipeBlock  <— props seeded from recipe_json by MainRecipeAdapter.toEditor,
               kept fresh by phase-2 hydration (SOURCE_HYDRATED_EDITOR_TYPES)
```

The settings panel renders **outside** the block-editor `BlockEditorSourceDataProvider`
(it is a sibling of the canvas in `GutenbergEditorLayout`), so recipe threads its
sidecar writer through **component props**, not the source-data context. Roundup
must do the same.

## Target architecture

Make `roundup_json` the single source of truth, written directly by
`RoundupListSettings` through the same props plumbing recipe uses. The roundup
block stays a display mirror, re-seeded from `roundup_json` by the EXISTING adapter
+ phase-2 hydration. Only the reverse derivation (`buildRoundupJson`) is removed.

```
GutenbergEditorShell (roundup_json state — already exists)
  → <BlockSettings roundupData onRoundupChange>          (NEW props)
    → BlockSettingsRouter(roundupData, onRoundupChange)  (NEW props)
      → panels.roundupList → <RoundupListSettings roundup onRoundupChange>  (CHANGED)
RoundupListBlock  <— props seeded from roundup_json (UNCHANGED — adapter + phase-2)
```

## Concrete changes

**A. Add the recipe-style plumbing for roundup**

1. `src/admin/features/articles/pages/shared/GutenbergEditorShell.tsx`
   - Remove `onRoundupChange` from the `blockEditorProps` passed to the canvas
     (the editor no longer emits `roundup_json`). **Keep** `roundup_json` in
     `blockEditorProps` (still needed for hydration/display).
   - On `<BlockSettings>` add:
     `roundupData={contentType === 'roundup' ? roundup_json : undefined}` and
     `onRoundupChange={contentType === 'roundup' ? (v: any) => setRoundupJson(v ?? '') : undefined}`.
2. `src/admin/components/BlockEditor/components/BlockSettings.tsx` — add
   `roundupData?: any` and `onRoundupChange?: (v: any) => void` to `BlockSettingsProps`;
   forward both into `<BlockSettingsRouter>`.
3. `src/admin/components/BlockEditor/components/block-settings/BlockSettingsRouter.tsx`
   — add `roundupData?`, `onRoundupChange?` to the interface and pass them into the
   `renderPanel({ ... })` call.
4. `src/admin/components/BlockEditor/components/block-settings/panels.tsx` — add
   `roundupData?`, `onRoundupChange?` to `BlockSettingsPanelProps`; change the
   `roundupList` entry to
   `({ roundupData, onRoundupChange }) => <RoundupListSettings roundup={roundupData} onRoundupChange={onRoundupChange} />`.
5. `src/admin/components/BlockEditor/components/block-settings/RoundupListSettings.tsx`
   — change props to `{ roundup, onRoundupChange }`. Parse the current roundup
   object from `roundup` (string|object → `{ items, group_title, group_description,
   show_stats, visible_badges }`). Derive the list + presentation from it. Replace
   every `updateProps({...})` with: build the next roundup object, call
   `onRoundupChange(JSON.stringify(next))`. Keep search/`buildItem`/
   `buildRecipeSnapshot` unchanged — only the persistence target changes.

**B. Remove the parallel reverse path**

6. `src/admin/components/BlockEditor/hooks/useEditorStateManager.ts` — remove the
   `onRoundupChange` param, `lastRoundupRef`, and the roundup wiring.
7. `src/admin/components/BlockEditor/hooks/editorStateManager.helpers.ts` — remove
   the `contentType === 'roundup'` branch, the `buildRoundupJson` import, and
   `lastRoundupRef` from `SerializeArgs`.
8. `src/admin/components/BlockEditor/index.tsx` — remove `onRoundupChange` from the
   `BlockEditorProps` destructure/usage and from the `useEditorStateManager` call.
   **Keep** `roundup_json` in `hydrationContext`.
9. `src/admin/components/BlockEditor/blocks/roundup-serialization.ts` and
   `blocks/__tests__/roundup-serialization.test.ts` — remove if `buildRoundupJson`/
   `buildRoundupItems` are unused after step 7 (grep first).

**C. Unchanged (already correct — do NOT touch)**

- `RoundupListBlock.tsx` — reads `block.props` (seeded from `roundup_json` by the
  adapter + phase-2 hydration), exactly like the recipe block.
- `RoundupListAdapter.ts` — `toEditor` still seeds props from `context.roundup_json`;
  `fromEditor` returns the `main_roundup` marker.
- `useBlockEditorHydration.ts` — keep `roundupList` in `SOURCE_HYDRATED_EDITOR_TYPES`
  so phase-2 re-seeds the block props after the sidebar writes `roundup_json`.

> Why the block is re-seeded even while selected: when editing in the sidebar the
> focused element is the sidebar input (outside the block DOM), so phase-2's
> active-block skip guard does not apply. Recipe relies on the same behavior.

## Testing

- Keep the existing round-trip safety net green
  (`src/admin/components/BlockEditor/utils/__tests__/conversion.roundtrip.test.ts`
  already covers the `main_roundup` marker).
- Add a unit test for the rewritten `RoundupListSettings` persistence helpers:
  an add/remove/reorder/edit-note sequence produces a `roundup_json` that passes
  `RoundupJsonInputSchema` (`src/modules/articles/validation/roundup-json.schema.ts`).
  Extract the pure "build next roundup object" logic so it is unit-testable without
  mounting React.
- Update/remove `roundup-serialization.test.ts` in lockstep with step 9.
- `pnpm test`, `pnpm check:boundaries`, `pnpm typecheck` must all stay green.

## Risk & verification

Refactors live editor components; unit tests cannot fully cover it. Mandatory
manual E2E (save→reload) after implementation:
- create/edit a roundup (add several recipes, reorder, edit notes, toggle badges),
- save, reload the editor → items + settings preserved,
- view public `/roundups/[slug]` → list renders correctly,
- confirm the block display updates live as the sidebar is edited (phase-2 re-seed).

## References

- Prior related plan to reconcile (check overlap/staleness):
  `docs/superpowers/plans/2026-06-10-blockeditor-roundup-cleanup.md`.
- Contract: `docs/ROUNDUP_JSON_CONTRACT.md`.
- Save-time guard already added: `src/modules/articles/validation/roundup-json.schema.ts`.
- Memory: `cms-pipeline-review` (workflow = AI→human review in editor; #8 deferred to its own session).
