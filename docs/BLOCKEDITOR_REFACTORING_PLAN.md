# BlockEditor Refactoring Plan

**Created:** 2026-03-22  
**Status:** Proposed  
**Priority:** High  
**Estimated Effort:** 2-3 days

---

## Executive Summary

The BlockEditor component (`src/admin/components/BlockEditor/index.jsx`) is a 2,843-line monolithic file that handles schema definition, toolbar UI, structure panel, drag-and-drop logic, and the main editor component. This refactoring plan aims to improve maintainability, testability, and developer experience by breaking it into smaller, focused modules.

---

## Current State Analysis

### File Structure (Before)

```
src/admin/components/BlockEditor/
├── index.jsx                    # ❌ 2,843 lines - TOO LARGE
├── BlockNoteViewWithPortal.jsx  # ✅ Well-structured
├── selection-context.jsx        # ✅ Good separation
├── related-content-context.jsx  # ✅ Good separation
├── blocks/                      # ✅ Well-modularized
│   ├── index.js
│   ├── MainRecipeBlock.jsx
│   ├── RelatedContentBlock.jsx
│   └── ...
├── components/                  # ✅ Good separation
│   ├── BlockWrapper.jsx
│   ├── BlockToolbar.jsx
│   └── ...
├── styles/
└── utils/
```

### Problems Identified

| Issue | Severity | Impact |
|-------|----------|--------|
| **Monolithic file** (2,843 lines) | 🔴 Critical | Hard to navigate, maintain, test |
| **Mixed concerns** (schema + UI + logic) | 🔴 Critical | Tight coupling, difficult refactoring |
| **Duplicated logic** (slash menu + toolbar insert) | 🟡 Medium | Code bloat, inconsistency risk |
| **Deep nesting** (contexts, providers) | 🟡 Medium | Cognitive load |
| **No TypeScript** | 🟢 Low | Missing type safety |
| **Complex state management** | 🟡 Medium | Hard to track data flow |

### What's Working Well

- ✅ Individual block implementations are well-modularized
- ✅ Context-based state sharing pattern is solid
- ✅ `BlockWrapper` and `BlockToolbar` are cleanly abstracted
- ✅ Drag-and-drop integration is well-implemented

---

## Refactoring Goals

### Primary Objectives

1. **Reduce main file size** from 2,843 lines to <300 lines
2. **Separate concerns** - schema, UI, logic, utilities
3. **Improve testability** - extract pure functions and hooks
4. **Maintain backward compatibility** - no breaking changes to API
5. **Preserve existing functionality** - all features must work identically

### Success Metrics

- [ ] Main `index.jsx` < 300 lines
- [ ] Each module < 500 lines
- [ ] All custom blocks still render correctly
- [ ] Drag-and-drop still functional
- [ ] Slash menu and toolbar both work
- [ ] Structure panel (outline) functional
- [ ] `pnpm build` passes with no errors
- [ ] Manual testing in admin panel passes

---

## Proposed Architecture

### File Structure (After)

```
src/admin/components/BlockEditor/
├── index.jsx                    # Main export (~150 lines)
├── BlockNoteViewWithPortal.jsx  # Unchanged
├── BlockEditorMain.jsx          # Main component logic (~400 lines)
├── schema.js                    # BlockNote schema definition (~100 lines)
├── useBlockEditor.js            # Custom hook for editor logic (~300 lines)
├── useSlashMenu.js              # Slash menu configuration (~200 lines)
├── selection-context.jsx        # Unchanged
├── related-content-context.jsx  # Unchanged
│
├── toolbar/
│   ├── EditorToolbar.jsx        # Toolbar UI component (~350 lines)
│   ├── useToolbarActions.js     # Toolbar action hooks (~150 lines)
│   └── FAQLinkPopover.jsx       # Extracted FAQ link UI (~100 lines)
│
├── structure/
│   ├── StructurePanel.jsx       # Outline/structure panel (~400 lines)
│   └── useStructureTree.js      # Tree building logic (~150 lines)
│
├── blocks/                      # Unchanged (already well-structured)
│   └── ...
│
├── components/                  # Unchanged (already well-structured)
│   └── ...
│
└── utils/
    ├── blockHelpers.js          # Block manipulation utilities (~150 lines)
    ├── inlineContent.js         # Inline content parsing (~150 lines)
    └── constants.js             # Shared constants (~50 lines)
```

---

## Module Responsibilities

### Core Modules

#### 1. `schema.js`
**Purpose:** Define BlockNote schema with custom blocks

```javascript
// Responsibilities
- Import custom blocks from ./blocks/
- Create BlockNoteSchema with blockSpecs
- Export schema for use in editor

// Dependencies
- @blocknote/core
- ./blocks/index.js
```

#### 2. `useBlockEditor.js`
**Purpose:** Centralize editor state and logic

