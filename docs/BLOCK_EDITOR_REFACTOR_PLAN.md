# Block Editor — Architecture Review & Refactor Plan

> Status: proposal. Author: architecture review pass, 2026-06-01.
> Scope: `src/admin/components/BlockEditor/**`. This is a **new planning doc**, not a contract — it does not alter any `docs/*_CONTRACT.md`.

---

## 1. How it works today

```
content_json (ContentDocument v1)
        │  contentJsonToBlocks() ─ per-type Adapter.toEditor()
        ▼
   BlockNote document (custom + default block specs)
        │  Adapter.fromEditor() ─ blocksToContentJson()  [debounced 800ms]
        ▼
   onChange(serialized) → article form
```

Key pieces:
- **`schema.ts`** — registers custom block specs into a BlockNote schema (default `table` removed, custom `simpleTable` added).
- **`blocks/adapters/*` + `BlockAdapter.ts`** — global `Map<type, adapter>` for two-way `ContentBlock ⇄ AppBlock`. Tested in `roundtrip.test.ts`. **This part is good — keep it.**
- **`utils/conversion.ts`** — dispatches to adapters both ways; handles list grouping/expansion.
- **`hooks/useEditorStateManager.ts`** — content-change handler: structure tree, per-block validation, imperative DOM attribute sync, debounced serialization + roundup rebuild.
- **`hooks/useBlockSelection.ts`** — DOM-driven active-block tracking (7-priority cascade over `getSelection()`/`activeElement`).
- **`hooks/useBlockEditorHydration.ts`** — initial replaceBlocks + source-data prop patching.
- **`selection-context.tsx`** — React context blocks use for `isSelected`/`selectBlock`.
- **`source-data-context.tsx`** — feeds `recipeJson`/`faqsJson`/`imagesData`/`roundupJson` + `on*Change` into blocks.
- **`store/blockEditorStore.ts`** — zustand: editor ref, sidebar, activeBlockId, structure, block errors.
- **`components/block-settings/*` + `BlockSettingsRouter.tsx`** — per-type sidebar panels.

## 2. Cross-cutting architectural problems

### P1 — Block identity is smeared across ~7 files (highest leverage)
Adding/renaming one block requires edits in:
1. `schema.ts` (block spec)
2. `utils/conversion.ts` `EDITOR_TYPE_TO_CONTENT_TYPE`
3. `blocks/adapters/*` + `adapters/index.ts` registration
4. `components/block-settings/BlockSettingsRouter.tsx` type chain
5. `components/BlockSettings.tsx` `handledTypes` set
6. `utils/constants.ts` `CUSTOM_BLOCK_TYPES`
7. `useSlashMenu.ts`

Nothing enforces these agree. A missing entry fails silently (block falls back to paragraph, or gets no settings panel). **This is the root cause that the refactor targets.**

### P2 — Selection state lives in 4 places and desyncs
- local `useState(activeBlockId)` — `index.tsx:76`
- zustand `activeBlockId`/`selectedBlock` — `store/blockEditorStore.ts:60`
- React context `BlockSelectionProvider`
- DOM `data-selected` attributes (imperatively synced)

**Confirmed bug:** `index.tsx:171` passes the raw `setActiveBlockId` (local setState) into `BlockSelectionProvider`, **not** the store-syncing `handleSetActiveBlockId` (`index.tsx:83`). So when any custom block calls `selectBlock()`, local state + DOM update but **zustand `selectedBlock` is never updated** → the sidebar's block-settings target goes stale vs. what is visually selected.

### P3 — `lastEmittedValueRef` is two disconnected refs (echo guard is dead)
`index.tsx:73` creates the ref passed to hydration's echo guard (`useBlockEditorHydration.ts:87,120`). But `useEditorStateManager.ts:57-58` creates its **own** internal `lastEmittedValueRef`/`lastSerializedRef` and writes every emitted value there. The hydration guard therefore never observes what the editor emitted → an external `value` echo equal to our own output is not recognized as "ours," risking re-hydration / cursor resets / feedback loops. **These must be one shared ref.**

### P4 — Rules-of-Hooks violation
`index.tsx:157` early-returns `if (!editor) return null;`, then calls the `useBlockEditorInlineActions` hook at `:160`. A hook after a conditional return throws if `editor` ever transitions truthy→falsy. Latent but real.

