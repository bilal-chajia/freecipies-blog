# BlockEditor Refactoring Plan

**Created:** 2026-03-22  
**Updated:** 2026-03-24 (TypeScript alignment + Full Analysis)  
**Status:** In Progress (~60% complete)  
**Priority:** High  
**Estimated Effort:** 1-2 days remaining

---

## Executive Summary

The BlockEditor component (`src/admin/components/BlockEditor/index.jsx`) is a 1,691-line file that handles schema definition, toolbar UI, structure panel, drag-and-drop logic, and the main editor component. This refactoring plan aims to improve maintainability, testability, and developer experience by breaking it into smaller, focused TypeScript modules.

**Key Discovery:** The Structure Panel is currently embedded in `BlockInserter.jsx` (619 lines) and needs to be extracted to `structure/StructurePanel.tsx`.

---

## Current State Analysis

### File Structure (Current - After Analysis)

```
src/admin/components/BlockEditor/
├── index.jsx                    # ❌ 1,691 lines - CRITICAL: Too large
├── BlockNoteViewWithPortal.jsx  # ⚠️ Needs .tsx conversion
├── selection-context.jsx        # ⚠️ Needs .tsx conversion
├── related-content-context.jsx  # ⚠️ Needs .tsx conversion
├── schema.ts                    # ✅ TypeScript (40 lines)
├── useSlashMenu.ts              # ✅ TypeScript (256 lines)
├── blocks/                      # ❌ 100% JavaScript (.jsx)
│   ├── index.js
│   ├── BeforeAfterBlock.jsx
│   ├── DividerBlock.jsx
│   ├── FAQSectionBlock.jsx
│   ├── ImageBlock.jsx
│   ├── MainRecipeBlock.jsx
│   ├── RecipeEmbedBlock.jsx
│   ├── RelatedContentBlock.jsx
│   ├── RoundupListBlock.jsx
│   ├── TableBlock.jsx
│   ├── TipBoxBlock.jsx
│   └── VideoBlock.jsx
├── components/                  # ⚠️ Mixed (.jsx/.tsx)
│   ├── EditorToolbar.tsx        # ✅ TypeScript (291 lines)
│   ├── BlockInserter.jsx        # ❌ 619 lines (Structure Panel embedded!)
│   ├── BlockWrapper.jsx
│   ├── BlockToolbar.jsx
│   ├── BlockSettings.jsx
│   ├── AISettings.jsx
│   ├── DocumentSettings.jsx
│   ├── SettingsSidebar.jsx
│   ├── BlockPlaceholder.jsx
│   ├── GutenbergEditorLayout.jsx
│   ├── GutenbergEditorMain.jsx
│   └── index.js
├── hooks/                       # ❌ EMPTY (should contain useBlockEditor, useStructureTree)
├── utils/                       # ✅ 100% TypeScript
│   ├── constants.ts             # ✅ (65 lines)
│   ├── types.ts                 # ✅
│   ├── inlineContent.ts         # ✅ (286 lines)
│   ├── blockHelpers.ts          # ✅ (166 lines)
│   ├── insert-block.ts          # ✅
│   └── conversion.ts            # ✅
├── styles/
└── structure/                   # ❌ MISSING (should contain StructurePanel, useStructureTree)
```

### Problems Identified (Updated)

| Issue | Severity | Impact |
|-------|----------|--------|
| **Monolithic file** (1,691 lines) | 🔴 Critical | Hard to navigate, maintain, test |
| **Structure Panel in BlockInserter.jsx** | 🔴 Critical | Confusion of responsibilities |
| **hooks/ directory is empty** | 🟡 Medium | Logic not centralized |
| **Mixed concerns** (schema + UI + logic) | 🔴 Critical | Tight coupling, difficult refactoring |
| **Inconsistent extensions** (.jsx/.tsx/.ts) | 🟡 Medium | Confusing for developers |
| **Missing hooks** (useBlockEditor, useStructureTree) | 🟡 Medium | Logic not centralized |
| **Blocks not typed** (100% .jsx) | 🟡 Medium | No type safety for custom blocks |
| **Context files not typed** | 🟢 Low | Missing TypeScript benefits |