```javascript
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

#### 3. `useSlashMenu.js`
**Purpose:** Configure custom slash menu items

```javascript
// Responsibilities
- Define custom slash menu items
- Handle item insertion logic
- Filter items based on content type
- Support keyboard navigation

// Exports
- getCustomSlashMenuItems(editor, options)
- SuggestionMenuController configuration
```

#### 4. `toolbar/EditorToolbar.jsx`
**Purpose:** Render the editor toolbar UI

```javascript
// Responsibilities
- Render toolbar buttons
- Handle button click events
- Manage dropdown menus
- Render FAQ link popover
- Structure panel toggle

// Dependencies
- useToolbarActions.js
- FAQLinkPopover.jsx
- Lucide icons
- shadcn/ui components
```

#### 5. `toolbar/useToolbarActions.js`
**Purpose:** Toolbar action logic

```javascript
// Responsibilities
- insertBlock(type, props)
- handleLinkCreation
- FAQ link apply/remove
- Selection tracking

// Exports
- useToolbarActions(editor, options)
```

#### 6. `structure/StructurePanel.jsx`
**Purpose:** Render document outline/structure

```javascript
// Responsibilities
- Display hierarchical block structure
- Handle block selection from outline
- Show block icons and labels
- Support expand/collapse
- Drag indicators

// Dependencies
- useStructureTree.js
- Lucide icons
- shadcn/ui components
```

#### 7. `structure/useStructureTree.js`
**Purpose:** Build tree structure from blocks

```javascript
// Responsibilities
- Flatten blocks with depth tracking
- Generate block labels
- Map block types to icons
- Handle nested structures

// Exports
- useStructureTree(editor)
- flattenBlocks()
- getBlockLabel()
- getBlockIcon()
```

#### 8. `utils/blockHelpers.js`
**Purpose:** Block manipulation utilities

```javascript
// Responsibilities
- Safe block insertion
- Find root parent
- Move blocks up/down
- Remove blocks safely

// Exports
- safeInsertBlock(editor, type, props)
- findRootParent(editor, block)
- moveBlock(editor, blockId, direction)
```

#### 9. `utils/inlineContent.js`
**Purpose:** Inline content parsing utilities

```javascript
// Responsibilities
- Extract text from inline content
- Truncate inline content
- Serialize inline content
- Parse markdown links

// Exports
- extractText(content)
- truncateInlineContent(content, limit)
- serializeInlineContent(nodes)
- findMarkdownLinkRange(text, start, end)
```

#### 10. `utils/constants.js`
**Purpose:** Shared constants

```javascript
// Responsibilities
- MAX_STRUCTURE_LABEL
- CUSTOM_BLOCK_TYPES set
- Block type mappings
- Icon mappings