### P5 — Imperative DOM fighting ProseMirror
`useEditorStateManager.ts:132-170` rewrites `data-block-root`/`data-custom-block` via `querySelectorAll` on every structural change; `useBlockSelection.ts` reads `window.getSelection()`/`document.activeElement` through a 7-branch cascade; a `document`-level capture handler kills all link clicks. This is the source of most selection edge-case bugs and is fragile to BlockNote internals.

### P6 — Dual source of truth for source-backed blocks
FAQ, Recipe, Image, BeforeAfter store data **both** in block props **and** in source-data JSON (`faqsJson`, `recipeJson`, `imagesData`). Render functions implement ad-hoc precedence ("prefer source if non-empty, else props"). Two writers, two readers, equality-guarded effects pushing opposite directions → oscillation risk and confusing precedence (see per-block notes P6a/P6b).

### P7 — `any` everywhere defeats the typed schema
`editor: any` in the store; `mountedEditor as any` at every hook call site; `as any` throughout conversion. The project "no `any`" rule is effectively waived in the editor, and the well-defined `AppEditor` type goes unused.

### P8 — Logic duplication
Roundup serialization is reimplemented in `useEditorStateManager.ts:194-244` (snake/camel fallback mapping) instead of in `RoundupListAdapter`. `parseImagesData`/`upsertContentImageSlot` are copy-pasted in `ImageBlock.tsx` and `BeforeAfterBlock.tsx`.

---

## 3. Per-block audit

Every custom block is `content:'none'` (except Alert `inline`), uses `BlockWrapper` + `BlockToolbar` + `useBlockActionPrimitives` + `useBlockDragHandle` + context `useBlockSelection`. That repeated preamble (~30 lines/block) is extraction-ready (see PR7).

| Block | Type id | Store | Notes / issues |
|---|---|---|---|
| Alert | `alert` | props (`inline` content) | Attaches a raw `paste` listener to the content DOM node via `__pasteHandlerAttached` flag and reaches into `editor._tiptapEditor.view` (private API). Subtitle parses `title.split('|')[1]` — crashes-safe but brittle; title input is uncontrolled (`defaultValue`) so external updates don't reflect. |
| Video | `video` | props | Clean. `extractVideoId` only supports YouTube/Vimeo; validation in state-manager duplicates this knowledge. Good candidate for the simplest "reference block." |
| Divider | `divider` | props | Cleanest block. Reference template for the new authoring kit. |
| Image | `customImage` | props **+ imagesData** (P6a) | Effect at `:251-275` writes `imagesData` from props while hydration writes props from `imagesData` → opposing writers. `parseImagesData`/`upsert` duplicated. Two MediaDialog instances rendered (placeholder + display branches). Heavy (535 lines). |
| FAQ | `faqSection` | props.itemsJson **+ faqsJson** (P6b) | Precedence: uses `faqsJson` if `items.length>0`, else falls back to `block.props.itemsJson` — so an intentionally-emptied source can silently resurrect stale prop items. DnD sortable ids are `faq-item-{i}` **without blockId** → two FAQ blocks on one page share ids (cross-block drag collision). |
| Main Recipe | `mainRecipe` | props.recipeJson **+ recipeJson** | Prefers source `recipeJson` over props; props copy is effectively dead but still serialized by adapter. Delegates to `RecipeBuilder` (outside BlockEditor tree). |
| Roundup List | `roundupList` | props.itemsJson | No in-block editing (sidebar-only). State-manager re-derives roundup payload from props (P8). Read-only render is fine. |
| Related Content | `relatedContent` | props (4 JSON lists) | Read-only preview; editing in sidebar. Stores `recipesJson`/`articlesJson`/`roundupsJson`/`itemsJson` separately — 4 parallel lists to keep consistent. |
| Before/After | `beforeAfter` | props **+ imagesData** | Same dual-write as Image; `parseImagesData`/`upsert` duplicated again. `imageRef` fallback `${slot}-image-${item.id||block.id}` can collide if same media used in both slots. |
| Table | `simpleTable` | props (headersJson/rowsJson) | **WIP.** `useTableDraft` uses **module-level `Map`s keyed by `block.id`** (`draftMap`, `colKeysMap`, `rowKeysMap`, `lastCommittedPropsMap`) that are **never deleted** → memory leak + stale state across documents that reuse ids (default ids like `init-0`, or duplicate ids across articles). `colKeys`/`rowKeys` are mutated **during render** (`:87-106, 235, 258…`) — render-phase side effects. `commitDraft` calls `editor.updateBlock(block.id, { props })` **without `type`** (`:185`) — contradicts the `BlockSettings.tsx:46` rule that `content:'none'` blocks must preserve `type` or risk being replaced. |