### What's Working Well

- ✅ Utils are already in TypeScript (100%)
- ✅ Schema and useSlashMenu already in TypeScript
- ✅ Individual block implementations are well-modularized
- ✅ Context-based state sharing pattern is solid
- ✅ `BlockWrapper` and `BlockToolbar` are cleanly abstracted
- ✅ Drag-and-drop integration is well-implemented
- ✅ blockHelpers.ts has pure, testable functions
- ✅ Types defined: `FlattenedBlock`, `GroupedFlattenedBlock`
- ✅ Dynamic icons with `getBlockIcon()` and Lucide
- ✅ Smart grouping with `groupConsecutiveBlocks()`

---

## Refactoring Goals

### Primary Objectives

1. **Reduce main file size** from 1,691 lines to <200 lines
2. **Separate concerns** - schema, UI, logic, utilities
3. **Improve testability** - extract pure functions and hooks
4. **Maintain backward compatibility** - no breaking changes to API
5. **Preserve existing functionality** - all features must work identically
6. **Full TypeScript coverage** - convert all .jsx to .tsx
7. **Split BlockInserter** - Extract Structure Panel to dedicated component

### Success Metrics

- [ ] Main `index.tsx` < 200 lines
- [ ] `BlockInserter.tsx` < 150 lines (after Structure Panel extraction)
- [ ] Each module < 500 lines
- [ ] All files use `.ts` or `.tsx` extensions (no `.jsx`)
- [ ] All custom blocks still render correctly
- [ ] Drag-and-drop still functional
- [ ] Slash menu and toolbar both work
- [ ] Structure panel (outline) functional
- [ ] `pnpm build` passes with no errors
- [ ] Manual testing in admin panel passes
- [ ] No `any` types (or documented reasons)

---

## Proposed Architecture

### File Structure (Target)

```
src/admin/components/BlockEditor/
├── index.tsx                    # Main export (~150 lines) - Thin wrapper
├── BlockEditorMain.tsx          # Main component logic (~350 lines)
├── BlockNoteViewWithPortal.tsx  # BlockNote wrapper (converted)
├── schema.ts                    # BlockNote schema definition (~40 lines) ✅ DONE
├── useSlashMenu.ts              # Slash menu configuration (~250 lines) ✅ DONE
├── useBlockEditor.ts            # Custom hook for editor logic (~300 lines)
├── selection-context.tsx        # Block selection context (converted)
├── related-content-context.tsx  # Related content context (converted)
│
├── toolbar/
│   ├── EditorToolbar.tsx        # Toolbar UI component (~290 lines) ✅ DONE (needs move)
│   ├── useToolbarActions.ts     # Toolbar action hooks (~150 lines)
│   └── FAQLinkPopover.tsx       # Extracted FAQ link UI (~100 lines)
│
├── structure/                   # NEW DIRECTORY
│   ├── StructurePanel.tsx       # Outline/structure panel (~350 lines) - Extract from BlockInserter
│   └── useStructureTree.ts      # Tree building logic (~150 lines)
│
├── blocks/                      # Custom block definitions (convert to .tsx)
│   ├── index.ts                 # Barrel export (convert to .ts)
│   ├── MainRecipeBlock.tsx
│   ├── RelatedContentBlock.tsx
│   ├── FAQSectionBlock.tsx
│   ├── ImageBlock.tsx
│   ├── VideoBlock.tsx
│   ├── TipBoxBlock.tsx
│   ├── DividerBlock.tsx
│   ├── RecipeEmbedBlock.tsx
│   ├── RoundupListBlock.tsx
│   ├── TableBlock.tsx
│   └── BeforeAfterBlock.tsx
│
├── components/                  # Shared editor components
│   ├── BlockWrapper.tsx
│   ├── BlockToolbar.tsx
│   ├── BlockInserter.tsx        # ~150 lines (after Structure Panel extraction)
│   ├── BlockSettings.tsx
│   ├── AISettings.tsx
│   └── DocumentSettings.tsx
│
├── hooks/                       # Custom React hooks
│   ├── useBlockEditor.ts
│   └── useStructureTree.ts      # Could be in structure/ or hooks/
│
└── utils/
    ├── constants.ts             # Shared constants (~65 lines) ✅ DONE
    ├── types.ts                 # TypeScript type definitions ✅ DONE
    ├── inlineContent.ts         # Inline content parsing (~286 lines) ✅ DONE
    ├── blockHelpers.ts          # Block manipulation utilities (~166 lines) ✅ DONE
    ├── insert-block.ts          # Safe block insertion (~100 lines) ✅ DONE
    └── conversion.ts            # Content ↔ Blocks conversion (~200 lines) ✅ DONE
```