// Exports
- MAX_STRUCTURE_LABEL = 48
- CUSTOM_BLOCK_TYPES = Set([...])
- BLOCK_TYPE_ICONS = Map({...})
```

---

## Implementation Phases

### Phase 1: Extract Utilities (Low Risk)
**Goal:** Move pure functions to utility modules

**Tasks:**
1. Create `utils/constants.js`
   - Extract `MAX_STRUCTURE_LABEL`
   - Extract `CUSTOM_BLOCK_TYPES` set
   - Extract `BLOCK_TYPE_ICONS` map

2. Create `utils/inlineContent.js`
   - Extract `extractText()`
   - Extract `truncateInlineContent()`
   - Extract `serializeInlineContent()`
   - Extract `findMarkdownLinkRange()`
   - Extract `getInlineTextLength()`

3. Create `utils/blockHelpers.js`
   - Extract `flattenBlocks()`
   - Extract `getBlockLabel()` (depends on inlineContent utils)
   - Extract `getBlockIcon()` (uses constants)

**Testing:** Run `pnpm build`, verify editor still works

---

### Phase 2: Extract Schema (Low Risk)
**Goal:** Move schema definition to dedicated file

**Tasks:**
1. Create `schema.js`
   ```javascript
   import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
   import {
       Alert, VideoBlock, ImageBlock, FAQSectionBlock,
       DividerBlock, RecipeEmbedBlock, MainRecipeBlock,
       RoundupListBlock, RelatedContentBlock, TableBlock,
       BeforeAfterBlock
   } from './blocks';

   export const schema = BlockNoteSchema.create({
       blockSpecs: {
           ...defaultBlockSpecs,
           alert: Alert(),
           video: VideoBlock(),
           // ... etc
       },
   });
   ```

2. Update `index.jsx` to import schema

**Testing:** Run `pnpm build`, verify custom blocks render

---

### Phase 3: Extract Slash Menu (Medium Risk)
**Goal:** Move slash menu configuration to dedicated hook

**Tasks:**
1. Create `useSlashMenu.js`
   - Extract `getCustomSlashMenuItems()` function
   - Convert to hook pattern if needed
   - Handle `safeInsert` logic internally

2. Update `index.jsx` to use extracted slash menu

**Testing:** Verify slash menu opens and inserts blocks correctly

---

### Phase 4: Extract Toolbar (Medium Risk)
**Goal:** Move toolbar UI to dedicated component

**Tasks:**
1. Create `toolbar/FAQLinkPopover.jsx`
   - Extract FAQ link popover UI
   - Extract `applyFaqLink()` and `removeFaqLink()` logic
   - Manage local state (open, url, hasMatch)

2. Create `toolbar/useToolbarActions.js`
   - Extract `insertBlock()` function
   - Extract selection tracking logic
   - Handle link creation

3. Create `toolbar/EditorToolbar.jsx`
   - Extract entire toolbar JSX
   - Use `useToolbarActions` hook
   - Use `FAQLinkPopover` component
   - Accept props: `editor`, `structureOpen`, `onToggleStructurePanel`

4. Update `index.jsx` to use `EditorToolbar`

**Testing:** Verify all toolbar buttons work, FAQ link popover functions

---

### Phase 5: Extract Structure Panel (Medium Risk)
**Goal:** Move structure/outline panel to dedicated component

**Tasks:**
1. Create `structure/useStructureTree.js`
   - Extract `flattenBlocks()` (if not in utils)
   - Extract `getBlockLabel()` (if not in utils)
   - Extract `getBlockIcon()` (if not in utils)
   - Add tree-building logic

2. Create `structure/StructurePanel.jsx`
   - Extract structure panel JSX
   - Use `useStructureTree` hook
   - Handle block selection
   - Support expand/collapse
   - Accept props: `editor`, `onBlockSelect`

3. Update `index.jsx` to use `StructurePanel`

**Testing:** Verify structure panel shows correct hierarchy, clicking selects blocks

---

### Phase 6: Create Main Editor Hook (High Risk)
**Goal:** Extract editor initialization and state management

**Tasks:**
1. Create `useBlockEditor.js`
   ```javascript
   export function useBlockEditor({
       initialContent,
       onChange,
       contentType,
       recipeData,
       roundupData,
       faqData,
   }) {
       // Initialize BlockNote editor
       const editor = useCreateBlockNote({
           schema,
           initialContent,
           // ... options
       });

       // Manage context values
       const recipeContext = useRecipeDataContext(recipeData);
       const roundupContext = useRoundupDataContext(roundupData);
       const faqContext = useFAQDataContext(faqData);

       // Sync content changes
       useEffect(() => {
           if (!editor) return;
           const unsubscribe = editor.onEditorContentChange(() => {
               onChange(editor.document);
           });
           return unsubscribe;
       }, [editor, onChange]);

       return {
           editor,
           recipeContext,
           roundupContext,
           faqContext,
       };
   }
   ```

2. Update `index.jsx` to use hook

**Testing:** Verify editor initializes, content syncs, contexts work

---

### Phase 7: Create Main Editor Component (High Risk)
**Goal:** Create focused main component

**Tasks:**
1. Create `BlockEditorMain.jsx`
   - Use `useBlockEditor` hook
   - Render `BlockNoteViewWithPortal`
   - Render `EditorToolbar`
   - Render `StructurePanel` (conditionally)
   - Wrap with context providers

2. Update `index.jsx` to be a thin wrapper
   ```javascript
   // New index.jsx (~100 lines)
   import { BlockEditorMain } from './BlockEditorMain';
   import { RelatedContentProvider } from './related-content-context';
   import { BlockSelectionProvider } from './selection-context';

   export default function BlockEditor(props) {
       return (
           <RelatedContentProvider value={props.relatedContext}>
               <BlockSelectionProvider>
                   <BlockEditorMain {...props} />
               </BlockSelectionProvider>
           </RelatedContentProvider>
       );
   }
   ```

**Testing:** Full integration test - editor works end-to-end

---

### Phase 8: Cleanup & Optimization (Low Risk)
**Goal:** Remove dead code, optimize imports

**Tasks:**
1. Remove unused imports from `index.jsx`
2. Remove duplicate functions
3. Add JSDoc comments to public APIs
4. Create `index.js` barrel exports for cleaner imports
5. Update any external imports if paths changed

**Testing:** Full regression testing

---

## Risk Mitigation

### High-Risk Areas

| Risk | Mitigation |
|------|------------|
| **Breaking editor functionality** | Test after each phase, small commits |
| **Context provider ordering** | Document provider hierarchy, test nested blocks |
| **Drag-and-drop breaking** | Verify dnd-kit integration after each phase |
| **State desync** | Add console logging during development |
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

```javascript
// TODO: Add after refactoring
- utils/inlineContent.test.js - Pure function tests
- utils/blockHelpers.test.js - Mock editor tests
- useStructureTree.test.js - Tree building tests
```

### Manual Testing Checklist

**Before starting:**
- [ ] Document current behavior (screenshots)
- [ ] Note all working features

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

---

## Code Quality Guidelines

### Import Organization

```javascript
// 1. React & core libraries
import React, { useCallback, useEffect } from 'react';

