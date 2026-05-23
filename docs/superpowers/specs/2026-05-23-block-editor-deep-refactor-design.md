# BlockEditor Deep Refactor Design

## Goal

Refactor the admin BlockEditor in phases so the editor shell, custom blocks, adapters, settings, and persistence boundaries are easier to reason about and test without changing the stored `content_json` contract.

## Non-Goals

- Do not change canonical `content_json` storage shapes.
- Do not edit docs contracts as part of this refactor.
- Do not redesign the admin editor UI.
- Do not move article-owned payloads into marker blocks.
- Do not run `pnpm build` unless explicitly approved.

## Current Constraints

- `docs/CONTENT_BLOCKS_CONTRACT.md` is the contract source for body blocks.
- `src/modules/content-blocks` owns canonical types, normalization, validation, and extraction.
- `src/admin/components/BlockEditor` owns the React/BlockNote editing experience.
- The worktree already contains unrelated admin and BlockEditor changes, so implementation must stage only intended files.
- Browser validation requires explicit permission.

## Target Architecture

`src/modules/content-blocks` remains the canonical storage layer. It defines `ContentDocument`, canonical block types, normalization, strict validation, and extraction helpers.

`src/admin/components/BlockEditor/utils/conversion.ts` becomes the stable facade between storage and editor state. It converts canonical `content_json` into BlockNote-compatible editor blocks and converts editor blocks back into canonical `ContentDocument`.

`src/admin/components/BlockEditor/blocks/adapters` remains the per-block conversion layer. Each adapter owns one canonical block type and maps it to the editor-only block name and props.

`src/admin/components/BlockEditor/blocks` becomes a real block domain layer, not just UI components. Custom blocks are split by responsibility when they are large enough to justify it:

- `*.types.ts` for local UI/editor prop types.
- `*.defaults.ts` for default props and normalizers.
- `*.view.tsx` for the inline BlockNote rendered component.
- `*.controls.tsx` for reusable inline controls when a block has complex editing controls.

`src/admin/components/BlockEditor/index.tsx` becomes a thin shell. It should compose providers, mount BlockNote, wire top-level callbacks, and delegate all editor behavior to hooks.

`src/admin/components/BlockEditor/components/BlockSettings.tsx` becomes a settings router. It should select the correct settings panel for the selected block instead of containing most settings UI inline.

## Data Flow

Input data enters the editor as canonical `content_json` plus source JSON context such as `recipeJson`, `roundupJson`, `faqsJson`, and `imagesData`.

Hydration converts canonical storage blocks into editor blocks. Marker blocks hydrate with source JSON for editor display only.

Editing custom blocks may update local editor props or external source JSON through explicit callbacks:

- `onRecipeChange`
- `onRoundupChange`
- `onFaqsChange`
- `onImagesChange`

Saving converts editor blocks back to canonical `ContentDocument`. The saved payload must use snake_case contract names.

Marker blocks must persist position only:

- `mainRecipe` editor block saves as `main_recipe`.
- `roundupList` editor block saves as `main_roundup`.
- `faqSection` editor block saves as `main_faq`.

The saved marker blocks must not contain recipe payloads, roundup item payloads, FAQ arrays, image snapshots, or editor-only props.

## Custom Block Scope

The refactor includes all custom blocks and their interactions with the editor shell:

- `mainRecipe`
- `roundupList`
- `faqSection`
- `customImage`
- `beforeAfter`
- `relatedContent`
- `table`
- `video`
- `tipBox`
- `divider`

For each custom block, implementation should make the following boundaries explicit:

- How the block is inserted.
- Which editor props it owns.
- Which external source JSON it reads or writes.
- Which canonical block shape it saves.
- Which settings panel edits it.
- Which tests prove round-trip behavior.

## Phase 1: Contract And Tests

Harden the adapter and conversion boundary before moving UI code. This phase should add or expand Vitest coverage for:

- canonical `content_json` to editor blocks
- editor blocks to canonical `ContentDocument`
- marker blocks saving position only
- custom block defaults and prop normalization
- duplicate block id repair
- unknown or legacy editor names normalizing safely
- image refs saving without resolved media URLs or R2 keys

This phase may include minimal adapter or normalizer fixes required to make tests pass.

## Phase 2: Shell Extraction

Extract orchestration from `BlockEditor/index.tsx` into focused hooks:

- `useBlockEditorHydration`
- `useBlockEditorPersistence`
- `useBlockEditorSelection`
- `useBlockEditorToolbars`
- `useBlockEditorSourceData`

The shell should not know details of custom block payloads beyond passing source data and callbacks through providers.

## Phase 3: Custom Blocks And Settings

Split large custom block files where size or mixed responsibilities make future changes risky. Prioritize:

- `FAQSectionBlock.tsx`
- `ImageBlock.tsx`
- `TableBlock.tsx`
- `BeforeAfterBlock.tsx`
- `RelatedContentBlock.tsx`
- `TipBoxBlock.tsx`

Split `BlockSettings.tsx` into block-family panels and keep it as a router. Settings panels should share small helpers for prop updates, numeric clamps, JSON parsing, and media selection.

## Phase 4: UX Cleanup

Small UX improvements are allowed only when tied directly to the refactor. Examples:

- clearer grouping inside settings panels
- safer disabled states for unavailable singleton blocks
- more predictable selection after inserting a custom block
- less noisy inline controls in large custom blocks

Avoid broad visual restyling, new layouts, or admin-wide theme changes.

## Validation Strategy

Start with targeted tests:

```powershell
rtk pnpm vitest run src/admin/components/BlockEditor/blocks/adapters/__tests__/roundtrip.test.ts
rtk pnpm vitest run src/modules/content-blocks/normalize/__tests__/normalize-content-document.test.ts
```

Then run a TypeScript compile gate:

```powershell
rtk pnpm exec tsc --noEmit --pretty false --ignoreDeprecations 6.0
```

Run broader tests only when the touched surface justifies it:

```powershell
rtk pnpm test
```

Do not run production build without explicit approval:

```powershell
rtk pnpm build
```

Browser QA is a separate approval step and should use the real admin editor route when available.

## Acceptance Criteria

- `content_json` output remains canonical and snake_case.
- Custom block payloads do not leak into marker blocks.
- `BlockEditor/index.tsx` is reduced to shell responsibilities.
- Large custom blocks have clear UI, defaults, type, adapter, and settings boundaries.
- `BlockSettings.tsx` routes to focused settings panels.
- Targeted adapter/conversion/normalization tests cover custom block round trips.
- Implementation can be staged in small commits without including unrelated dirty worktree changes.