### File Extension Convention

| Type | Extension | Example |
|------|-----------|---------|
| React components | `.tsx` | `EditorToolbar.tsx` |
| Context providers | `.tsx` | `selection-context.tsx` |
| Hooks | `.ts` | `useBlockEditor.ts` |
| Utilities | `.ts` | `inlineContent.ts` |
| Types | `.ts` | `types.ts` |
| Barrel exports | `.ts` | `index.ts` |

---

## Module Responsibilities

### Core Modules

#### 1. `schema.ts`
**Purpose:** Define BlockNote schema with custom blocks

```typescript
// Responsibilities
- Import custom blocks from ./blocks/
- Create BlockNoteSchema with blockSpecs
- Export schema and AppSchema type for use in editor

// Dependencies
- @blocknote/core
- ./blocks/index.ts
```

#### 2. `useBlockEditor.ts`
**Purpose:** Centralize editor state and logic

```typescript
// Responsibilities
- Initialize BlockNote editor (useCreateBlockNote)
- Manage recipe/roundup/FAQ data contexts
- Handle content serialization/deserialization
- Expose editor API to components

// State Managed
- editor instance
- recipe data context
- roundup data context
- FAQ data context
- content sync logic
```

#### 3. `useSlashMenu.ts`
**Purpose:** Configure custom slash menu items

```typescript
// Responsibilities
- Define custom slash menu items with TypeScript types
- Handle item insertion logic
- Filter items based on content type
- Support keyboard navigation

// Exports
- getCustomSlashMenuItems(editor, query, options): SlashMenuItem[]
- SuggestionMenuController configuration
```

#### 4. `toolbar/EditorToolbar.tsx`
**Purpose:** Render the editor toolbar UI

```typescript
// Responsibilities
- Render toolbar buttons
- Handle button click events
- Manage dropdown menus
- Render FAQ link popover
- Structure panel toggle

// Dependencies
- useToolbarActions.ts
- FAQLinkPopover.tsx
- Lucide icons
- shadcn/ui components
```

#### 5. `toolbar/useToolbarActions.ts`
**Purpose:** Toolbar action logic

```typescript
// Responsibilities
- insertBlock(type, props)
- handleLinkCreation
- FAQ link apply/remove
- Selection tracking

// Exports
- useToolbarActions(editor, options)
```

#### 6. `structure/StructurePanel.tsx`
**Purpose:** Render document outline/structure

```typescript
// Responsibilities
- Display hierarchical block structure
- Handle block selection from outline
- Show block icons and labels
- Support expand/collapse
- Drag indicators

// Dependencies
- useStructureTree.ts
- Lucide icons
- shadcn/ui components
```

#### 7. `structure/useStructureTree.ts`
**Purpose:** Build tree structure from blocks

```typescript
// Responsibilities
- Flatten blocks with depth tracking
- Generate block labels
- Map block types to icons
- Handle nested structures

// Exports
- useStructureTree(editor): StructureTree
- FlattenedBlock type
```

#### 8. `utils/blockHelpers.ts`
**Purpose:** Block manipulation utilities

```typescript
// Responsibilities
- Safe block insertion
- Find root parent
- Move blocks up/down
- Remove blocks safely
- Group consecutive blocks

// Exports
- safeInsertBlock(editor, type, props)
- findRootParent(editor, block)
- moveBlock(editor, blockId, direction)
- flattenBlocks(blocks): FlattenedBlock[]
- groupConsecutiveBlocks(flatBlocks): GroupedFlattenedBlock[]
```

#### 9. `utils/inlineContent.ts`
**Purpose:** Inline content parsing utilities