// 2. Third-party libraries
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteSchema } from '@blocknote/core';

// 3. Project modules (absolute paths)
import { schema } from './schema';
import { useBlockEditor } from './useBlockEditor';

// 4. Local components
import { EditorToolbar } from './toolbar/EditorToolbar';
import { StructurePanel } from './structure/StructurePanel';

// 5. Styles
import './styles.css';
```

### Component Structure

```javascript
/**
 * ComponentName
 *
 * Brief description of purpose.
 *
 * @param {Type} prop - Description
 * @returns {JSX.Element} Component UI
 */
export function ComponentName({ prop1, prop2 }) {
    // 1. Hooks (useState, useEffect, custom hooks)
    // 2. Derived state (useMemo, useCallback)
    // 3. Event handlers
    // 4. Render
    return <div />;
}
```

### Function Size Limits

- **Max lines per function:** 50
- **Max lines per component:** 300
- **Max lines per file:** 500
- **Max nesting depth:** 3 levels

---

## Migration Checklist

### Pre-Migration

- [ ] Create backup branch
- [ ] Document current file structure
- [ ] Set up testing environment
- [ ] Review all dependencies

### During Migration

- [ ] Complete each phase fully before moving on
- [ ] Test after each phase
- [ ] Commit after each phase
- [ ] Update this document with learnings

### Post-Migration

- [ ] Run `pnpm build`
- [ ] Manual testing in admin panel
- [ ] Update documentation
- [ ] Remove old files
- [ ] Clean up imports
- [ ] Add JSDoc comments
- [ ] Create this-is-fine branch (if needed 😄)

---

## Future Improvements (Out of Scope)

These are **NOT** part of this refactoring but could be addressed later:

1. **TypeScript migration** - Add `.tsx` extensions and types
2. **State management library** - Consider Zustand for editor state
3. **Performance optimization** - Virtualize structure panel for large docs
4. **Unit tests** - Add Jest/Vitest tests for utilities
5. **E2E tests** - Playwright tests for editor interactions
6. **Accessibility audit** - Ensure keyboard navigation works
7. **Mobile optimization** - Touch-friendly toolbar
8. **Undo/redo improvements** - Better history management
9. **Collaborative editing** - Real-time multi-user support
10. **Plugin system** - Allow custom block registration

---

## Appendix: Current File Metrics

### index.jsx Breakdown (Approximate)

| Section | Lines | % of File |
|---------|-------|-----------|
| Imports | ~60 | 2% |
| Schema definition | ~25 | 1% |
| `getCustomSlashMenuItems` | ~100 | 4% |
| `truncateLabel` | ~10 | <1% |
| `getInlineTextLength` | ~15 | 1% |
| `truncateInlineContent` | ~50 | 2% |
| `flattenBlocks` | ~10 | <1% |
| `getBlockLabel` | ~35 | 1% |
| `getBlockIcon` | ~40 | 1% |
| `CUSTOM_BLOCK_TYPES` | ~15 | 1% |
| `EditorToolbar` component | ~400 | 14% |
| `StructurePanel` component | ~450 | 16% |
| `BlockEditor` main component | ~1,600 | 56% |
| Exports | ~10 | <1% |

### Target File Metrics

| File | Target Lines | Reduction |
|------|--------------|-----------|
| `index.jsx` | <150 | -95% |
| `BlockEditorMain.jsx` | <400 | New |
| `schema.js` | <100 | New |
| `useBlockEditor.js` | <300 | New |
| `useSlashMenu.js` | <200 | New |
| `toolbar/EditorToolbar.jsx` | <350 | New |
| `toolbar/useToolbarActions.js` | <150 | New |
| `toolbar/FAQLinkPopover.jsx` | <100 | New |
| `structure/StructurePanel.jsx` | <400 | New |
| `structure/useStructureTree.js` | <150 | New |
| `utils/blockHelpers.js` | <150 | New |
| `utils/inlineContent.js` | <150 | New |
| `utils/constants.js` | <50 | New |
| **Total** | **~2,650** | **Same functionality, better organization** |

---

## Approval & Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Technical Lead | | | ⬜ Pending |
| Project Manager | | | ⬜ Pending |
| Development Team | | | ⬜ Pending |

---

**Next Steps:**
1. Review this plan with the team
2. Create backup branch
3. Begin Phase 1 (Extract Utilities)
4. Track progress in GitHub issues
