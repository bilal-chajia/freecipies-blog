# Block Editor Refactor Baseline

Date: 2026-03-26

## Current External Contract (`<BlockEditor />`)

### Inputs
- `value`: JSON string or object-array representation of `content_json` blocks.
- `onChange(serializedContentJson: string)`: callback with serialized content JSON.
- `contentType`: `article | recipe | roundup`.
- `isSidebarOpen`: layout hint for canvas width behavior.
- `onStructureUpdate({ items, activeBlockId })`: structure panel model.
- `onSelectedBlockChange(block | null)`: selected block callback.
- `recipe` / `onRecipeChange`: structured recipe source/callback.
- `roundup` / `onRoundupChange`: structured roundup source/callback.
- `faqs` / `onFaqsChange`: structured FAQ source/callback.
- `faqTitle` / `onFaqTitleChange`: FAQ section title source/callback.
- `onEditorReady(editor)`: editor instance callback.
- `context`: related-content context (`categorySlug`, `tagSlugs`, `currentSlug`).

### Outputs / side effects
- Emits serialized `content_json` through `onChange`.
- Emits structure tree rows to inserter via `onStructureUpdate`.
- Emits selected block snapshots via `onSelectedBlockChange`.
- Mutates structured JSON side channels through recipe/roundup/faq callbacks.

## Known Drift Before Refactor
- `roundupList` UI block behavior can drift because it is structural/UI-oriented while `content_json` remains canonical for article body blocks.
- FAQ sync behavior differs across editor pages (recipe wired, article/roundup paths inconsistent).
- Several editor orchestration concerns are merged in `BlockEditor/index.jsx` (selection sync, insert-handle, link toolbar, DnD pointer tracking, serialization).
- `BlockSettings.jsx` is monolithic and mixes block panel rendering with related-content querying and recipe metadata editing.

## Refactor Safety Goals
- Keep public `content_json` shape stable.
- Keep structured source-of-truth in `recipeJson`, `roundupJson`, `faqsJson`.
- Preserve existing import surfaces during migration.
- Add fixtures to validate conversion and sync behavior against representative content.