```typescript
// Responsibilities
- Extract text from inline content
- Truncate inline content
- Serialize inline content
- Parse markdown links
- Parse inline styles

// Exports
- extractText(content): string
- truncateInlineContent(content, limit): string | InlineNode[]
- serializeInlineContent(nodes): string
- findMarkdownLinkRange(text, start, end): MarkdownLinkMatch | null
- parseInlineMarkdown(text): InlineNode[]
```

#### 10. `utils/constants.ts`
**Purpose:** Shared constants and mappings

```typescript
// Responsibilities
- MAX_STRUCTURE_LABEL
- CUSTOM_BLOCK_TYPES set
- BLOCK_TYPE_ICONS map

// Exports
- MAX_STRUCTURE_LABEL = 48
- CUSTOM_BLOCK_TYPES: Set<string>
- BLOCK_TYPE_ICONS: BlockIconMap
```

#### 11. `utils/types.ts`
**Purpose:** TypeScript type definitions

```typescript
// Responsibilities
- Define InlineNode type
- Define ParsedStyles type
- Define MarkdownLinkMatch type
- Define BlockIconMap type
- Define FlattenedBlock type

// Exports
- All types for BlockEditor utilities
```

#### 12. `utils/conversion.ts`
**Purpose:** Content ↔ Blocks conversion

```typescript
// Responsibilities
- Convert contentJson to BlockNote blocks
- Convert BlockNote blocks to contentJson
- Handle image variants
- Handle block metadata

// Exports
- contentJsonToBlocks(json): Block[]
- blocksToContentJson(blocks): ContentJson
```

---

## Implementation Phases

### Phase 1: Extract Utilities (Low Risk) ✅ COMPLETE

**Status:** Done - All utils are in TypeScript

**Completed:**
- ✅ `utils/constants.ts` - MAX_STRUCTURE_LABEL, CUSTOM_BLOCK_TYPES, BLOCK_TYPE_ICONS
- ✅ `utils/types.ts` - TypeScript type definitions
- ✅ `utils/inlineContent.ts` - extractText, truncateInlineContent, serializeInlineContent, findMarkdownLinkRange
- ✅ `utils/blockHelpers.ts` - flattenBlocks, getBlockLabel, getBlockIcon, groupConsecutiveBlocks
- ✅ `utils/insert-block.ts` - safeInsertBlock helper
- ✅ `utils/conversion.ts` - contentJson ↔ blocks conversion

**Testing:** Run `pnpm build`, verify editor still works

---

### Phase 2: Extract Schema (Low Risk) ✅ COMPLETE

**Status:** Done - schema.ts created

**Completed:**
- ✅ `schema.ts` - BlockNote schema with custom blocks
- ✅ Exports `schema` and `AppSchema` type
- ✅ Properly excludes default table block

**Testing:** Run `pnpm build`, verify custom blocks render

---

### Phase 3: Extract Slash Menu (Medium Risk) ✅ COMPLETE

**Status:** Done - useSlashMenu.ts created

**Completed:**
- ✅ `useSlashMenu.ts` - getCustomSlashMenuItems function with TypeScript types
- ✅ Proper typing for editor, query, and options
- ✅ Icon imports typed from lucide-react

**Testing:** Verify slash menu opens and inserts blocks correctly

---

### Phase 4: Extract Toolbar (Medium Risk) 🟡 PARTIAL

**Status:** EditorToolbar.tsx exists but needs extraction of FAQLinkPopover and useToolbarActions

**Completed:**
- ✅ `components/EditorToolbar.tsx` - Main toolbar component (291 lines)
- ⚠️ Needs move to `toolbar/EditorToolbar.tsx`

**Remaining:**
- ❌ Create `toolbar/` directory
- ❌ Extract `FAQLinkPopover.tsx` from EditorToolbar
- ❌ Create `useToolbarActions.ts` hook
- ❌ Move EditorToolbar to toolbar/

**Testing:** Verify all toolbar buttons work, FAQ link popover functions

---

### Phase 4.5: Extract Structure Panel (Medium Risk) ❌ NEW - HIGH PRIORITY

**Status:** Structure Panel is embedded in `BlockInserter.jsx` (619 lines)