---

## 4. Refactor plan → registry-driven editor

Throughline: **one definition per block, one selection source of truth, blocks become pure(r).** Incremental; each PR is independently shippable and keeps `roundtrip.test.ts` green.

### PR1 — Unified Block Registry (foundation, no behavior change)
Create `blocks/registry.ts`. Each block exports a single `BlockDefinition`:
```ts
interface BlockDefinition {
  editorType: string;          // 'customImage'
  contentType: string;         // 'image'
  spec: BlockSpec;             // createReactBlockSpec result
  adapter: BlockAdapter;
  SettingsPanel?: ComponentType<BlockSettingsPanelProps>;
  slashMenu?: { title: string; group: string; icon: LucideIcon; aliases?: string[] };
  isCustom: boolean;           // drives CUSTOM_BLOCK_TYPES
  label: string;
  icon: LucideIcon;
}
```
Derive from the registry (delete the 7 hand-maintained lists in P1): `schema` blockSpecs, `EDITOR_TYPE_TO_CONTENT_TYPE`, adapter registration, `CUSTOM_BLOCK_TYPES`, `handledTypes`, slash-menu items. Add a startup assertion that every registered editorType has spec+adapter. **Adding a block becomes: one file + one registry entry.**

### PR2 — Settings router from registry
Replace the if-chain in `BlockSettingsRouter` and the `handledTypes` set with `registry.get(type)?.SettingsPanel`. Co-locate each settings panel with its block file.

### PR3 — Single selection source of truth
Make zustand the sole owner of `activeBlockId`/`selectedBlock`. Delete the local `useState` in `index.tsx`; have `BlockSelectionProvider` read/write the store (**fixes P2**). Collapse `data-selected` syncing into one effect driven by store state. Keep the DOM-event handlers only as *input* that dispatches to the store.

### PR4 — Fix the value round-trip
Hoist `lastEmittedValueRef`/`lastSerializedRef` to one owner (store or `index.tsx`) and pass the **same** refs into both hydration and the state manager (**fixes P3**). Add a regression test: emit → parent echoes value back → assert no re-hydration / no cursor reset.

### PR5 — Hooks & typing hygiene
Move `useBlockEditorInlineActions` above the early return (**fixes P4**). Type editor params as `AppEditor` through hook signatures; remove the `as any` cluster (**P7**). Move roundup serialization into `RoundupListAdapter` (**P8**).

### PR6 — Tame imperative DOM
Emit `data-block-root`/`data-custom-block`/`data-selected` from block render output (BlockNote `domAttributes` / `BlockWrapper`) instead of post-hoc `querySelectorAll` (**P5**). Memoize/short-circuit the structure+validation pass on unchanged structure.

### PR7 — Block authoring kit
Extract `useCustomBlock(block, editor)` bundling the repeated selection + drag + move/remove + source-data wiring every block duplicates. Provide a `<CustomBlockShell>` wrapper. New blocks become thin render + registry entry. Migrate Divider/Video first (simplest), then the rest.

### PR8 — Source-of-truth consolidation (P6) + Table cleanup
- Decide, per source-backed block, a **single** writer. Recommended: source-data JSON is canonical; block props hold only an immutable `ref`/id, never a duplicated copy. Remove the opposing effects in Image/BeforeAfter; remove FAQ/Recipe prop fallbacks.
- Table: move `draftMap`/key maps off module scope into a ref keyed by block instance (or `editor.getBlock` round-trips); add cleanup on unmount; stop mutating `colKeys`/`rowKeys` during render; pass `type:'simpleTable'` in `commitDraft`'s `updateBlock`; namespace FAQ/table sortable ids with `blockId`.

**Ordering rationale:** PR1–2 are pure structure (safe, unlock everything). PR3–4 fix the confirmed bugs once the registry makes wiring visible. PR5–8 pay down `any`/DOM/duplication/dual-store debt, hardest last.

---

## 5. Quick wins (can land before/independently of the big refactor)
- **P2 fix** (1 line): pass `handleSetActiveBlockId` to `BlockSelectionProvider` at `index.tsx:171`.
- **P4 fix**: relocate `useBlockEditorInlineActions` above the `if (!editor) return null`.
- **Table id maps**: add `delete`-on-unmount in `useTableDraft` to stop the leak.
- **FAQ/table sortable ids**: prefix with `block.id`.
- **`commitDraft` type**: add `type:'simpleTable'` to the `updateBlock` call.