**To Do:**
1. Create `structure/` directory
2. Extract structure panel JSX to `StructurePanel.tsx` (~350 lines)
   - SortableStructureItem component
   - Drag & Drop logic for reordering
   - Block selection from outline
   - Convert/delete block actions
3. Create `useStructureTree.ts` hook for tree logic (~150 lines)
   - Use existing `flattenBlocks()`, `groupConsecutiveBlocks()` from utils
   - Add `getBlockLabel()`, `getBlockIcon()` wrappers
   - Manage expanded/collapsed state
4. Update `BlockInserter.jsx` to only handle block insertion (~150 lines remaining)
5. Add proper TypeScript types for FlattenedBlock, GroupedFlattenedBlock

**Dependencies:** Uses utils/blockHelpers.ts (already exists)

**Testing:** Verify structure panel shows correct hierarchy, clicking selects blocks, drag & drop reorders

---

### Phase 5: Create Main Editor Hook (High Risk) ❌ NOT STARTED

**Status:** Hook doesn't exist yet

**To Do:**
1. Create `hooks/useBlockEditor.ts`
2. Move editor initialization logic from index.jsx
   - useCreateBlockNote call
   - Initial content setup
   - Editor exposure
3. Handle content sync and context providers
   - onChange handling
   - value updates
4. Manage structure items state
5. Export typed hook

**Testing:** Verify editor initializes, content syncs, contexts work

---

### Phase 6: Create Main Editor Component (High Risk) ❌ NOT STARTED

**Status:** Main component not extracted

**To Do:**
1. Create `BlockEditorMain.tsx` (~350 lines)
2. Use `useBlockEditor` hook
3. Render `BlockNoteViewWithPortal`, `EditorToolbar`, `StructurePanel`
4. Wrap with context providers
5. Update `index.tsx` to be a thin wrapper (~100 lines)
   - Only context providers and props passing

**Testing:** Full integration test - editor works end-to-end

---

### Phase 7: Convert Remaining Files to TypeScript (Medium Risk) ❌ NOT STARTED

**Status:** Mixed .jsx/.tsx files

**To Do:**
1. Rename `.jsx` → `.tsx` for React components:
   - `BlockNoteViewWithPortal.jsx` → `.tsx`
   - `selection-context.jsx` → `.tsx`
   - `related-content-context.jsx` → `.tsx`
   - All `blocks/*.jsx` → `blocks/*.tsx` (12 files)
   - All `components/*.jsx` → `components/*.tsx` (10 files)
2. Rename `index.jsx` → `index.tsx`
3. Rename `blocks/index.js` → `blocks/index.ts`
4. Add proper TypeScript types to all files
   - Block props types
   - Context value types
   - Event handler types
5. Remove `any` types where possible

**Testing:** `pnpm build` passes with no type errors

---

### Phase 8: Cleanup & Optimization (Low Risk) ❌ NOT STARTED

**Status:** Not started

**To Do:**
1. Remove unused imports from `index.tsx`
2. Remove duplicate functions
3. Add JSDoc comments to public APIs
4. Update barrel exports for cleaner imports
5. Verify all imports use correct paths
6. Run TypeScript strict mode check
7. Remove old files (if any backups exist)

**Testing:** Full regression testing

---

## Risk Mitigation

### High-Risk Areas

| Risk | Mitigation |
|------|------------|
| **Breaking editor functionality** | Test after each phase, small commits with `pnpm build` |
| **Context provider ordering** | Document provider hierarchy, test nested blocks |
| **Drag-and-drop breaking** | Verify dnd-kit integration after each phase |
| **State desync** | Add console logging during development |
| **TypeScript errors** | Fix types incrementally, avoid `any` when possible |
| **Performance regression** | Measure render times before/after |

### Rollback Strategy

If issues arise:
1. Revert to previous Git commit
2. Identify failing phase
3. Fix issue in isolation
4. Re-apply phases one at a time

---

## Testing Strategy

### Automated Tests (Future)

```typescript
// TODO: Add after refactoring
- utils/inlineContent.test.ts - Pure function tests
- utils/blockHelpers.test.ts - Mock editor tests
- useStructureTree.test.ts - Tree building tests
```

### Manual Testing Checklist

**Before starting:**
- [ ] Document current behavior (screenshots)
- [ ] Note all working features
- [ ] Run `pnpm build` and save output

**After each phase:**
- [ ] `pnpm build` passes
- [ ] Editor loads without errors
- [ ] Custom blocks render
- [ ] Drag-and-drop works
- [ ] Slash menu opens and inserts
- [ ] Toolbar buttons work
- [ ] Structure panel shows hierarchy
- [ ] Content saves correctly

**Final validation:**
- [ ] All article types work (article, recipe, roundup)
- [ ] FAQ sections work
- [ ] Related content blocks work
- [ ] Recipe embeds work
- [ ] Image blocks work
- [ ] Before/After blocks work
- [ ] Table blocks work
- [ ] TypeScript compiles with no errors

---

## Code Quality Guidelines

### Import Organization

```typescript
// 1. React & core libraries
import React, { useCallback, useEffect } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteSchema } from '@blocknote/core';

// 2. Project modules (absolute paths)
import { schema } from './schema';
import { useBlockEditor } from './useBlockEditor';

// 3. Local components
import { EditorToolbar } from './toolbar/EditorToolbar';
import { StructurePanel } from './structure/StructurePanel';

// 4. Styles
import './styles.css';
```

### Component Structure

```typescript
import type { FC } from 'react';

interface ComponentNameProps {
    prop1: Type1;
    prop2: Type2;
}

/**
 * ComponentName
 *
 * Brief description of purpose.
 *
 * @param {ComponentNameProps} props - Component props
 * @returns {JSX.Element} Component UI
 */
export const ComponentName: FC<ComponentNameProps> = ({ prop1, prop2 }) => {
    // 1. Hooks (useState, useEffect, custom hooks)
    // 2. Derived state (useMemo, useCallback)
    // 3. Event handlers
    // 4. Render
    return <div />;
};
```

### Function Size Limits

- **Max lines per function:** 50
- **Max lines per component:** 300
- **Max lines per file:** 500
- **Max nesting depth:** 3 levels

### TypeScript Rules

1. **No `any` types** - Use proper types or `unknown` with type guards
2. **Explicit return types** for public functions
3. **Interface over type** for object shapes
4. **Generics** for reusable utilities
5. **Strict null checks** enabled

---

## Migration Checklist

### Pre-Migration

- [x] Create backup branch
- [x] Document current file structure
- [x] Set up testing environment
- [x] Review all dependencies
- [x] Update plan for TypeScript

### During Migration

- [x] Complete each phase fully before moving on
- [x] Test after each phase
- [x] Commit after each phase
- [x] Update this document with learnings

### Post-Migration

- [ ] Run `pnpm build`
- [ ] Manual testing in admin panel
- [ ] Update documentation
- [ ] Remove old files
- [ ] Clean up imports
- [ ] Add JSDoc comments
- [ ] Verify TypeScript strict mode passes

---

## Future Improvements (Out of Scope)

These are **NOT** part of this refactoring but could be addressed later:

1. **State management library** - Consider Zustand for editor state
2. **Performance optimization** - Virtualize structure panel for large docs
3. **Unit tests** - Add Vitest tests for utilities
4. **E2E tests** - Playwright tests for editor interactions
5. **Accessibility audit** - Ensure keyboard navigation works
6. **Mobile optimization** - Touch-friendly toolbar
7. **Undo/redo improvements** - Better history management
8. **Collaborative editing** - Real-time multi-user support
9. **Plugin system** - Allow custom block registration
10. **i18n support** - Multi-language editor UI

---

## Appendix: Current File Metrics

### Current State (After Full Analysis - March 2026)

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `index.jsx` | ~1,691 | 🔴 Critical | Target: <200 lines |
| `schema.ts` | ~40 | ✅ Done | TypeScript |
| `useSlashMenu.ts` | ~256 | ✅ Done | TypeScript |
| `utils/constants.ts` | ~65 | ✅ Done | TypeScript |
| `utils/inlineContent.ts` | ~286 | ✅ Done | TypeScript |
| `utils/blockHelpers.ts` | ~166 | ✅ Done | TypeScript |
| `utils/conversion.ts` | ~200 | ✅ Done | TypeScript |
| `utils/insert-block.ts` | ~100 | ✅ Done | TypeScript |
| `utils/types.ts` | ~30 | ✅ Done | TypeScript |
| `components/EditorToolbar.tsx` | ~291 | ✅ Done | Needs move to toolbar/ |
| `components/BlockInserter.jsx` | ~619 | 🔴 Critical | Structure Panel embedded! |
| `blocks/*.jsx` | 12 files | ❌ Todo | Convert to .tsx |
| `components/*.jsx` | 10 files | ❌ Todo | Convert to .tsx |
| `BlockNoteViewWithPortal.jsx` | ~150 | ❌ Todo | Convert to .tsx |
| `selection-context.jsx` | ~50 | ❌ Todo | Convert to .tsx |
| `related-content-context.jsx` | ~30 | ❌ Todo | Convert to .tsx |

### Target File Metrics

| File | Target Lines | Status |
|------|--------------|--------|
| `index.tsx` | <150 | ❌ Todo |
| `BlockEditorMain.tsx` | <350 | ❌ Todo |
| `schema.ts` | <100 | ✅ Done |
| `useSlashMenu.ts` | <300 | ✅ Done |
| `useBlockEditor.ts` | <300 | ❌ Todo |
| `toolbar/EditorToolbar.tsx` | <350 | 🟡 Partial |
| `toolbar/useToolbarActions.ts` | <150 | ❌ Todo |
| `toolbar/FAQLinkPopover.tsx` | <100 | ❌ Todo |
| `structure/StructurePanel.tsx` | <350 | ❌ Todo |
| `structure/useStructureTree.ts` | <150 | ❌ Todo |
| `components/BlockInserter.tsx` | <150 | ❌ Todo (after split) |
| `utils/blockHelpers.ts` | <200 | ✅ Done |
| `utils/inlineContent.ts` | <300 | ✅ Done |
| `utils/constants.ts` | <100 | ✅ Done |
| **Total** | **~3,000** | **Same functionality, better organization** |

### Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Utils | ✅ Complete | 100% |
| Phase 2: Schema | ✅ Complete | 100% |
| Phase 3: Slash Menu | ✅ Complete | 100% |
| Phase 4: Toolbar | 🟡 Partial | 50% |
| **Phase 4.5: Structure Panel** | ❌ **Not Started** | **0%** |
| Phase 5: useBlockEditor | ❌ Not Started | 0% |
| Phase 6: BlockEditorMain | ❌ Not Started | 0% |
| Phase 7: TypeScript Conversion | ❌ Not Started | 0% |
| Phase 8: Cleanup | ❌ Not Started | 0% |
| **Overall** | **In Progress** | **~60%** |

### Key Discovery: BlockInserter.jsx Breakdown

The `BlockInserter.jsx` (619 lines) contains:

| Section | Lines | Should Move To |
|---------|-------|----------------|
| Imports | ~50 | - |
| SortableStructureItem | ~150 | `structure/StructurePanel.tsx` |
| Structure panel rendering | ~200 | `structure/StructurePanel.tsx` |
| Drag & Drop logic (reorder) | ~100 | `structure/useStructureTree.ts` |
| Block conversion actions | ~80 | `structure/StructurePanel.tsx` |
| Search & filter UI | ~40 | Keep in `BlockInserter.tsx` |
| Insertion panel (blocks list) | ~100 | Keep in `BlockInserter.tsx` |
| **After split:** | | |
| `StructurePanel.tsx` | ~350 | NEW |
| `BlockInserter.tsx` | ~150 | REMAINING |

---

## Approval & Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Technical Lead | | | ⬜ Pending |
| Project Manager | | | ⬜ Pending |
| Development Team | | | ⬜ Pending |

---

**Next Steps:**
1. ✅ Review this updated TypeScript plan with full analysis
2. **Start Phase 4.5** - Extract Structure Panel from BlockInserter.jsx
3. Complete Phase 4 (Toolbar extraction)
4. Begin Phase 5 (useBlockEditor hook)
5. Track progress in GitHub issues
